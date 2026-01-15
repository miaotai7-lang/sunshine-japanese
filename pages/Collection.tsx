
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CollectionItem } from '../types';
import { playTTS } from '../services/geminiService';

export const Collection: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [activeType, setActiveType] = useState<'all' | 'due' | 'mistakes'>('all');

  useEffect(() => {
    refreshData();
  }, [activeType]);

  const refreshData = () => {
    if (activeType === 'mistakes') {
      const mistakes = JSON.parse(localStorage.getItem('user_mistakes') || '[]');
      setItems(mistakes.map((m: any, idx: number) => ({
        id: `m-${idx}`,
        type: 'sentence',
        content: m,
        addedAt: Date.now(),
        nextReviewAt: 0,
        reviewStage: 0
      })));
    } else {
      const data = JSON.parse(localStorage.getItem('user_collection') || '[]');
      if (activeType === 'due') {
        setItems(data.filter((item: any) => item.nextReviewAt < Date.now()));
      } else {
        setItems(data);
      }
    }
  };

  const removeItem = (id: string) => {
    const data = JSON.parse(localStorage.getItem('user_collection') || '[]');
    const updated = data.filter((item: any) => item.id !== id);
    localStorage.setItem('user_collection', JSON.stringify(updated));
    refreshData();
  };

  const getStageColor = (stage: number) => {
    if (stage >= 5) return 'bg-emerald-500';
    if (stage >= 3) return 'bg-indigo-500';
    return 'bg-amber-500';
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">复习中心</h2>
          <p className="text-slate-500 text-sm italic tracking-tight">AI 艾宾浩斯记忆追踪系统</p>
        </div>
        <button 
          onClick={() => navigate('/practice', { state: { mode: activeType === 'mistakes' ? 'mistakes' : 'collection' } })}
          disabled={items.length === 0}
          className="bg-indigo-600 text-white text-xs font-black px-5 py-2.5 rounded-full shadow-lg shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
        >
          开始专项突破
        </button>
      </header>

      <div className="flex bg-slate-100 p-1.5 rounded-2xl">
        {(['all', 'due', 'mistakes'] as const).map(type => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
              activeType === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
            }`}
          >
            {type === 'all' ? '全部' : type === 'due' ? '待复习' : '错题库'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {items.length > 0 ? items.map((item) => (
          <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative group overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                 <span className="text-[9px] font-black px-2 py-0.5 rounded bg-indigo-50 text-indigo-500 uppercase">{item.type}</span>
                 {item.reviewStage > 0 && (
                   <div className="flex gap-0.5">
                     {Array.from({ length: 5 }).map((_, i) => (
                       <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < item.reviewStage ? getStageColor(item.reviewStage) : 'bg-slate-100'}`}></div>
                     ))}
                   </div>
                 )}
              </div>
              <button onClick={() => removeItem(item.id)} className="text-slate-200 hover:text-rose-500 transition-colors">
                <i className="fa-solid fa-circle-xmark"></i>
              </button>
            </div>
            <div className="pr-10">
              <p className="text-slate-800 font-bold Japanese-text leading-relaxed" dangerouslySetInnerHTML={{ __html: item.content.japaneseText || item.content.word || item.content.question || item.content }}></p>
              {item.content.meaning && <p className="text-sm text-slate-500 mt-2 font-medium">{item.content.meaning}</p>}
            </div>
            <button 
              onClick={() => playTTS(item.content.japaneseText || item.content.word || item.content.question || item.content)} 
              className="absolute right-4 bottom-4 w-10 h-10 rounded-2xl bg-slate-50 text-indigo-500 flex items-center justify-center hover:bg-indigo-50 transition-colors"
            >
              <i className="fa-solid fa-volume-high"></i>
            </button>
          </div>
        )) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
               <i className="fa-solid fa-wind text-slate-200 text-2xl"></i>
            </div>
            <p className="text-slate-400 text-sm font-bold">暂无相关内容，快去学习并收藏吧！</p>
          </div>
        )}
      </div>
    </div>
  );
};
