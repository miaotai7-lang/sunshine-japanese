
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats, recordActivity } from '../services/statsService';
import { fetchLearningContent, fetchBibleVerses } from '../services/geminiService';
import { JLPTLevel } from '../types';

export const Home: React.FC = () => {
  const [stats, setStats] = useState({ streak: 0, totalWords: 0, chartData: [0,0,0,0,0,0,0], todayPoints: 0 });
  const [prefs, setPrefs] = useState({
    fontSize: 18,
    rubySize: 0.55,
    showColors: true,
    defaultLevel: JLPTLevel.N3
  });

  const [syncStatus, setSyncStatus] = useState<{ loading: boolean; progress: number; message: string }>({
    loading: false,
    progress: 0,
    message: ''
  });

  useEffect(() => {
    setStats(getStats());
    const savedPrefs = JSON.parse(localStorage.getItem('user_prefs') || '{}');
    if (savedPrefs.fontSize) setPrefs(prev => ({ ...prev, ...savedPrefs }));
    
    // 东京 3:00 自动预热
    checkAndPrefetch();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--base-font-size', `${prefs.fontSize / 16}rem`);
    document.documentElement.style.setProperty('--ruby-font-size', `${prefs.rubySize}em`);
    if (prefs.showColors) {
      document.body.classList.remove('hide-colors');
    } else {
      document.body.classList.add('hide-colors');
    }
    localStorage.setItem('user_prefs', JSON.stringify(prefs));
  }, [prefs]);

  const checkAndPrefetch = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const lastPrefetch = localStorage.getItem('last_prefetch_date');
    const tokyoTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
    const hour = tokyoTime.getHours();

    if (lastPrefetch !== todayStr && hour >= 3) {
      handleSyncAll(true);
    }
  };

  const handleSyncAll = async (isSilent = false) => {
    if (syncStatus.loading) return;
    
    const todayStr = new Date().toISOString().split('T')[0];
    if (!isSilent) {
      setSyncStatus({ loading: true, progress: 10, message: '正在连接 AI 引擎...' });
    }

    try {
      const tasks = [
        { name: '新闻', fn: () => fetchLearningContent('news', prefs.defaultLevel, todayStr) },
        { name: '博主', fn: () => fetchLearningContent('forum', prefs.defaultLevel, todayStr) },
        { name: '趋势', fn: () => fetchLearningContent('trending', prefs.defaultLevel, todayStr) },
        { name: '圣经', fn: () => fetchBibleVerses() }
      ];

      let completed = 0;
      const results = await Promise.allSettled(tasks.map(async (task) => {
        const res = await task.fn();
        completed++;
        if (!isSilent) {
          setSyncStatus(prev => ({ 
            ...prev, 
            progress: 10 + (completed / tasks.length) * 85, 
            message: `已完成 ${task.name} 同步...` 
          }));
        }
        return res;
      }));

      localStorage.setItem('last_prefetch_date', todayStr);
      recordActivity(20); // 同步奖励积分
      
      if (!isSilent) {
        setSyncStatus({ loading: false, progress: 100, message: '今日内容整备完毕！' });
        setTimeout(() => setSyncStatus(prev => ({ ...prev, message: '' })), 3000);
      }
    } catch (e) {
      console.error("Sync failed", e);
      if (!isSilent) {
        setSyncStatus({ loading: false, progress: 0, message: '同步部分失败，请重试' });
      }
    }
  };

  const handleClearAllData = () => {
    if (window.confirm("确定要清空所有已抓取的内容吗？")) {
      const userPrefs = localStorage.getItem('user_prefs');
      localStorage.clear();
      if (userPrefs) localStorage.setItem('user_prefs', userPrefs);
      window.location.reload();
    }
  };

  const isTodaySynced = localStorage.getItem('last_prefetch_date') === new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <section className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100 overflow-hidden relative">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-2xl font-black tracking-tight">你好，探索者！</h2>
            {syncStatus.loading ? (
              <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] font-black uppercase tracking-tighter">{Math.round(syncStatus.progress)}%</span>
              </div>
            ) : isTodaySynced ? (
              <div className="bg-emerald-500/80 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 shadow-lg shadow-emerald-900/20">
                <i className="fa-solid fa-check-double text-[10px]"></i>
                <span className="text-[10px] font-black uppercase tracking-tighter">Content Ready</span>
              </div>
            ) : (
              <button 
                onClick={() => handleSyncAll(false)}
                className="bg-white text-indigo-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
              >
                <i className="fa-solid fa-bolt-lightning mr-2"></i> 一键准备今日
              </button>
            )}
          </div>
          
          <p className="text-indigo-100 text-sm mb-8 opacity-80">
            {syncStatus.message || (stats.streak > 0 ? `已连续学习 ${stats.streak} 天，继续保持！` : '开启今天的日语之旅吧。')}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/10">
              <span className="text-3xl font-black block tracking-tighter">{stats.streak}</span>
              <span className="text-[10px] text-indigo-100 uppercase font-bold tracking-widest">学习天数</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/10">
              <span className="text-3xl font-black block tracking-tighter">{stats.totalWords}</span>
              <span className="text-[10px] text-indigo-100 uppercase font-bold tracking-widest">收藏表达</span>
            </div>
          </div>
        </div>
        <i className="fa-solid fa-sun absolute -right-6 -bottom-6 text-[10rem] text-white/5 rotate-12"></i>
      </section>

      {/* 快捷菜单 */}
      <section>
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="font-black text-lg">快速学习</h3>
          <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-black tracking-widest uppercase">
             TODAY: {stats.todayPoints} PTS
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <MenuCard to="/learning" title="每日新闻" desc="N1-N5 语料库" icon="fa-newspaper" color="bg-emerald-50 text-emerald-600" />
          <MenuCard to="/bible" title="圣经名句" desc="灵修学日语" icon="fa-dove" color="bg-purple-50 text-purple-600" />
          <MenuCard to="/practice" title="弱点突击" desc="AI 自适应题" icon="fa-bolt" color="bg-amber-50 text-amber-600" />
          <MenuCard to="/collection" title="记忆工坊" desc="艾宾浩斯复习" icon="fa-repeat" color="bg-rose-50 text-rose-600" />
        </div>
      </section>

      {/* 设置模块 */}
      <section className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
        <h3 className="font-black text-lg mb-6 flex items-center gap-3">
          <i className="fa-solid fa-sliders text-indigo-600"></i>
          学习偏好
        </h3>
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest">
              <span>全局字号</span>
              <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{prefs.fontSize}px</span>
            </div>
            <input 
              type="range" min="14" max="24" value={prefs.fontSize}
              onChange={(e) => setPrefs(p => ({ ...p, fontSize: parseInt(e.target.value) }))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3">
               <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${prefs.showColors ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                  <i className="fa-solid fa-palette text-sm"></i>
               </div>
               <div>
                  <h4 className="text-xs font-bold">语义着色</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Coloring particles & grammar</p>
               </div>
            </div>
            <button 
              onClick={() => setPrefs(p => ({ ...p, showColors: !p.showColors }))}
              className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${prefs.showColors ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${prefs.showColors ? 'left-7 shadow-md' : 'left-1'}`}></div>
            </button>
          </div>
        </div>
      </section>

      <section className="bg-rose-50/50 rounded-[2.5rem] p-8 border border-rose-100/50 mt-12">
        <div className="flex items-center gap-4 mb-4 text-rose-500">
           <i className="fa-solid fa-database text-xl"></i>
           <h3 className="font-black text-sm uppercase tracking-widest">缓存管理</h3>
        </div>
        <button
          onClick={handleClearAllData}
          className="w-full py-4 bg-white border border-rose-200 text-rose-500 rounded-2xl font-black text-xs shadow-sm active:scale-95 transition-all uppercase tracking-widest"
        >
          立即清除所有缓存
        </button>
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
