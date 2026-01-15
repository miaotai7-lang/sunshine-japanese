
import React, { useState, useEffect, useRef } from 'react';
import { fetchLearningContent } from '../services/geminiService';
import { Article, LearningCategory } from '../types';
import { Link } from 'react-router-dom';

export const Learning: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LearningCategory>('news');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0); // 0: 搜索, 1: 翻译, 2: 假名标注
  const scrollRef = useRef<HTMLDivElement>(null);

  const steps = [
    "正在从 NHK 抓取今日头条...",
    "正在进行深度中文意译...",
    "正在为汉字标注精准假名...",
    "即将完成，准备呈现学习内容..."
  ];

  const loadData = async (isAppend: boolean = false) => {
    if (isAppend) setFetchingMore(true);
    else setLoading(true);
    
    setLoadingStep(0);
    const interval = setInterval(() => {
      setLoadingStep(s => (s < steps.length - 1 ? s + 1 : s));
    }, 2500);

    try {
      const data = await fetchLearningContent(activeTab, selectedDate, isAppend);
      if (isAppend) setArticles(prev => [...prev, ...data]);
      else setArticles(data);
      
      // 策略：预取逻辑
      if (!isAppend && data.length > 0) {
        prefetchOtherCategories();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setFetchingMore(false);
      clearInterval(interval);
    }
  };

  // 预取函数：在当前分类加载完后，静默加载其他两个分类
  const prefetchOtherCategories = async () => {
    const categories: LearningCategory[] = ['news', 'forum', 'trending'];
    for (const cat of categories) {
      if (cat !== activeTab) {
        // fetchLearningContent 内部会自动检查缓存，已有的不会重抓
        fetchLearningContent(cat, selectedDate, false).catch(() => {});
      }
    }
  };

  useEffect(() => { loadData(false); }, [activeTab, selectedDate]);

  const dates = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });

  const tabs: { id: LearningCategory; label: string; icon: string }[] = [
    { id: 'news', label: '快讯', icon: 'fa-bolt' },
    { id: 'forum', label: '洞察', icon: 'fa-comments' },
    { id: 'trending', label: '潮流', icon: 'fa-fire' },
  ];

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col gap-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-2xl font-black text-slate-800">学习资源</h2>
          <div className="bg-indigo-600 px-3 py-1 rounded-full text-white font-black text-[10px] shadow-lg shadow-indigo-100 uppercase tracking-tighter">
            {selectedDate === new Date().toISOString().split('T')[0] ? 'TODAY' : selectedDate}
          </div>
        </div>

        <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
          {dates.map((date) => {
            const isSelected = selectedDate === date;
            const d = new Date(date);
            const dayName = d.toLocaleDateString('zh-CN', { weekday: 'short' });
            const dayNum = d.getDate();
            return (
              <button key={date} onClick={() => setSelectedDate(date)} className={`flex-shrink-0 w-14 h-20 rounded-[1.2rem] flex flex-col items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'bg-white text-slate-400 border border-slate-50'}`}>
                <span className="text-[10px] font-black opacity-60 mb-1">{dayName}</span>
                <span className="text-xl font-black">{dayNum}</span>
              </button>
            );
          })}
        </div>

        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl relative">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500'}`}>
              <i className={`fa-solid ${tab.icon}`}></i>
              {tab.label}
            </button>
          ))}
        </div>
        
        {!loading && (
          <button onClick={() => loadData(true)} disabled={fetchingMore} className="flex items-center justify-center gap-2 bg-white text-slate-400 py-3 rounded-2xl text-[10px] font-black tracking-widest transition-colors border border-slate-100 shadow-sm uppercase active:scale-95">
            {fetchingMore ? <><i className="fa-solid fa-circle-notch animate-spin"></i> GENERATING...</> : <><i className="fa-solid fa-plus-circle"></i> 抓取更多内容</>}
          </button>
        )}
      </header>

      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="relative mb-8">
              <div className="w-16 h-16 border-4 border-indigo-100 rounded-full"></div>
              <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
              <div className="absolute inset-0 flex items-center justify-center"><i className="fa-solid fa-sparkles text-indigo-400 animate-pulse"></i></div>
            </div>
            <p className="text-slate-800 font-black text-sm mb-2 px-6">{steps[loadingStep]}</p>
            <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">AI is gathering data for you</p>
          </div>
        ) : articles.length > 0 ? (
          articles.map((article) => (
            <Link key={article.id} to={`/learning/${article.id}`} state={{ article }} className="block bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all animate-fadeIn relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-50 group-hover:bg-indigo-400 transition-colors"></div>
              <h3 className="font-bold text-lg mb-3 Japanese-text text-slate-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: article.title }}></h3>
              <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed font-medium">{article.summary}</p>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[8px] bg-slate-50 text-slate-400 px-2 py-0.5 rounded font-black uppercase tracking-tighter">Read More</span>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-100">
             <i className="fa-solid fa-cloud-moon text-slate-100 text-6xl mb-4"></i>
             <p className="text-slate-400 text-sm font-bold">该日期暂无数据，点击上方按钮抓取</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const getLevelColor = (level: string) => {
  switch (level) {
    case 'N1': return 'bg-purple-100 text-purple-700';
    case 'N2': return 'bg-blue-100 text-blue-700';
    case 'N3': return 'bg-emerald-100 text-emerald-700';
    case 'N4': return 'bg-amber-100 text-amber-700';
    case 'N5': return 'bg-rose-100 text-rose-700';
    default: return 'bg-slate-100 text-slate-700';
  }
};
