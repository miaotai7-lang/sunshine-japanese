import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Article, TextSegment } from '../types';
import { playTTS, segmentsToText } from '../services/geminiService';
import { getArticleById } from '../services/cacheService';
import { toggleCollection, isCollected } from '../services/collectionService';

export const ArticleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(location.state?.article || null);
  const [activeTab, setActiveTab] = useState<'content' | 'vocab' | 'grammar'>('content');
  const [showReadings, setShowReadings] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [, setUpdateTick] = useState(0); // 用于强制刷新收藏状态

  useEffect(() => {
    if (!article && id) {
      const cached = getArticleById(id);
      if (cached) setArticle(cached);
    }
  }, [id, article]);

  if (!article) return <div className="p-10 text-center font-black">加载中...</div>;

  const handleTTS = async (segments: TextSegment[], sid: string) => {
    setPlayingId(sid);
    await playTTS(segmentsToText(segments));
    setPlayingId(null);
  };

  const handleToggleCollect = (type: any, content: any) => {
    toggleCollection(type, content);
    setUpdateTick(prev => prev + 1);
  };

  const renderSegments = (segments: TextSegment[]) => {
    return (segments || []).map((seg, idx) => (
      <ruby key={idx}>
        {seg.t}
        {seg.r && <rt>{seg.r}</rt>}
      </ruby>
    ));
  };

  return (
    <div className={`pb-24 animate-fadeIn px-2 ${!showReadings ? 'hide-readings' : ''}`}>
      <div className="flex justify-between items-center py-4 sticky top-0 bg-slate-50/90 backdrop-blur-md z-30">
        <button onClick={() => navigate(-1)} className="text-slate-400 font-black"><i className="fa-solid fa-chevron-left"></i></button>
        <div className="flex gap-2">
          <button onClick={() => setShowReadings(!showReadings)} className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${showReadings ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>
            {showReadings ? '隐藏假名' : '显示假名'}
          </button>
          <button onClick={() => setShowTranslation(!showTranslation)} className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${showTranslation ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>
            {showTranslation ? '隐藏翻译' : '显示翻译'}
          </button>
        </div>
      </div>

      <header className="mb-6">
        <h2 className="text-2xl font-black text-slate-800 mb-2">
          {article.titleSegments ? renderSegments(article.titleSegments) : article.title}
        </h2>
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
        {activeTab === 'content' && article.sentences.map((segments, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4">
            <div className="flex-1">
              <p className="Japanese-text text-slate-800">{renderSegments(segments)}</p>
              {showTranslation && <p className="text-slate-400 text-sm mt-4 border-t pt-4 font-medium">{article.translations[i]}</p>}
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button 
                onClick={() => handleToggleCollect('sentence', { segments, translation: article.translations[i] })} 
                className={`collect-btn w-10 h-10 rounded-xl flex items-center justify-center ${isCollected({ segments, translation: article.translations[i] }) ? 'bg-rose-50 text-rose-500 active' : 'bg-slate-50 text-slate-300'}`}
              >
                <i className={`fa-${isCollected({ segments, translation: article.translations[i] }) ? 'solid' : 'regular'} fa-heart`}></i>
              </button>
              <button onClick={() => handleTTS(segments, `s-${i}`)} className={`w-10 h-10 rounded-xl flex items-center justify-center ${playingId === `s-${i}` ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-400'}`}>
                <i className={`fa-solid ${playingId === `s-${i}` ? 'fa-circle-notch fa-spin' : 'fa-volume-high'}`}></i>
              </button>
            </div>
          </div>
        ))}

        {activeTab === 'vocab' && article.vocabulary.map((v, i) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl font-black text-slate-800">{v.word}</span>
                <span className="text-[10px] font-black text-indigo-500 uppercase furigana">[{v.reading}]</span>
              </div>
              {showTranslation && <p className="text-sm text-slate-500 font-medium">{v.meaning}</p>}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleToggleCollect('word', v)} 
                className={`collect-btn w-9 h-9 rounded-xl flex items-center justify-center ${isCollected(v) ? 'bg-rose-50 text-rose-500 active' : 'bg-slate-50 text-slate-300'}`}
              >
                <i className={`fa-${isCollected(v) ? 'solid' : 'regular'} fa-heart text-xs`}></i>
              </button>
              <button onClick={() => playTTS(v.word)} className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><i className="fa-solid fa-volume-high text-xs"></i></button>
            </div>
          </div>
        ))}

        {activeTab === 'grammar' && article.grammar.map((g, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
             <div className="flex justify-between mb-2">
                <span className="font-black text-indigo-600">{g.point}</span>
                <button 
                  onClick={() => handleToggleCollect('grammar', g)} 
                  className={`collect-btn w-8 h-8 rounded-lg flex items-center justify-center ${isCollected(g) ? 'bg-rose-50 text-rose-500 active' : 'bg-slate-50 text-slate-300'}`}
                >
                  <i className={`fa-${isCollected(g) ? 'solid' : 'regular'} fa-heart text-[10px]`}></i>
                </button>
             </div>
             <p className="text-sm text-slate-600 mb-4">{g.explanation}</p>
             <div className="bg-slate-50 p-4 rounded-2xl italic text-xs text-slate-500">例: {g.example}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
