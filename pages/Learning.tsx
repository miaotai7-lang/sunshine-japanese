
import React, { useState, useEffect, useCallback } from 'react';
import { fetchLearningContent } from '../services/geminiService';
import { Article, LearningCategory, JLPTLevel } from '../types';
import { Link } from 'react-router-dom';
import { getArticlesCache } from '../services/cacheService';

export const getLevelColor = (level: JLPTLevel | string) => {
  switch (level) {
    case 'N1': return 'bg-rose-500 text-white';
    case 'N2': return 'bg-orange-500 text-white';
    case 'N3': return 'bg-amber-500 text-white';
    case 'N4': return 'bg-emerald-500 text-white';
    case 'N5': return 'bg-sky-500 text-white';
    default: return 'bg-slate-500 text-white';
  }
};

export const Learning: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<LearningCategory>('news');
  const [selectedLevel, setSelectedLevel] = useState<JLPTLevel>(JLPTLevel.N3);
  const [selectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadLocalCache = useCallback(() => {
    const cached = getArticlesCache().filter(a => a.category === activeCategory && a.level === selectedLevel);
    setArticles(cached);
  }, [activeCategory, selectedLevel]);

  useEffect(() => {
    loadLocalCache();
  }, [activeCategory, selectedLevel, loadLocalCache]);

  const handleFetch = async (isAppend: boolean = false) => {
    setIsSyncing(true);
    try {
      // Fixed: fetchLearningContent expects 3 arguments, removed isAppend which was the 4th
      const news = await fetchLearningContent(activeCategory, selectedLevel, selectedDate);
      if (isAppend) {
        setArticles(prev => [...prev, ...news]);
      } else {
        setArticles(news);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">AI 深度学习馆</h2>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedDate}</span>
        </div>

        {/* 等级选择器 (N5-N1) */}
        <div className="grid grid-cols-5 gap-2 px-1">
          {([JLPTLevel.N5, JLPTLevel.N4, JLPTLevel.N3, JLPTLevel.N2, JLPTLevel.N1] as const).map((lv) => (
            <button
              key={lv}
              onClick={() => setSelectedLevel(lv)}
              className={`py-3 rounded-2xl font-black text-xs transition-all active:scale-90 ${
                selectedLevel === lv 
                  ? `${getLevelColor(lv)} shadow-lg shadow-${lv.toLowerCase()}-100` 
                  : 'bg-white text-slate-400 border border-slate-100'
              }`}
            >
              {lv}
            </button>
          ))}
        </div>

        {/* 分类选择器 */}
        <div className="flex bg-slate-200/50 p-1.5 rounded-[2rem]">
          {([
            { id: 'news', label: '环球快讯', icon: 'fa-globe' },
            { id: 'forum', label: '博主日记', icon: 'fa-feather' },
            { id: 'trending', label: '俚语词源', icon: 'fa-fire-flame-curved' }
          ] as const).map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => setActiveCategory(tab.id)} 
              className={`flex-1 py-3 rounded-[1.5rem] flex items-center justify-center gap-2 text-[10px] font-black transition-all ${
                activeCategory === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              <i className={`fa-solid ${tab.icon}`}></i>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* 搜索按钮：如果当前分类无数据则显示大的搜索按钮 */}
      {articles.length === 0 && !isSyncing && (
        <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
           <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-indigo-50 text-indigo-400`}>
              <i className="fa-solid fa-magnifying-glass text-2xl"></i>
           </div>
           <p className="text-slate-400 text-sm font-bold mb-6">点击下方按钮，由 AI 在全网检索<br/>{selectedLevel} {activeCategory === 'news' ? '新闻' : activeCategory === 'forum' ? '博客' : '流行语'}</p>
           <button 
             onClick={() => handleFetch(false)}
             className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-xl active:scale-95"
           >
             立即开启 AI 专项检索 (2篇)
           </button>
        </div>
      )}

      {isSyncing && (
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 flex flex-col items-center gap-4 text-center shadow-sm">
           <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
           <div>
              <p className="text-indigo-600 font-black text-sm">正在检索中...</p>
              <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">Searching Web & Generating Furigana</p>
           </div>
        </div>
      )}

      <div className="space-y-4">
        {articles.map((article) => (
          <Link 
            key={article.id} 
            to={`/learning/${article.id}`} 
            state={{ article }} 
            className="block bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-2 mb-3">
               <span className={`text-[9px] px-2.5 py-1 rounded-full font-black ${getLevelColor(article.level)}`}>{article.level}</span>
               <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">{activeCategory}</span>
            </div>
            <h3 className="font-black text-lg mb-3 Japanese-text text-slate-800 leading-snug" dangerouslySetInnerHTML={{ __html: article.title }}></h3>
            <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed mb-4">{article.summary}</p>
            <div className="text-indigo-600 text-[10px] font-black flex items-center gap-1">
              READ FULL ARTICLE <i className="fa-solid fa-arrow-right"></i>
            </div>
          </Link>
        ))}

        {articles.length > 0 && !isSyncing && (
          <button 
            onClick={() => handleFetch(true)}
            className="w-full py-5 bg-white border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 font-black text-[10px] uppercase tracking-widest active:bg-slate-50"
          >
            + 搜索更多 (追加2篇)
          </button>
        )}
      </div>
    </div>
  );
};
