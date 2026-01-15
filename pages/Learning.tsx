
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
  const [slowLoading, setSlowLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadData = async (isAppend: boolean = false) => {
    if (isAppend) setFetchingMore(true);
    else setLoading(true);
    setSlowLoading(false);
    
    const timer = window.setTimeout(() => setSlowLoading(true), 8000);

    try {
      const data = await fetchLearningContent(activeTab, selectedDate, isAppend);
      if (isAppend) setArticles(prev => [...prev, ...data]);
      else setArticles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setFetchingMore(false);
      clearTimeout(timer);
    }
  };

  useEffect(() => { loadData(false); }, [activeTab, selectedDate]);

  const dates = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });

  const tabs: { id: LearningCategory; label: string; icon: string }[] = [
    { id: 'news', label: '新闻', icon: 'fa-newspaper' },
    { id: 'forum', label: '论坛', icon: 'fa-comments' },
    { id: 'trending', label: '流行', icon: 'fa-fire' },
  ];

  const getLoadingMessage = () => {
    switch(activeTab) {
      case 'trending': return "正在巡回日本 SNS 搜寻当下最火流行语...";
      case 'forum': return "正在深挖日本论坛的高质量讨论帖...";
      default: return "正在从日本主流媒体抓取今日头条新闻...";
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">学习模块</h2>
          <div className="bg-indigo-50 px-3 py-1 rounded-full text-indigo-600 font-bold text-xs">
            {selectedDate === new Date().toISOString().split('T')[0] ? '今日' : selectedDate}
          </div>
        </div>

        <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
          {dates.map((date) => {
            const isSelected = selectedDate === date;
            const d = new Date(date);
            const dayName = d.toLocaleDateString('zh-CN', { weekday: 'short' });
            const dayNum = d.getDate();
            return (
              <button key={date} onClick={() => setSelectedDate(date)} className={`flex-shrink-0 w-12 h-16 rounded-2xl flex flex-col items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400'}`}>
                <span className="text-[10px] font-bold opacity-60 uppercase">{dayName}</span>
                <span className="text-lg font-bold">{dayNum}</span>
              </button>
            );
          })}
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl relative">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
              <i className={`fa-solid ${tab.icon}`}></i>
              {tab.label}
            </button>
          ))}
        </div>
        
        {!loading && (
          <button onClick={() => loadData(true)} disabled={fetchingMore} className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 py-3 rounded-2xl text-xs font-bold transition-colors border border-indigo-100">
            {fetchingMore ? <><i className="fa-solid fa-circle-notch animate-spin"></i> AI 正在生成...</> : <><i className="fa-solid fa-cloud-arrow-down"></i> 抓取更多</>}
          </button>
        )}
      </header>

      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-600 font-bold">{getLoadingMessage()}</p>
          </div>
        ) : articles.map((article) => (
          <Link key={article.id} to={`/learning/${article.id}`} state={{ article }} className="block bg-white rounded-3xl p-5 border border-slate-100 shadow-sm animate-fadeIn">
            <h3 className="font-bold text-lg mb-2 Japanese-text" dangerouslySetInnerHTML={{ __html: article.title }}></h3>
            <p className="text-slate-500 text-xs line-clamp-2">{article.summary}</p>
          </Link>
        ))}
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
