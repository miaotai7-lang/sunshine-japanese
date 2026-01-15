
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../services/statsService';

export const Home: React.FC = () => {
  const [stats, setStats] = useState({ streak: 0, totalWords: 0, chartData: [0,0,0,0,0,0,0], todayPoints: 0 });

  useEffect(() => {
    setStats(getStats());
  }, []);

  const maxPoint = Math.max(...stats.chartData, 10);

  return (
    <div className="space-y-8 animate-fadeIn">
      <section className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 overflow-hidden relative">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">你好，日语学习者！</h2>
          <p className="text-indigo-100 mb-6">{stats.streak > 0 ? `你已经连续努力了 ${stats.streak} 天，太棒了！` : '今天是开启日语之门的好日子。'}</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
              <span className="text-3xl font-bold block tracking-tighter">{stats.streak}</span>
              <span className="text-[10px] text-indigo-100 uppercase font-bold">连续学习天数</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
              <span className="text-3xl font-bold block tracking-tighter">{stats.totalWords}</span>
              <span className="text-[10px] text-indigo-100 uppercase font-bold">已收录词汇/表达</span>
            </div>
          </div>
        </div>
        <i className="fa-solid fa-sun absolute -right-4 -bottom-4 text-9xl text-white/5 rotate-12"></i>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="font-bold text-lg">快速菜单</h3>
          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">今日获得 {stats.todayPoints} 活跃点</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <MenuCard to="/learning" title="新闻学习" desc="阅读今日新闻" icon="fa-newspaper" color="bg-emerald-50 text-emerald-600" />
          <MenuCard to="/bible" title="圣经名句" desc="读经典学日语" icon="fa-dove" color="bg-purple-50 text-purple-600" />
          <MenuCard to="/practice" title="每日练习" desc="10道题测试" icon="fa-bolt" color="bg-amber-50 text-amber-600" />
          <MenuCard to="/collection" title="复习收藏" desc="巩固记忆" icon="fa-repeat" color="bg-rose-50 text-rose-600" />
        </div>
      </section>

      <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <h3 className="font-bold mb-6 flex items-center gap-2">
          <i className="fa-solid fa-chart-line text-indigo-600"></i>
          周活跃统计
        </h3>
        <div className="h-32 flex items-end justify-between px-2 gap-2">
          {stats.chartData.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div 
                style={{ height: `${(h / maxPoint) * 100}%`, minHeight: h > 0 ? '4px' : '0' }} 
                className={`w-full rounded-full transition-all duration-700 ${i === 6 ? 'bg-indigo-600' : 'bg-indigo-200'}`}
              ></div>
              <span className={`text-[8px] font-bold ${i === 6 ? 'text-indigo-600' : 'text-slate-300'}`}>
                {['一','二','三','四','五','六','日'][i]}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const MenuCard: React.FC<{ to: string, title: string, desc: string, icon: string, color: string }> = ({ to, title, desc, icon, color }) => (
  <Link to={to} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-95">
    <div className={`w-10 h-10 ${color} rounded-2xl flex items-center justify-center mb-3`}>
      <i className={`fa-solid ${icon} text-lg`}></i>
    </div>
    <h4 className="font-bold text-sm mb-1">{title}</h4>
    <p className="text-[10px] text-slate-400 leading-tight font-medium">{desc}</p>
  </Link>
);
