import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { BibleVerse } from '../types';
import { playTTS } from '../services/geminiService';
import { getBibleVerseById } from '../services/cacheService';
import { recordActivity } from '../services/statsService';

export const BibleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [verse, setVerse] = useState<BibleVerse | null>(location.state?.verse || null);
  const [activeTab, setActiveTab] = useState<'content' | 'vocab' | 'grammar'>('content');
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [showJapanese, setShowJapanese] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isShadowing, setIsShadowing] = useState(false);
  const shadowingRef = useRef(false);

  useEffect(() => {
    if (!verse && typeof id === 'string') {
      const cached = getBibleVerseById(id);
      if (cached) setVerse(cached);
    }
    const collections = JSON.parse(localStorage.getItem('user_collection') || '[]');
    setStarred(new Set<string>(collections.map((item: any) => String(item.id))));
    recordActivity(10);

    return () => {
      shadowingRef.current = false;
      window.speechSynthesis.cancel();
    };
  }, [id, verse]);

  if (!verse) return <div className="p-10 text-center text-slate-400 font-black">正在加载经文内容...</div>;

  const handleTTS = async (text: string, id: string) => {
    setPlayingId(id);
    await playTTS(text);
    setPlayingId(null);
  };

  const startShadowing = async () => {
    if (isShadowing) {
      setIsShadowing(false);
      shadowingRef.current = false;
      window.speechSynthesis.cancel();
      setPlayingId(null);
      return;
    }

    setIsShadowing(true);
    shadowingRef.current = true;

    for (let i = 0; i < verse.sentences.length; i++) {
      if (!shadowingRef.current) break;
      const sentence = verse.sentences[i];
      setPlayingId(`s-${i}`);
      await playTTS(sentence, 0.75);
      
      if (shadowingRef.current) {
        setPlayingId(`shadowing-${i}`);
        const cleanLen = sentence.replace(/<[^>]*>?/gm, '').length;
        const pauseTime = Math.max(3000, cleanLen * 300); 
        await new Promise(resolve => setTimeout(resolve, pauseTime));
      }
    }
    
    setIsShadowing(false);
    shadowingRef.current = false;
    setPlayingId(null);
  };

  const toggleStar = (itemId: string, type: string, content: any) => {
    setStarred(prev => {
      const next = new Set(prev);
      const collections = JSON.parse(localStorage.getItem('user_collection') || '[]');
      if (next.has(itemId)) {
        next.delete(itemId);
        localStorage.setItem('user_collection', JSON.stringify(collections.filter((i: any) => i.id !== itemId)));
      } else {
        next.add(itemId);
        localStorage.setItem('user_collection', JSON.stringify([...collections, { id: itemId, type, content, addedAt: Date.now(), nextReviewAt: Date.now() + 86400000, reviewStage: 1 }]));
        recordActivity(5);
      }
      return next;
    });
  };

  const processContent = (text: string) => text.replace(/^(reading|meaning|point|explanation|example|word):\s*/i, "").trim();

  return (
    <div className="pb-24 animate-fadeIn">
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-slate-50/90 backdrop-blur-md z-30 py-3 px-1">
        <button onClick={() => navigate(-1)} className="text-slate-400 text-sm font-bold flex items-center gap-2">
          <i className="fa-solid fa-chevron-left"></i> 返回
        </button>
        <div className="flex gap-2">
          <button 
             onClick={startShadowing}
             className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all flex items-center gap-2 ${isShadowing ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-purple-100 text-purple-600'}`}
           >
             <i className={`fa-solid ${isShadowing ? 'fa-stop' : 'fa-microphone-lines'}`}></i>
             {isShadowing ? '停止跟读' : '影子模式'}
           </button>
           <button 
             onClick={() => setShowJapanese(!showJapanese)} 
             className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all ${showJapanese ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}
           >
             {showJapanese ? '隐藏文字' : '显示文字'}
           </button>
        </div>
      </div>

      <header className="mb-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center relative overflow-hidden">
        <div className="absolute -left-4 -top-4 opacity-[0.03] rotate-12"><i className="fa-solid fa-dove text-9xl"></i></div>
        <span className="text-[10px] font-black px-3 py-1 rounded-xl mb-4 inline-block bg-purple-50 text-purple-700 border border-purple-100" dangerouslySetInnerHTML={{ __html: verse.reference }}></span>
        <p className={`text-xl font-bold leading-relaxed mb-6 Japanese-text text-slate-800 ${!showJapanese ? 'hidden-content' : ''}`} dangerouslySetInnerHTML={{ __html: processContent(verse.japaneseText) }}></p>
        {showTranslation && <p className="text-sm text-slate-400 font-medium italic border-t border-slate-50 pt-6">"{verse.chineseTranslation}"</p>}
      </header>

      <nav className="flex gap-2 p-1.5 bg-slate-100 rounded-3xl mb-8 overflow-x-auto no-scrollbar">
        {(['content', 'vocab', 'grammar'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 px-4 py-3 text-xs font-black rounded-2xl transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-400'}`}>
            {tab === 'content' ? '拆解' : tab === 'vocab' ? '核心词' : '语法解析'}
          </button>
        ))}
      </nav>

      <div className="space-y-5">
        {activeTab === 'content' && (
          <div className="space-y-5">
            {verse.sentences.map((sentence, idx) => {
              const sId = `s-${idx}`;
              return (
                <div 
                  key={idx} 
                  className={`bg-white p-6 rounded-[2rem] border transition-all ${
                    playingId === `s-${idx}` ? 'border-purple-500 shadow-lg' : 
                    playingId === `shadowing-${idx}` ? 'border-rose-400 bg-rose-50 shadow-md' : 
                    'border-slate-100 shadow-sm'
                  }`}
                >
                  <p className={`text-lg Japanese-text text-slate-800 leading-relaxed ${!showJapanese ? 'hidden-content' : ''}`} dangerouslySetInnerHTML={{ __html: processContent(sentence) }}></p>
                  {showTranslation && <p className="text-slate-400 text-sm font-medium border-l-4 border-slate-50 pl-4 mt-4">翻译：{verse.translations?.[idx]}</p>}
                  
                  {playingId === `shadowing-${idx}` && (
                    <div className="mt-2 text-rose-500 text-[10px] font-black uppercase animate-pulse">
                      <i className="fa-solid fa-microphone mr-1"></i> 请开口跟读...
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-50">
                    <button onClick={() => handleTTS(sentence, sId)} className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-all ${playingId === sId ? 'bg-purple-600 text-white shadow-lg' : 'bg-purple-50 text-purple-600'}`}>
                      <i className={`fa-solid ${playingId === sId ? 'fa-circle-notch fa-spin' : 'fa-volume-high'}`}></i>
                    </button>
                    <button onClick={() => toggleStar(`v-${verse.id}-${idx}`, 'sentence', sentence)} className={`${starred.has(`v-${verse.id}-${idx}`) ? 'text-amber-500' : 'text-slate-300'}`}>
                      <i className="fa-solid fa-star text-lg"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
