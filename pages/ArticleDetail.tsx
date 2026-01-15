
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Article } from '../types';
import { playTTS } from '../services/geminiService';
import { getArticleById } from '../services/cacheService';
import { getLevelColor } from './Learning';
import { recordActivity } from '../services/statsService';

export const ArticleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [article, setArticle] = useState<Article | null>(location.state?.article || null);
  const [activeTab, setActiveTab] = useState<'content' | 'vocab' | 'grammar'>('content');
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [showFurigana, setShowFurigana] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  
  // TTS 播放状态
  const [playingId, setPlayingId] = useState<string | null>(null);
  
  // 影子跟读录音状态
  const [recordings, setRecordings] = useState<Record<string, string>>({});
  const [isRecording, setIsRecording] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!article && id) {
      const cached = getArticleById(id);
      if (cached) setArticle(cached);
    }
    const collections = JSON.parse(localStorage.getItem('user_collection') || '[]');
    setStarred(new Set(collections.map((item: any) => String(item.id))));
    
    // 记录阅读活跃点
    recordActivity(5);

    return () => {
      Object.values(recordings).forEach(url => URL.revokeObjectURL(url));
    };
  }, [id, article]);

  if (!article) return <div className="p-10 text-center animate-pulse">正在载入离线语料...</div>;

  const handleTTS = async (text: string, id: string) => {
    setPlayingId(id);
    await playTTS(text);
    setPlayingId(null);
  };

  const startRecording = async (key: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const url = URL.createObjectURL(new Blob(audioChunksRef.current, { type: 'audio/wav' }));
        setRecordings(p => ({ ...p, [key]: url }));
        stream.getTracks().forEach(t => t.stop());
        recordActivity(2); // 跟读一次加 2 分
      };
      recorder.start();
      setIsRecording(key);
    } catch (e) { alert("麦克风启动失败，请检查权限。"); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(null);
    }
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
        recordActivity(3);
      }
      return next;
    });
  };

  const cleanText = (text: string) => text.replace(/<[^>]*>?/gm, '');
  const processContent = (text: string) => text.replace(/^(content|title|word|meaning|point|explanation|example):\s*/i, "").trim();

  return (
    <div className={`pb-24 animate-fadeIn ${showFurigana ? '' : 'hide-furigana'}`}>
      <div className="flex justify-between items-center mb-6 gap-2 sticky top-0 bg-slate-50/90 backdrop-blur-md z-20 py-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 text-sm font-bold"><i className="fa-solid fa-chevron-left mr-1"></i>返回</button>
        <div className="flex gap-2">
          <button onClick={() => setShowFurigana(!showFurigana)} className={`px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest ${showFurigana ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}>
             假名
          </button>
          <button onClick={() => setShowTranslation(!showTranslation)} className={`px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest ${showTranslation ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}>
             中文
          </button>
        </div>
      </div>

      <header className="mb-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-start mb-4">
          <span className={`text-[10px] font-black px-3 py-1 rounded-xl shadow-sm ${getLevelColor(article.level)}`}>{article.level}</span>
          <span className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em]">INTENSIVE</span>
        </div>
        <h2 className="text-2xl font-bold leading-relaxed Japanese-text text-slate-800" dangerouslySetInnerHTML={{ __html: processContent(article.title) }}></h2>
      </header>

      <nav className="flex gap-2 mb-8 p-1.5 bg-slate-100 rounded-3xl overflow-x-auto no-scrollbar">
        {(['content', 'vocab', 'grammar'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 px-4 py-3 text-xs font-black rounded-2xl transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
            {tab === 'content' ? `正文拆解` : tab === 'vocab' ? `重点词汇` : `语法分析`}
          </button>
        ))}
      </nav>

      <div className="space-y-6">
        {activeTab === 'content' && (
          <div className="space-y-5">
            {article.sentences?.map((sentence, idx) => {
              const sId = `s-${idx}`;
              return (
                <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 group transition-all hover:shadow-md">
                  <p className="text-lg Japanese-text text-slate-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: processContent(sentence) }}></p>
                  {showTranslation && article.translations?.[idx] && <p className="text-slate-400 text-sm font-medium border-l-4 border-slate-50 pl-4">{article.translations[idx]}</p>}
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex gap-3">
                      {/* TTS 播放按钮 */}
                      <button 
                        onClick={() => handleTTS(cleanText(sentence), sId)} 
                        className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-all ${playingId === sId ? 'bg-indigo-600 text-white animate-pulse' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                      >
                        <i className={`fa-solid ${playingId === sId ? 'fa-circle-notch fa-spin' : 'fa-volume-high'}`}></i>
                      </button>
                      
                      {/* 影子跟读按钮 */}
                      <button 
                        onMouseDown={() => startRecording(sId)} 
                        onMouseUp={stopRecording}
                        onTouchStart={() => startRecording(sId)}
                        onTouchEnd={stopRecording}
                        className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-all ${isRecording === sId ? 'bg-rose-600 text-white scale-110 shadow-lg' : 'bg-rose-50 text-rose-600'}`}
                      >
                        <i className={`fa-solid ${isRecording === sId ? 'fa-microphone-lines animate-pulse' : 'fa-microphone'}`}></i>
                      </button>
                      
                      {/* 跟读回放按钮 */}
                      {recordings[sId] && (
                        <button 
                          onClick={() => new Audio(recordings[sId]).play()}
                          className="w-11 h-11 flex items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100"
                        >
                          <i className="fa-solid fa-play"></i>
                        </button>
                      )}
                    </div>
                    
                    <button onClick={() => toggleStar(`s-${article.id}-${idx}`, 'sentence', sentence)} className={`${starred.has(`s-${article.id}-${idx}`) ? 'text-amber-500' : 'text-slate-300'} transition-colors`}>
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
            {article.vocabulary?.map((vocab, vIdx) => (
              <div key={vIdx} className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="font-bold text-xl text-slate-800 Japanese-text" dangerouslySetInnerHTML={{ __html: processContent(vocab.word) }}></div>
                  <button onClick={() => handleTTS(cleanText(vocab.word), `v-${vIdx}`)} className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 hover:text-indigo-600"><i className="fa-solid fa-volume-high"></i></button>
                </div>
                {showTranslation && <div className="text-sm text-slate-500 font-bold bg-slate-50/50 p-4 rounded-2xl mt-4 leading-relaxed">{processContent(vocab.meaning)}</div>}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'grammar' && (
          <div className="space-y-6">
            {article.grammar?.map((g, gIdx) => (
              <div key={gIdx} className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3"><i className="fa-solid fa-quote-right text-indigo-50 text-4xl"></i></div>
                <h4 className="font-black text-indigo-700 text-xl mb-4 relative z-10">{processContent(g.point)}</h4>
                {showTranslation && (
                  <div className="space-y-5 relative z-10">
                    <p className="text-sm font-bold text-slate-600 leading-relaxed">{processContent(g.explanation)}</p>
                    <div className="bg-indigo-50/30 p-6 rounded-2xl border border-indigo-50">
                      <p className="text-base Japanese-text text-slate-800 leading-relaxed font-medium mb-3" dangerouslySetInnerHTML={{ __html: processContent(g.example) }}></p>
                      <button onClick={() => handleTTS(cleanText(g.example), `g-${gIdx}`)} className="text-indigo-500 text-xs font-black flex items-center gap-2">
                        <i className="fa-solid fa-volume-high"></i> 点击朗读例句
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
