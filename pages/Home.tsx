
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats, recordActivity } from '../services/statsService';
import { fetchLearningContent, fetchBibleVerses, fetchTopSongs } from '../services/geminiService';
import { clearCacheByDate, clearAllLearningCache } from '../services/cacheService';
import { JLPTLevel } from '../types';

export const Home: React.FC = () => {
  const [stats, setStats] = useState({ streak: 0, totalWords: 0, chartData: [0,0,0,0,0,0,0], todayPoints: 0 });
  const [syncStatus, setSyncStatus] = useState<{ loading: boolean; progress: number; message: string }>({
    loading: false, progress: 0, message: ''
  });

  useEffect(() => {
    setStats(getStats());
  }, []);

  const handleClearToday = () => {
    const today = new Date().toISOString().split('T')[0];
    if (window.confirm(`确定清除今日 (${today}) 下载的语料吗？收藏夹和练习记录会被安全保留。`)) {
      clearCacheByDate(today);
      localStorage.removeItem('last_prefetch_date');
      alert('今日离线语料已清理');
      window.location.reload();
    }
  };

  const handleClearAll = () => {
    if (window.confirm('确定清除所有已下载的语料、圣经和歌曲吗？您的收藏夹和统计数据不会被删除。')) {
      clearAllLearningCache();
      alert('所有下载内容已清空');
      window.location.reload();
    }
  };

  const handleSyncAll = async () => {
    if (syncStatus.loading) return;
    
    // 激活屏幕常亮锁定，防止手机熄屏中断抓取
    let wakeLock: any = null;
    if ('wakeLock' in navigator) {
      try { wakeLock = await (navigator as any).wakeLock.request('screen'); } catch (e) {}
    }

    const todayStr = new Date().toISOString().split('T')[0];
    setSyncStatus({ loading: true, progress: 0, message: '已请求后台保持常亮，开始全量同步...' });

    try {
      const levels = [JLPTLevel.N5, JLPTLevel.N4, JLPTLevel.N3, JLPTLevel.N2, JLPTLevel.N1];
      const categories = ['news', 'forum', 'trending'] as const;
      const total = (levels.length * categories.length) + 2;
      let done = 0;

      for (const lv of levels) {
        for (const cat of categories) {
          setSyncStatus(prev => ({ 
            ...prev, message: `抓取中: ${lv} ${cat}...`, progress: (done / total) * 100 
          }));
          await fetchLearningContent(cat, lv, todayStr);
          done++;
        }
      }

      setSyncStatus(prev => ({ ...prev, message: '抓取圣经深度解析...', progress: (done / total) * 100 }));
      await fetchBibleVerses();
      done++;

      setSyncStatus(prev => ({ ...prev, message: '抓取赞美之泉日语歌曲...', progress: (done / total) * 100 }));
      await fetchTopSongs(0);
      
      localStorage.setItem('last_prefetch_date', todayStr);
      recordActivity(50);
      setSyncStatus({ loading: false, progress: 100, message: '同步完成！内容已转离线。' });
      setStats(getStats());
    } catch (e) {
      console.error(e);
      setSyncStatus({ loading: false, progress: 0, message: '同步中断，请检查网络后重试' });
    } finally {
      if (wakeLock) await wakeLock.release();
    }
  };

  const isTodaySynced = localStorage.getItem('last_prefetch_date') === new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-8 animate-fadeIn pb-12 px-2">
      <section className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-black">闪闪日语</h2>
            {syncStatus.loading && (
              <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] font-black uppercase tracking-widest">{Math.round(syncStatus.progress)}%</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/10 p-5 rounded-3xl border border-white/10">
              <span className="text-3xl font-black block tracking-tighter">{stats.streak}</span>
              <span className="text-[10px] opacity-60 font-bold uppercase tracking-widest">学习天数</span>
            </div>
            <div className="bg-white/10 p-5 rounded-3xl border border-white/10">
              <span className="text-3xl font-black block tracking-tighter">{stats.totalWords}</span>
              <span className="text-[10px] opacity-60 font-bold uppercase tracking-widest">收藏词汇</span>
            </div>
          </div>

          {!syncStatus.loading && (
            <div className="space-y-2">
              <button 
                onClick={handleSyncAll}
                className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isTodaySynced ? 'bg-emerald-500 text-white' : 'bg-white text-indigo-600 shadow-lg active:scale-95'}`}
              >
                <i className={`fa-solid ${isTodaySynced ? 'fa-check-double' : 'fa-bolt-lightning'}`}></i>
                {isTodaySynced ? '今日全量已离线' : '一键同步全等级语料'}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleClearToday} className="bg-indigo-500/20 text-white border border-white/10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-500/30 transition-all flex items-center justify-center gap-2">
                  <i className="fa-solid fa-calendar-minus"></i> 清除今日
                </button>
                <button onClick={handleClearAll} className="bg-indigo-500/20 text-white border border-white/10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/30 transition-all flex items-center justify-center gap-2">
                  <i className="fa-solid fa-trash-can"></i> 清除全部
                </button>
              </div>
            </div>
          )}
          {syncStatus.loading && <p className="text-[10px] text-center mt-4 font-bold animate-pulse text-indigo-100">{syncStatus.message}</p>}
        </div>
        <i className="fa-solid fa-sun absolute -right-6 -bottom-6 text-[10rem] text-white/5 rotate-12"></i>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <Link to="/learning" className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex flex-col items-center text-center shadow-sm active:scale-95 transition-all">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4"><i className="fa-solid fa-newspaper text-lg"></i></div>
          <h4 className="font-bold text-sm">每日新闻</h4>
        </Link>
        <Link to="/bible" className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex flex-col items-center text-center shadow-sm active:scale-95 transition-all">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4"><i className="fa-solid fa-dove text-lg"></i></div>
          <h4 className="font-bold text-sm">圣经名句</h4>
        </Link>
        <Link to="/songs" className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex flex-col items-center text-center shadow-sm active:scale-95 transition-all">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4"><i className="fa-solid fa-music text-lg"></i></div>
          <h4 className="font-bold text-sm">赞美之泉</h4>
        </Link>
        <Link to="/collection" className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex flex-col items-center text-center shadow-sm active:scale-95 transition-all">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4"><i className="fa-solid fa-star text-lg"></i></div>
          <h4 className="font-bold text-sm">复习中心</h4>
        </Link>
      </div>
    </div>
  );
};
