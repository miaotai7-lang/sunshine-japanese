import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Article, getLevelColor } from '../types';
import { playTTS } from '../services/geminiService';
import { getArticleById } from '../services/cacheService';
import { recordActivity } from '../services/statsService';

export const ArticleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [article, setArticle] = useState<Article | null>(location.state?.article || null);
  const [activeTab, setActiveTab] = useState<'content' | 'vocab' | 'grammar'>('content');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [starred, setStarred] = useState<Set<string>>(new Set());
  
  // 显隐控制状态
  const [showJapanese, setShowJapanese] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);

  const refreshStarred = () => {
    const collections = JSON.parse(localStorage.getItem('user_collection') || '[]');
    setStarred(new Set(collections.map((item: any) => String(item.id))));
  };

  useEffect(() => {
    if (!article && id) {
      const cached = getArticleById(id);
      if (cached) setArticle(cached);
    }
    refreshStarred();
  }, [id, article]);

  if (!article) return <div className="p-10 text-center text-slate-400 font-black">正在加载内容...</div>;

  const handleTTS = async (text: string, id: string) => {
    setPlayingId(id);
    await playTTS(text);
    setPlayingId(null);
  };

  const toggleStar = (item: any, type: string) => {
    const itemId = String(item.id || (item.word ? `w-${item.word}` : `g-${item.point}`) || `custom-${Date.now()}`);
    const collections = JSON.parse(localStorage.getItem('user_collection') || '[]');
    let updated;
    
    if (starred.has(itemId)) {
      updated = collections.filter((i: any) => String(i.id) !== itemId);
    } else {
      updated = [...collections, { 
        id: itemId, 
        type, 
        content: item, 
        addedAt: Date.now(), 
        nextReviewAt: Date.now() + 86400000, 
        reviewStage: 1 
      }];
      recordActivity(5);
    }
    
    localStorage.setItem('user_collection', JSON.stringify(updated));
    refreshStarred();
  };

  return (
    <div className="pb-24 animate-fadeIn">
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-slate-50/90 backdrop-blur-md z-30 py-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 text-sm font-bold flex items-center gap-2">
          <i className="fa-solid fa-chevron-left"></i> 返回
        </button>
        <div className="flex gap-2">
           <button 
             onClick={() => setShowJapanese(!showJapanese)} 
             className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${showJapanese ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-200 text-slate-400'}`}
           >
             {showJapanese ? '隐藏假名汉字' : '显示假名汉字'}
           </button>
           <button 
             onClick={() => setShowTranslation(!showTranslation)} 
             className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${showTranslation ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-slate-200 text-slate-400'}`}
           >
             {showTranslation ? '隐藏翻译' : '显示翻译'}
           </button>
        </div>
      </div>

      <header className="mb-8 px-2">
        <h2 className={`text-2xl font-black leading-tight text-slate-800 mb-4 Japanese-text ${!showJapanese ? 'hidden-content' : ''}`}>
          {article.title}
        </h2>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 italic text-slate-500 text-sm leading-relaxed">
           {article.summary}
        </div>
      </header>

      <nav className="flex gap-2 mb-8 p-1.5 bg-slate-200/50 rounded-3xl sticky top-14 z-20">
        {(['content', 'vocab', 'grammar'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 px-4 py-3 text-xs font-black rounded-2xl transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500'}`}>
            {tab === 'content' ? '正文阅读' : tab === 'vocab' ? '核心词汇' : '语法要点'}
          </button>
        ))}
      </nav>

      <div className="space-y-6">
        {activeTab === 'content' && (
          <div className="space-y-4">
            {article.sentences?.map((sentence, i) => (
              <div key={i} className={`bg-white rounded-[2rem] p-6 border transition-all ${playingId === `s-${i}` ? 'border-indigo-500 shadow-lg' : 'border-slate-100 shadow-sm'}`}>
                <div className="flex justify-between items-start gap-4">
                   <div className="flex-1">
                      <p className={`text-lg text-slate-800 leading-relaxed font-medium Japanese-text ${!showJapanese ? 'hidden-content' : ''}`}>
                        {sentence}
                      </p>
                      <p className={`mt-4 text-slate-400 text-sm font-medium border-t border-slate-50 pt-4 translation-text ${!showTranslation ? 'hidden-content' : ''}`}>
                         {article.translations?.[i]}
                      </p>
                   </div>
                   <button onClick={() => handleTTS(sentence, `s-${i}`)} className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${playingId === `s-${i}` ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-400'}`}>
                     <i className={`fa-solid ${playingId === `s-${i}` ? 'fa-circle-notch fa-spin' : 'fa-volume-high'}`}></i>
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'vocab' && (
          <div className="grid gap-4">
            {article.vocabulary?.map((v, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm group">
                <div className="flex-1">
                  <div className={`flex items-center gap-3 mb-1 Japanese-text ${!showJapanese ? 'hidden-content' : ''}`}>
                    <span className="text-xl font-black text-slate-800">{v.word}</span>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">[{v.reading}]</span>
                  </div>
                  <p className={`text-sm text-slate-500 font-medium translation-text ${!showTranslation ? 'hidden-content' : ''}`}>
                    {v.meaning}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleStar(v, 'word')} className={`${starred.has(String(v.id || v.word)) ? 'text-amber-500' : 'text-slate-300'} transition-all px-2`}>
                    <i className="fa-solid fa-star"></i>
                  </button>
                  <button onClick={() => handleTTS(v.reading || v.word, `v-${i}`)} className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600">
                     <i className="fa-solid fa-volume-high"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
