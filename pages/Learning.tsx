
import React, { useState, useEffect } from 'react';
import { fetchLearningContent } from '../services/geminiService';
import { Article, LearningCategory, JLPTLevel } from '../types';
import { Link } from 'react-router-dom';

// Helper to get color classes based on JLPT level
export const getLevelColor = (level: JLPTLevel | string) => {
  switch (level) {
    case 'N1': return 'bg-rose-50 text-rose-600 border-rose-100';
    case 'N2': return 'bg-orange-50 text-orange-600 border-orange-100';
    case 'N3': return 'bg-amber-50 text-amber-600 border-amber-100';
    case 'N4': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    case 'N5': return 'bg-sky-50 text-sky-600 border-sky-100';
    default: return 'bg-slate-50 text-slate-600 border-slate-100';
  }
};

export const Learning: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LearningCategory>('news');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const loadData = async (isAppend: boolean = false) => {
    if (isAppend) setFetchingMore(true);
    else setLoading(true);
    
    // 策略：如果是"抓取更多"，重点推 N3-N1；如果是普通加载，根据缓存
    const levelFocus = isAppend ? "Focus N3-N1 (80%) and N5-N4 (20%)" : "N5-N1 Mixed";

    try {
      const data = await fetchLearningContent(activeTab, selectedDate, isAppend, levelFocus);
      if (isAppend) setArticles(prev => [...prev, ...data]);
      else setArticles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setFetchingMore(false);
    }
  };

  useEffect(() => { loadData(false); }, [activeTab, selectedDate]);

  // 日历生成逻辑
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
          <button onClick={() => setShowCalendar(false)} className="text-slate-400"><i className="fa-solid fa-times-circle text-xl"></i></button>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black text-slate-300 mb-2">
          {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`}></div>;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = selectedDate === dateStr;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;
            return (
              <button
                key={dateStr}
                onClick={() => { setSelectedDate(dateStr); setShowCalendar(false); }}
                className={`h-10 rounded-xl font-bold transition-all ${
                  isSelected ? 'bg-indigo-600 text-white shadow-lg' : 
                  isToday ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200' : 'text-slate-400 hover:bg-slate-50'
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
        <div className="flex justify-between items-center px-1">
          <h2 className="text-2xl font-black text-slate-800">学习资源</h2>
          <button 
            onClick={() => setShowCalendar(!showCalendar)}
            className="bg-indigo-600 px-4 py-2 rounded-2xl text-white font-black text-[10px] shadow-lg shadow-indigo-100 flex items-center gap-2"
          >
            <i className="fa-solid fa-calendar-alt"></i>
            {selectedDate}
          </button>
        </div>

        {showCalendar && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-sm">{renderCalendar()}</div>
          </div>
        )}

        <div className="flex bg-slate-200/50 p-1.5 rounded-3xl">
          {([
            { id: 'news', label: '快讯', icon: 'fa-bolt' },
            { id: 'forum', label: '洞察', icon: 'fa-comments' },
            { id: 'trending', label: '潮流', icon: 'fa-fire' }
          ] as const).map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-black transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500'}`}>
              <i className={`fa-solid ${tab.icon}`}></i>
              {tab.label}
            </button>
          ))}
        </div>
        
        {!loading && (
          <button 
            onClick={() => loadData(true)} 
            disabled={fetchingMore} 
            className="flex items-center justify-center gap-3 bg-white text-indigo-600 py-5 rounded-[2rem] text-xs font-black tracking-widest transition-all border border-indigo-50 shadow-sm active:scale-95"
          >
            {fetchingMore ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-sparkles"></i>}
            {fetchingMore ? 'AI 分析中...' : '抓取更多 (挑战 N3-N1)'}
          </button>
        )}
      </header>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-24">
            <div className="inline-block w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Gathering Wisdom...</p>
          </div>
        ) : articles.length > 0 ? (
          articles.map((article) => (
            <Link key={article.id} to={`/learning/${article.id}`} state={{ article }} className="block bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-md transition-all animate-fadeIn relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                <span className="text-4xl font-black italic">{article.level}</span>
              </div>
              <h3 className="font-bold text-lg mb-4 Japanese-text text-slate-800 pr-12" dangerouslySetInnerHTML={{ __html: article.title }}></h3>
              <div className="text-slate-400 text-xs line-clamp-2 leading-relaxed font-medium mb-4" dangerouslySetInnerHTML={{ __html: article.summary }}></div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-black uppercase tracking-tighter">探索详情</span>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
             <i className="fa-solid fa-ghost text-slate-100 text-6xl mb-4"></i>
             <p className="text-slate-400 text-sm font-bold">该日期暂无数据，请尝试上方抓取按钮</p>
          </div>
        )}
      </div>
    </div>
  );
};
