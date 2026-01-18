
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
  const [showFurigana, setShowFurigana] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (!verse && typeof id === 'string') {
      const cached = getBibleVerseById(id);
      if (cached) setVerse(cached);
    }
    const collections = JSON.parse(localStorage.getItem('user_collection') || '[]');
    setStarred(new Set<string>(collections.map((item: any) => String(item.id))));
    recordActivity(10);
  }, [id, verse]);

  if (!verse) return <div className="p-10 text-center text-slate-400">正在载入圣言...</div>;

  const handleTTS = async (text: string, id: string) => {
    setPlayingId(id);
    await playTTS(text);
    setTimeout(() => setPlayingId(null), 500);
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

  const cleanText = (text: string) => text.replace(/<[^>]*>?/gm, '');
  const processContent = (text: string) => text.replace(/^(reading|meaning|point|explanation|example|word):\s*/i, "").trim();

  return (
    <div className={`pb-24 animate-fadeIn ${showFurigana ? '' : 'hide-furigana'}`}>
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-slate-50/90 backdrop-blur-md z-20 py-3 px-1">
        <button onClick={() => navigate(-1)} className="text-slate-400 text-sm font-bold"><i className="fa-solid fa-chevron-left mr-1"></i>返回</button>
        <div className="flex gap-2">
          <button onClick={() => setShowFurigana(!showFurigana)} className={`px-4 py-2 rounded-2xl text-[10px] font-black ${showFurigana ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-200 text-slate-600'}`}>
            假名
          </button>
          <button onClick={() => setShowTranslation(!showTranslation)} className={`px-4 py-2 rounded-2xl text-[10px] font-black ${showTranslation ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-200 text-slate-600'}`}>
            中文
          </button>
        </div>
      </div>

      <header className="mb-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center relative overflow-hidden">
        <div className="absolute -left-4 -top-4 opacity-[0.03] rotate-12"><i className="fa-solid fa-dove text-9xl"></i></div>
        <span className="text-[10px] font-black px-3 py-1 rounded-xl mb-4 inline-block bg-purple-50 text-purple-700 border border-purple-100" dangerouslySetInnerHTML={{ __html: verse.reference }}></span>
        <p className="text-xl font-bold leading-relaxed mb-6 Japanese-text text-slate-800" dangerouslySetInnerHTML={{ __html: processContent(verse.japaneseText) }}></p>
        {showTranslation && <p className="text-sm text-slate-400 font-medium italic border-t border-slate-50 pt-6">"{verse.chineseTranslation}"</p>}
      </header>

      <nav className="flex gap-2 p-1.5 bg-slate-100 rounded-3xl mb-8 overflow-x-auto no-scrollbar">
        {(['content', 'vocab', 'grammar'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 px-4 py-3 text-xs font-black rounded-2xl transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-400'}`}>
            {tab === 'content' ? '经文拆解' : tab === 'vocab' ? '词汇' : '语法'}
          </button>
        ))}
      </nav>

      <div className="space-y-5">
        {activeTab === 'content' && (
          <div className="space-y-5">
            {verse.sentences.map((sentence, idx) => {
              const sId = `b-s-${idx}`;
              return (
                <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 group">
                  <p className="text-lg Japanese-text text-slate-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: processContent(sentence) }}></p>
                  {showTranslation && <p className="text-slate-400 text-sm font-medium border-l-4 border-slate-50 pl-4">{verse.translations?.[idx]}</p>}
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex gap-3">
                      <button onClick={() => handleTTS(cleanText(sentence), sId)} className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-all ${playingId === sId ? 'bg-purple-600 text-white shadow-lg' : 'bg-purple-50 text-purple-600'}`}>
                        <i className={`fa-solid ${playingId === sId ? 'fa-volume-high animate-pulse' : 'fa-volume-high'}`}></i>
                      </button>
                    </div>
                    <button onClick={() => toggleStar(`v-${verse.id}-${idx}`, 'sentence', sentence)} className={`${starred.has(`v-${verse.id}-${idx}`) ? 'text-amber-500' : 'text-slate-300'}`}>
                      <i className="fa-solid fa-star text-lg"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'vocab' && (
          <div className="grid gap-4">
            {verse.vocabulary?.map((vocab, vIdx) => (
              <div key={vIdx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-bold text-xl text-slate-800 Japanese-text flex items-center gap-2">
                    <span dangerouslySetInnerHTML={{ __html: processContent(vocab.word) }}></span>
                    <span className="text-[10px] text-purple-400 font-black">[{vocab.reading}]</span>
                  </div>
                  {showTranslation && <div className="text-xs text-slate-500 font-bold mt-2">{processContent(vocab.meaning)}</div>}
                </div>
                <button onClick={() => handleTTS(vocab.reading || vocab.word, `v-${vIdx}`)} className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${playingId === `v-${vIdx}` ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
                  <i className={`fa-solid ${playingId === `v-${vIdx}` ? 'fa-volume-high animate-pulse' : 'fa-volume-high'}`}></i>
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'grammar' && (
          <div className="space-y-6">
            {verse.grammar?.map((g, gIdx) => (
              <div key={gIdx} className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h4 className="font-black text-purple-700 text-xl mb-4">{processContent(g.point)}</h4>
                {showTranslation && (
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-slate-600 leading-relaxed">{processContent(g.explanation)}</p>
                    <div className="bg-purple-50/30 p-6 rounded-2xl border border-purple-50">
                      <p className="text-base Japanese-text text-slate-800 leading-relaxed font-medium mb-3" dangerouslySetInnerHTML={{ __html: processContent(g.example) }}></p>
                      <button onClick={() => handleTTS(cleanText(g.example), `g-${gIdx}`)} className={`text-xs font-black flex items-center gap-2 transition-all ${playingId === `g-${gIdx}` ? 'text-purple-600 scale-105' : 'text-purple-500'}`}>
                        <i className={`fa-solid ${playingId === `g-${gIdx}` ? 'fa-volume-high animate-pulse' : 'fa-volume-high'}`}></i> 朗读例句
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
