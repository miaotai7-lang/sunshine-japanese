
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Article } from '../types';
import { playTTS } from '../services/geminiService';
import { getArticleById } from '../services/cacheService';
import { getLevelColor } from './Learning';

export const ArticleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [article, setArticle] = useState<Article | null>(location.state?.article || null);
  const [activeTab, setActiveTab] = useState<'content' | 'vocab' | 'grammar'>('content');
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [showFurigana, setShowFurigana] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);

  const [recordings, setRecordings] = useState<Record<string, string>>({});
  const [isRecording, setIsRecording] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const cached = id ? getArticleById(id) : undefined;
    if (cached) setArticle(cached);
    
    const collections = JSON.parse(localStorage.getItem('user_collection') || '[]');
    setStarred(new Set(collections.map((item: any) => String(item.id))));

    return () => {
      Object.values(recordings).forEach(url => URL.revokeObjectURL(url));
    };
  }, [id]);

  if (!article) return <div className="p-10 text-center animate-pulse">正在加载深度语料...</div>;

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
      };
      recorder.start();
      setIsRecording(key);
    } catch (e) { alert("麦克风不可用"); }
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
      }
      return next;
    });
  };

  const cleanText = (text: string) => text.replace(/<[^>]*>?/gm, '');

  return (
    <div className={`pb-24 animate-fadeIn ${showFurigana ? '' : 'hide-furigana'}`}>
      <div className="flex justify-between items-center mb-4 gap-2 sticky top-0 bg-slate-50/90 backdrop-blur-sm z-20 py-2">
        <button onClick={() => navigate(-1)} className="text-slate-400 text-sm font-bold"><i className="fa-solid fa-chevron-left mr-1"></i>返回</button>
        <div className="flex gap-2">
          <button onClick={() => setShowFurigana(!showFurigana)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold ${showFurigana ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-600'}`}>
            <i className={`fa-solid ${showFurigana ? 'fa-eye' : 'fa-eye-slash'} mr-1`}></i>假名
          </button>
          <button onClick={() => setShowTranslation(!showTranslation)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold ${showTranslation ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-600'}`}>
            <i className="fa-solid fa-language mr-1"></i>中文
          </button>
        </div>
      </div>

      <header className="mb-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex justify-between items-start mb-2">
           <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${getLevelColor(article.level)}`}>{article.level}</span>
           <span className="text-[10px] text-slate-300 font-bold uppercase">{article.category}</span>
        </div>
        <h2 className="text-2xl font-bold leading-tight mb-2 Japanese-text text-slate-800" dangerouslySetInnerHTML={{ __html: article.title }}></h2>
        {showTranslation && <p className="text-slate-500 text-sm mt-3 border-t pt-3 italic leading-relaxed">{article.summary}</p>}
      </header>

      <nav className="flex gap-2 border-b border-slate-200 mb-6 py-2 overflow-x-auto no-scrollbar">
        {(['content', 'vocab', 'grammar'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}>
            {tab === 'content' ? `正文全文 (${article.sentences.length}句)` : tab === 'vocab' ? `重点词汇 (${article.vocabulary.length})` : `语法要点 (${article.grammar.length})`}
          </button>
        ))}
      </nav>

      <div className="space-y-4">
        {activeTab === 'content' && (
          <div className="space-y-4">
            {article.sentences.map((sentence, idx) => {
              const key = `${article.id}-s-${idx}`;
              return (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-50 group-hover:bg-indigo-400 transition-colors"></div>
                  <div className="flex justify-between items-center text-[10px] text-slate-300 font-black">
                    <span>SENTENCE {idx + 1}</span>
                  </div>
                  <p className="text-lg leading-relaxed Japanese-text text-slate-800" dangerouslySetInnerHTML={{ __html: sentence }}></p>
                  {showTranslation && article.translations?.[idx] && <p className="text-slate-400 text-sm border-l-4 border-slate-100 pl-3 leading-relaxed">{article.translations[idx]}</p>}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <div className="flex gap-2">
                      <button onClick={() => playTTS(cleanText(sentence))} className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"><i className="fa-solid fa-volume-high"></i></button>
                      <button onClick={() => isRecording === key ? stopRecording() : startRecording(key)} className={`w-10 h-10 flex items-center justify-center rounded-xl ${isRecording === key ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors'}`}><i className={`fa-solid ${isRecording === key ? 'fa-stop' : 'fa-microphone'}`}></i></button>
                      {recordings[key] && <button onClick={() => new Audio(recordings[key]).play()} className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"><i className="fa-solid fa-play ml-0.5"></i></button>}
                    </div>
                    <button onClick={() => toggleStar(key, 'sentence', sentence)} className={`${starred.has(key) ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'} text-xs font-bold flex items-center gap-1 transition-colors`}><i className="fa-solid fa-star"></i>收藏</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'vocab' && (
          <div className="grid grid-cols-1 gap-3">
            {article.vocabulary.map((vocab, vIdx) => (
              <div key={vIdx} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center group hover:border-indigo-200 transition-all shadow-sm">
                <div>
                  <div className="font-bold text-lg text-slate-800 Japanese-text" dangerouslySetInnerHTML={{ __html: vocab.word }}></div>
                  {showTranslation && <div className="text-sm text-slate-500 mt-1">{vocab.meaning}</div>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => playTTS(cleanText(vocab.word))} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-indigo-600 transition-colors"><i className="fa-solid fa-volume-high text-xs"></i></button>
                  <button onClick={() => toggleStar(vocab.word, 'word', vocab)} className={`${starred.has(vocab.word) ? 'text-amber-500' : 'text-slate-300'} transition-colors`}><i className="fa-solid fa-star"></i></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'grammar' && (
          <div className="space-y-4">
            {article.grammar.map((g, gIdx) => (
              <div key={gIdx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative group">
                <div className="absolute top-0 right-0 p-4">
                   <button onClick={() => toggleStar(g.point, 'grammar', g)} className={`${starred.has(g.point) ? 'text-amber-500' : 'text-slate-300'} transition-colors`}><i className="fa-solid fa-star"></i></button>
                </div>
                <h4 className="font-bold text-indigo-600 text-lg mb-2 pr-8">{g.point}</h4>
                {showTranslation && (
                  <>
                    <p className="text-sm font-medium mb-3 text-slate-700 leading-relaxed">{g.explanation}</p>
                    <div className="bg-slate-50 p-4 rounded-xl border-l-4 border-indigo-400 group-hover:bg-indigo-50/30 transition-colors">
                      <p className="text-sm italic Japanese-text text-slate-600" dangerouslySetInnerHTML={{ __html: g.example }}></p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
