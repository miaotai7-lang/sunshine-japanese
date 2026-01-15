
import React from 'react';
import { Link } from 'react-router-dom';

export const Home: React.FC = () => {
  return (
    <div className="space-y-8 animate-fadeIn">
      <section className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 overflow-hidden relative">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">你好，日语学习者！</h2>
          <p className="text-indigo-100 mb-6">今天是学习日语的好日子。</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
              <span className="text-3xl font-bold block">12</span>
              <span className="text-xs text-indigo-100">连续学习天数</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
              <span className="text-3xl font-bold block">45</span>
              <span className="text-xs text-indigo-100">今日习得单词</span>
            </div>
          </div>
        </div>
        <i className="fa-solid fa-sun absolute -right-4 -bottom-4 text-9xl text-white/5 rotate-12"></i>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">快速菜单</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <MenuCard 
            to="/learning" 
            title="新闻学习" 
            desc="阅读今日新闻" 
            icon="fa-newspaper" 
            color="bg-emerald-50 text-emerald-600" 
          />
          <MenuCard 
            to="/bible" 
            title="圣经名句" 
            desc="读经典学日语" 
            icon="fa-dove" 
            color="bg-purple-50 text-purple-600" 
          />
          <MenuCard 
            to="/practice" 
            title="每日练习" 
            desc="10道题测试" 
            icon="fa-bolt" 
            color="bg-amber-50 text-amber-600" 
          />
          <MenuCard 
            to="/collection" 
            title="复习收藏" 
            desc="巩固记忆" 
            icon="fa-repeat" 
            color="bg-rose-50 text-rose-600" 
          />
        </div>
      </section>

      <section className="bg-white rounded-2xl p-5 border border-slate-200">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <i className="fa-solid fa-chart-line text-indigo-600"></i>
          学习统计
        </h3>
        <div className="h-32 bg-slate-50 rounded-lg flex items-end justify-between px-4 pb-2 gap-1">
          {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
            <div 
              key={i} 
              style={{ height: `${h}%` }} 
              className={`w-full rounded-t-sm transition-all duration-500 ${i === 6 ? 'bg-indigo-500' : 'bg-indigo-200'}`}
            ></div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-medium px-2">
          <span>周一</span><span>周二</span><span>周三</span><span>周四</span><span>周五</span><span>周六</span><span>周日</span>
        </div>
      </section>
    </div>
  );
};

const MenuCard: React.FC<{ to: string, title: string, desc: string, icon: string, color: string }> = ({ to, title, desc, icon, color }) => (
  <Link to={to} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
      <i className={`fa-solid ${icon} text-lg`}></i>
    </div>
    <h4 className="font-bold text-sm mb-1">{title}</h4>
    <p className="text-[10px] text-slate-400 leading-tight">{desc}</p>
  </Link>
);
