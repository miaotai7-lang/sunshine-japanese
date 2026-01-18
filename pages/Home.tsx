import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats, recordActivity } from '../services/statsService';
import { fetchLearningContent, fetchBibleVerses, fetchTopSongs } from '../services/geminiService';
import { clearCacheByDate, clearAllLearningCache } from '../services/cacheService';
import { JLPTLevel } from '../types';

export const Home: React.FC = () => {
  const [stats, setStats] = useState({ streak: 0, totalWords: 0, chartData: [0,0,0,0,0,0,0], todayPoints: 0 });
  const [syncStatus, setSyncStatus] = useState<{ loading: boolean; progress: number; message: string }>({
    loading: false,
    progress: 0,
    message: ''
  });

  useEffect(() => {
    setStats(getStats());
  }, []);

  const handleClearToday = () => {
    const today = new Date().toISOString().split('T')[0];
    if (window.confirm(`确定要清除今日 (${today}) 的下载语料吗？收藏夹和学习记录将安全保留。`)) {
      clearCacheByDate(today);
      localStorage.removeItem('last_prefetch_date');
      alert('今日缓存已清空');
      window.location.reload();
    }
  };

  const handleClearAll = () => {
    if (window.confirm('确定要清除所有已下载的文章、歌曲和圣经吗？收藏夹和学习记录将不会被删除。')) {
      clearAllLearningCache();
      alert('所有下载内容已清空');
      window.location.reload();
    }
  };

  const handleSyncAll = async () => {
    if (syncStatus.loading) return;
    
    const todayStr = new Date().toISOString().split('T')[0];
    setSyncStatus({ loading: true, progress: 0, message: '初始化全量同步计划...' });

    try {
      const levels = [JLPTLevel.N5, JLPTLevel.N4, JLPTLevel.N3, JLPTLevel.N2, JLPTLevel.N1];
      const categories = ['news', 'forum', 'trending'] as const;
      
      const totalTasks = (levels.length * categories.length) + 2; 
      let completed = 0;

      // 循环抓取所有等级和分类
      for (const lv of levels) {
        for (const cat of categories) {
          setSyncStatus(prev => ({ 
            ...prev, 
            message: `同步中: ${lv} ${cat === 'news' ? '快讯' : cat === 'forum' ? '日记' : '俚语'}...`, 
            progress: (completed / totalTasks) * 100 
          }));
          await fetchLearningContent(cat, lv, todayStr);
          completed++;
        }
      }

      setSyncStatus(prev => ({ ...prev, message: '正在同步圣经金句...', progress: (completed / totalTasks) * 100 }));
      await fetchBibleVerses();
      completed++;

      setSyncStatus(prev => ({ ...prev, message: '正在同步赞美之泉日语歌曲...', progress: (completed / totalTasks) * 100 }));
      await fetchTopSongs(0);
      completed++;

      localStorage.setItem('last_prefetch_date', todayStr);
      recordActivity(50); 
      
      setSyncStatus({ loading: false, progress: 100, message: '今日全量内容同步完成！' });
      setTimeout(() => setSyncStatus(prev => ({ ...prev, message: '' })), 3000);
      setStats(getStats());
    } catch (e) {
      console.error("Sync failed", e);
      setSyncStatus({ loading: false, progress: 0, message: '同步中断，请检查网络后重试' });
    }
  };

  const isTodaySynced = localStorage.getItem('last_prefetch_date') === new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <section className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100 overflow-hidden relative">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-2xl font-black tracking-tight">你好，闪闪！</h2>
            {syncStatus.loading ? (
              <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] font-black uppercase">{Math.round(syncStatus.progress)}%</span>
              </div>
            ) : isTodaySynced ? (
              <div className="bg-emerald-500/80 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 shadow-lg">
                <i className="fa-solid fa-check-double text-[10px]"></i>
                <span className="text-[10px] font-black uppercase tracking-widest">全等级已同步</span>
              </div>
            ) : null}
          </div>
          
          <p className="text-indigo-100 text-[10px] mb-8 opacity-80 min-h-[1.5rem] font-bold uppercase tracking-widest">
            {syncStatus.message || (stats.streak > 0 ? `已连续学习 ${stats.streak} 天，全语料已净化。` : '开启纯净版日语之旅。')}
          </p>

          <div className="flex flex-col gap-3">
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/10">
                  <span className="text-3xl font-black block tracking-tighter">{stats.streak}</span>
                  <span className="text-[10px] text-indigo-100 uppercase font-bold tracking-widest">学习天数</span>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/10">
                  <span className="text-3xl font-black block tracking-tighter">{stats.totalWords}</span>
                  <span className="text-[10px] text-indigo-100 uppercase font-bold tracking-widest">收藏中心</span>
                </div>
              </div>

              {!syncStatus.loading && (
                <div className="space-y-2 mt-2">
                   <button 
                    onClick={handleSyncAll}
                    className="w-full bg-white text-indigo-600 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-bolt-lightning"></i> 一键同步全等级语料
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={handleClearToday}
                      className="bg-indigo-500/30 text-white border border-white/10 py-2.5 rounded-2xl text-[10px] font-black hover:bg-orange-500/40 transition-all flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-calendar-minus"></i> 清除今日数据
                    </button>
                    <button 
                      onClick={handleClearAll}
                      className="bg-indigo-500/30 text-white border border-white/10 py-2.5 rounded-2xl text-[10px] font-black hover:bg-rose-500/40 transition-all flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-trash-can"></i> 清除全部数据
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>
        <i className="fa-solid fa-sun absolute -right-6 -bottom-6 text-[10rem] text-white/5 rotate-12"></i>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="font-black text-lg">全语料学习</h3>
          <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-black tracking-widest uppercase">
             {new Date().toLocaleDateString('ja-JP')}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <MenuCard to="/learning" title="每日新闻" desc="N1-N5 覆盖" icon="fa-newspaper" color="bg-emerald-50 text-emerald-600" />
          <MenuCard to="/bible" title="圣经名句" desc="净化排版" icon="fa-dove" color="bg-purple-50 text-purple-600" />
          <MenuCard to="/songs" title="赞美之泉" desc="精选歌单" icon="fa-music" color="bg-rose-50 text-rose-600" />
          <MenuCard to="/collection" title="复习中心" desc="记忆追踪" icon="fa-star" color="bg-amber-50 text-amber-600" />
        </div>
      </section>
    </div>
  );
};

const MenuCard: React.FC<{ to: string, title: string, desc: string, icon: string, color: string }> = ({ to, title, desc, icon, color }) => (
  <Link to={to} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-95">
    <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center mb-4 shadow-sm`}>
      <i className={`fa-solid ${icon} text-lg`}></i>
    </div>
    <h4 className="font-bold text-sm mb-1">{title}</h4>
    <p className="text-[10px] text-slate-400 leading-tight font-medium uppercase tracking-tighter">{desc}</p>
  </Link>
);
