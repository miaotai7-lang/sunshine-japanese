
import React, { useState, useEffect, useCallback } from 'react';
import { fetchLearningContent } from '../services/geminiService';
import { Article, LearningCategory, JLPTLevel } from '../types';
import { Link } from 'react-router-dom';
import { getArticlesByDateAndCategory } from '../services/cacheService';

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
  const [activeTab, setActiveTab] = useState<LearningCategory>('news');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLocalCache = useCallback(() => {
    const cached = getArticlesByDateAndCategory(selectedDate, activeTab);
    setArticles(cached);
    if (cached.length > 0) {
      setLoading(false);
      setError(null);
    }
  }, [selectedDate, activeTab]);

  const checkAndAutoSync = async () => {
    const today = new Date().toISOString().split('T')[0];
    if (selectedDate !== today) return;

    const lastSyncKey = `last_sync_${selectedDate}_${activeTab}`;
    const lastSync = parseInt(localStorage.getItem(lastSyncKey) || "0");
    const syncInterval = 4 * 60 * 60 * 1000; // 延长到4小时，减少 API 压力

    if (Date.now() - lastSync > syncInterval) {
      handleManualRefresh();
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocalCache();
    checkAndAutoSync();
  }, [activeTab, selectedDate, loadLocalCache]);

  const handleManualRefresh = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      await fetchLearningContent(activeTab, selectedDate, true);
      const updated = getArticlesByDateAndCategory(selectedDate, activeTab);
      setArticles(updated);
      localStorage.setItem(`last_sync_${selectedDate}_${activeTab}`, Date.now().toString());
    } catch (e: any) {
      setError(e.message || "抓取失败，请检查网络或稍后重试");
    } finally {
      setIsSyncing(false);
      setLoading(false);
    }
  };

  const renderCalendar = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
      <div className="bg-white rounded-[2rem] p-6 shadow-2xl animate-fadeIn border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h4 className="font-black text-slate-800">{currentYear}年 {currentMonth + 1}月</h4>
          <button onClick={() => setShowCalendar(false)} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400">
            <i className="fa-solid fa-times text-sm"></i>
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`}></div>;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = selectedDate === dateStr;
            const isFuture = new Date(dateStr) > new Date();
            return (
              <button
                key={dateStr}
                disabled={isFuture}
                onClick={() => { setSelectedDate(dateStr); setShowCalendar(false); setLoading(true); }}
                className={`h-10 rounded-xl font-bold transition-all ${
                  isSelected ? 'bg-indigo-600 text-white shadow-lg' : 
                  isFuture ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12 relative">
      <header className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black text-slate-800">深度学习馆</h2>
          <button 
            onClick={() => setShowCalendar(!showCalendar)}
            className="bg-white border border-slate-200 px-4 py-2 rounded-2xl text-indigo-600 font-bold text-xs shadow-sm flex items-center gap-2"
          >
            <i className="fa-solid fa-calendar-alt"></i>
            {selectedDate}
          </button>
        </div>

        {showCalendar && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-sm">{renderCalendar()}</div>
          </div>
        )}

        <div className="flex bg-slate-200/50 p-1.5 rounded-3xl">
          {([
            { id: 'news', label: '环球快讯', icon: 'fa-bolt' },
            { id: 'forum', label: '日本洞察', icon: 'fa-comments' },
            { id: 'trending', label: '潮流趋势', icon: 'fa-fire' }
          ] as const).map((tab) => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setLoading(true); }} className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-black transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500'}`}>
              <i className={`fa-solid ${tab.icon}`}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {isSyncing && (
          <div className="bg-indigo-600 text-white p-6 rounded-[2rem] flex flex-col items-center gap-4 shadow-xl shadow-indigo-100 animate-pulse">
             <i className="fa-solid fa-wand-magic-sparkles text-2xl"></i>
             <div className="text-center">
                <span className="text-sm font-black block">AI 正在全力构建 5 篇深度语料</span>
                <span className="text-[10px] opacity-80">生成假名注音耗时较长，请保持网络连接...</span>
             </div>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-100 p-6 rounded-[2rem] text-center">
             <i className="fa-solid fa-triangle-exclamation text-rose-500 text-2xl mb-2"></i>
             <p className="text-rose-600 text-xs font-bold mb-4">{error}</p>
             <button onClick={handleManualRefresh} className="bg-rose-500 text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg">重新尝试抓取</button>
          </div>
        )}
      </header>

      <div className="space-y-4">
        {loading && articles.length === 0 && !error ? (
          <div className="text-center py-24">
            <div className="inline-block w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-400 text-xs font-bold uppercase">Connecting to AI Neural Network...</p>
          </div>
        ) : articles.length > 0 ? (
          <div className="space-y-4">
            {articles.map((article) => (
              <Link key={article.id} to={`/learning/${article.id}`} state={{ article }} className="block bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-md transition-all animate-fadeIn relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity">
                  <span className="text-6xl font-black italic">{article.level}</span>
                </div>
                <div className="flex items-center gap-2 mb-4">
                   <span className={`text-[10px] px-3 py-1 rounded-full font-black ${getLevelColor(article.level)}`}>{article.level}</span>
                   <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">{activeTab}</span>
                </div>
                <h3 className="font-bold text-xl mb-4 Japanese-text text-slate-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: article.title }}></h3>
                <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed mb-6">{article.summary}</p>
                <div className="flex items-center text-indigo-600 text-xs font-black uppercase tracking-widest">
                  进入深度阅读 <i className="fa-solid fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
                </div>
              </Link>
            ))}
            {!isSyncing && !error && selectedDate === new Date().toISOString().split('T')[0] && (
              <button 
                onClick={handleManualRefresh}
                className="w-full py-6 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                + 再次抓取 5 篇新语料
              </button>
            )}
          </div>
        ) : !loading && (
          <div className="text-center py-24 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
             <i className="fa-solid fa-ghost text-slate-100 text-6xl mb-4"></i>
             <p className="text-slate-400 text-sm font-bold">暂无今日缓存语料</p>
             <button onClick={handleManualRefresh} className="mt-4 text-indigo-600 font-black text-xs uppercase underline">启动 AI 引擎抓取</button>
          </div>
        )}
      </div>
    </div>
  );
};
