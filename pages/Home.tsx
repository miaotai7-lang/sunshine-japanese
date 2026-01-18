import React, { useEffect, useState } from 'react';
import { getStats, recordActivity } from '../services/statsService';
import { fetchLearningContent, fetchBibleVerses, fetchTopSongs } from '../services/geminiService';
import { clearCacheByDate, clearAllLearningCache } from '../services/cacheService';
import { JLPTLevel, getLevelColor } from '../types';
import { Link } from 'react-router-dom';

export const Home: React.FC = () => {
  const [stats, setStats] = useState({ streak: 0, totalWords: 0, chartData: [0,0,0,0,0,0,0], todayPoints: 0 });
  const [syncStatus, setSyncStatus] = useState<{ loading: boolean; progress: number; message: string }>({
    loading: false, progress: 0, message: ''
  });

  useEffect(() => {
    setStats(getStats());
  }, []);

  const handleSyncAll = async () => {
    if (syncStatus.loading) return;
    
    let wakeLock: any = null;
    if ('wakeLock' in navigator) {
      try { wakeLock = await (navigator as any).wakeLock.request('screen'); } catch (e) {}
    }

    const todayStr = new Date().toISOString().split('T')[0];
    setSyncStatus({ loading: true, progress: 0, message: '请求屏幕锁定，开始同步...' });

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

      setSyncStatus(prev => ({ ...prev, message: '抓取圣经与解析...', progress: (done / total) * 100 }));
      await fetchBibleVerses();
      done++;

      setSyncStatus(prev => ({ ...prev, message: '抓取赞美之泉...', progress: (done / total) * 100 }));
      await fetchTopSongs(0);
      
      localStorage.setItem('last_prefetch_date', todayStr);
      recordActivity(50);
      setSyncStatus({ loading: false, progress: 100, message: '同步圆满完成！' });
    } catch (e) {
      setSyncStatus({ loading: false, progress: 0, message: '同步出错，请重试' });
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
              <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] font-black">{Math.round(syncStatus.progress)}%</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/10 p-5 rounded-3xl border border-white/10">
              <span className="text-3xl font-black block tracking-tighter">{stats.streak}</span>
              <span className="text-[10px] opacity-60 font-bold uppercase tracking-widest">连续学习</span>
            </div>
            <div className="bg-white/10 p-5 rounded-3xl border border-white/10">
              <span className="text-3xl font-black block tracking-tighter">{stats.totalWords}</span>
              <span className="text-[10px] opacity-60 font-bold uppercase tracking-widest">收藏词汇</span>
            </div>
          </div>

          {!syncStatus.loading && (
            <button 
              onClick={handleSyncAll}
              className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isTodaySynced ? 'bg-emerald-500 text-white' : 'bg-white text-indigo-600 shadow-lg'}`}
            >
              <i className={`fa-solid ${isTodaySynced ? 'fa-check-double' : 'fa-bolt-lightning'}`}></i>
              {isTodaySynced ? '今日已离线' : '一键同步全等级'}
            </button>
          )}
          {syncStatus.loading && <p className="text-[10px] text-center mt-4 font-bold animate-pulse">{syncStatus.message}</p>}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <MenuCard to="/learning" title="每日新闻" icon="fa-newspaper" color="bg-emerald-50 text-emerald-600" />
        <MenuCard to="/bible" title="圣经名句" icon="fa-dove" color="bg-purple-50 text-purple-600" />
        <MenuCard to="/songs" title="赞美之泉" icon="fa-music" color="bg-rose-50 text-rose-600" />
        <MenuCard to="/collection" title="复习中心" icon="fa-star" color="bg-amber-50 text-amber-600" />
      </div>
    </div>
  );
};

const MenuCard = ({ to, title, icon, color }: any) => (
  <Link to={to} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex flex-col items-center text-center shadow-sm active:scale-95 transition-all">
    <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center mb-4`}>
      <i className={`fa-solid ${icon} text-lg`}></i>
    </div>
    <h4 className="font-bold text-sm">{title}</h4>
  </Link>
);
