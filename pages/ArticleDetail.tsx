import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Article } from '../types';
import { playTTS } from '../services/geminiService';
import { getArticleById } from '../services/cacheService';

export const ArticleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(location.state?.article || null);
  const [activeTab, setActiveTab] = useState<'content' | 'vocab' | 'grammar'>('content');
  const [showReadings, setShowReadings] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (!article && id) {
      const cached = getArticleById(id);
      if (cached) setArticle(cached);
    }
  }, [id, article]);

  if (!article) return <div className="p-10 text-center font-black">加载中...</div>;

  const handleTTS = async (text: string, sid: string) => {
    setPlayingId(sid);
    await playTTS(text);
    setPlayingId(null);
  };

  // 辅助函数：渲染带假名的文字块
  const renderRichText = (text: string, reading?: string) => {
    if (!reading) return <span>{text}</span>;
    return (
      <span className="inline-flex flex-col items-center mx-0.5 align-bottom">
        <span className="furigana">{reading}</span>
        <span>{text}</span>
      </span>
    );
  };

  return (
    <div className={`pb-24 animate-fadeIn px-2 ${!showReadings ? 'hide-readings' : ''}`}>
      <div className="flex justify-between items-center py-4 sticky top-0 bg-slate-50/90 backdrop-blur-md z-30">
        <button onClick={() => navigate(-1)} className="text-slate-400 font-black"><i className="fa-solid fa-chevron-left"></i></button>
        <div className="flex gap-2">
          <button onClick={() => setShowReadings(!showReadings)} className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${showReadings ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-200 text-slate-400'}`}>
            {showReadings ? '隐藏假名' : '显示假名'}
          </button>
          <button onClick={() => setShowTranslation(!showTranslation)} className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${showTranslation ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-slate-200 text-slate-400'}`}>
            {showTranslation ? '隐藏翻译' : '显示翻译'}
          </button>
        </div>
      </div>

      <header className="mb-6">
        <h2 className="text-2xl font-black text-slate-800 mb-2">{article.title}</h2>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 text-sm text-slate-500 italic">
          {article.summary}
        </div>
      </header>

      <nav className="flex gap-2 p-1.5 bg-slate-200/50 rounded-3xl mb-6">
        {(['content', 'vocab', 'grammar'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-3 text-xs font-black rounded-2xl transition-all ${activeTab === t ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500'}`}>
            {t === 'content' ? '阅读' : t === 'vocab' ? '词汇' : '语法'}
          </button>
        ))}
      </nav>

      <div className="space-y-4">
        {activeTab === 'content' && article.sentences.map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex gap-4">
            <div className="flex-1">
              <p className="Japanese-text text-slate-800">{s}</p>
              {showTranslation && <p className="text-slate-400 text-sm mt-4 border-t pt-4 font-medium">{article.translations[i]}</p>}
            </div>
            <button onClick={() => handleTTS(s, `s-${i}`)} className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${playingId === `s-${i}` ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-50 text-indigo-400'}`}>
              <i className={`fa-solid ${playingId === `s-${i}` ? 'fa-circle-notch fa-spin' : 'fa-volume-high'}`}></i>
            </button>
          </div>
        ))}

        {activeTab === 'vocab' && article.vocabulary.map((v, i) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl font-black text-slate-800">{v.word}</span>
                <span className="text-[10px] font-black text-indigo-500 uppercase furigana">[{v.reading}]</span>
              </div>
              {showTranslation && <p className="text-sm text-slate-500 font-medium">{v.meaning}</p>}
            </div>
            <button onClick={() => handleTTS(v.word, `v-${i}`)} className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl"><i className="fa-solid fa-volume-high"></i></button>
          </div>
        ))}

        {activeTab === 'grammar' && article.grammar.map((g, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
             <div className="flex justify-between mb-2">
                <span className="font-black text-indigo-600">{g.point}</span>
             </div>
             <p className="text-sm text-slate-600 mb-4">{g.explanation}</p>
             <div className="bg-slate-50 p-4 rounded-2xl italic text-xs text-slate-500">例: {g.example}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
