import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CollectionItem, TextSegment } from '../types';
import { playTTS, segmentsToText } from '../services/geminiService';
import { getCollection } from '../services/collectionService';

export const Collection: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [activeType, setActiveType] = useState<'all' | 'word' | 'grammar' | 'sentence' | 'verse' | 'mistakes'>('all');

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
      const data = getCollection();
      if (activeType === 'all') {
        setItems(data);
      } else {
        setItems(data.filter((item) => item.type === activeType));
      }
    }
  };

  const removeItem = (id: string) => {
    const data = getCollection();
    const updated = data.filter((item: any) => item.id !== id);
    localStorage.setItem('user_collection', JSON.stringify(updated));
    refreshData();
  };

  const renderSegments = (segments: TextSegment[]) => {
    return (segments || []).map((seg, idx) => (
      <ruby key={idx}>
        {seg.t}
        {seg.r && <rt>{seg.r}</rt>}
      </ruby>
    ));
  };

  const getStageColor = (stage: number) => {
    if (stage >= 5) return 'bg-emerald-500';
    if (stage >= 3) return 'bg-indigo-500';
    return 'bg-amber-500';
  };

  const handlePlay = (item: CollectionItem) => {
    const content = item.content;
    if (content.segments) playTTS(segmentsToText(content.segments));
    else if (content.japaneseSegments) playTTS(segmentsToText(content.japaneseSegments));
    else playTTS(content.word || content.japaneseText || content.question || content.point || content);
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800">复习中心</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Ebbinghaus Memory System</p>
        </div>
        <button 
          onClick={() => navigate('/practice', { state: { mode: activeType === 'mistakes' ? 'mistakes' : 'collection' } })}
          disabled={items.length === 0}
          className="bg-indigo-600 text-white text-[10px] font-black px-6 py-2.5 rounded-full shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50 uppercase tracking-widest"
        >
          专项挑战
        </button>
      </header>

      <div className="flex bg-slate-200/50 p-1 rounded-2xl overflow-x-auto gap-1 no-scrollbar">
        {(['all', 'word', 'grammar', 'sentence', 'verse', 'mistakes'] as const).map(type => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`flex-none px-4 py-2 text-[9px] font-black rounded-xl transition-all uppercase tracking-tighter ${
              activeType === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
            }`}
          >
            {type === 'all' ? '全部' : type === 'word' ? '单词' : type === 'grammar' ? '语法' : type === 'sentence' ? '句子' : type === 'verse' ? '金句' : '错题'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {items.length > 0 ? items.map((item) => (
          <div key={item.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative group overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                 <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${
                   item.type === 'word' ? 'bg-indigo-50 text-indigo-500' :
                   item.type === 'grammar' ? 'bg-amber-50 text-amber-600' :
                   item.type === 'verse' ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'
                 }`}>{item.type}</span>
                 {item.reviewStage > 0 && (
                   <div className="flex gap-1">
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
            
            <div className="pr-12">
              <div className="Japanese-text text-lg font-bold text-slate-800 leading-relaxed mb-3">
                {item.content.segments ? renderSegments(item.content.segments) : 
                 item.content.japaneseSegments ? renderSegments(item.content.japaneseSegments) :
                 (item.content.word || item.content.japaneseText || item.content.point || item.content.question || item.content)}
              </div>
              <p className="text-slate-400 text-xs font-medium border-t border-slate-50 pt-3">
                {item.content.meaning || item.content.chineseTranslation || item.content.explanation || item.content.translation}
              </p>
            </div>
            
            <button 
              onClick={() => handlePlay(item)} 
              className="absolute right-6 bottom-6 w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm active:scale-90"
            >
              <i className="fa-solid fa-volume-high"></i>
            </button>
          </div>
        )) : (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
               <i className="fa-solid fa-wind text-slate-200 text-2xl"></i>
            </div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Nothing here yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};
