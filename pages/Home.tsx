
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats, recordActivity } from '../services/statsService';
import { fetchLearningContent } from '../services/geminiService';

export const Home: React.FC = () => {
  const [stats, setStats] = useState({ streak: 0, totalWords: 0, chartData: [0,0,0,0,0,0,0], todayPoints: 0 });
  const [prefs, setPrefs] = useState({
    fontSize: 18,
    rubySize: 0.55,
    showColors: true
  });

  useEffect(() => {
    setStats(getStats());
    const savedPrefs = JSON.parse(localStorage.getItem('user_prefs') || '{}');
    if (savedPrefs.fontSize) setPrefs(savedPrefs);
    
    // 东京 3:00 自动抓取逻辑
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
    
    // 获取东京时间
    const tokyoTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
    const hour = tokyoTime.getHours();

    if (lastPrefetch !== todayStr && hour >= 3) {
      console.log("Triggering 3 AM Tokyo Prefetch...");
      try {
        // 后台静默抓取 N5-N1 混合内容
        await fetchLearningContent('news', todayStr, false, "N5-N1");
        await fetchLearningContent('forum', todayStr, false, "N5-N1");
        localStorage.setItem('last_prefetch_date', todayStr);
      } catch (e) {
        console.error("Prefetch failed", e);
      }
    }
  };

  const maxPoint = Math.max(...stats.chartData, 10);

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <section className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100 overflow-hidden relative">
        <div className="relative z-10">
          <h2 className="text-2xl font-black mb-2 tracking-tight">你好，日语探索者！</h2>
          <p className="text-indigo-100 text-sm mb-8 opacity-80">
            {stats.streak > 0 ? `你已连续学习 ${stats.streak} 天，保持节奏！` : '每天一小步，收获大进步。'}
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

      {/* 偏好设置模块 */}
      <section className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
        <h3 className="font-black text-lg mb-6 flex items-center gap-3">
          <i className="fa-solid fa-sliders text-indigo-600"></i>
          个性化设置
        </h3>
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest">
              <span>阅读字号</span>
              <span className="text-indigo-600">{prefs.fontSize}px</span>
            </div>
            <input 
              type="range" min="14" max="24" value={prefs.fontSize}
              onChange={(e) => setPrefs(p => ({ ...p, fontSize: parseInt(e.target.value) }))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest">
              <span>假名注音大小</span>
              <span className="text-indigo-600">{(prefs.rubySize * 100).toFixed(0)}%</span>
            </div>
            <input 
              type="range" min="0.4" max="0.8" step="0.05" value={prefs.rubySize}
              onChange={(e) => setPrefs(p => ({ ...p, rubySize: parseFloat(e.target.value) }))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
            <div className="flex items-center gap-3">
               <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${prefs.showColors ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                  <i className="fa-solid fa-palette text-xs"></i>
               </div>
               <div>
                  <h4 className="text-xs font-bold">语法颜色标记</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Highlight grammar & particles</p>
               </div>
            </div>
            <button 
              onClick={() => setPrefs(p => ({ ...p, showColors: !p.showColors }))}
              className={`w-12 h-6 rounded-full relative transition-colors ${prefs.showColors ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${prefs.showColors ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="font-black text-lg">快速菜单</h3>
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
