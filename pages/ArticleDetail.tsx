
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Article } from '../types';
import { playTTS } from '../services/geminiService';
import { getArticleById } from '../services/cacheService';
import { getLevelColor } from './Learning';
import { recordActivity } from '../services/statsService';

export const ArticleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [article, setArticle] = useState<Article | null>(location.state?.article || null);
  const [activeTab, setActiveTab] = useState<'content' | 'vocab' | 'grammar'>('content');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [starred, setStarred] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!article && id) {
      const cached = getArticleById(id);
      if (cached) setArticle(cached);
    }
    const collections = JSON.parse(localStorage.getItem('user_collection') || '[]');
    setStarred(new Set(collections.map((item: any) => item.id)));
  }, [id, article]);

  if (!article) return <div className="p-10 text-center text-slate-400 font-black">正在加载内容...</div>;

  const handleTTS = async (text: string, id: string) => {
    setPlayingId(id);
    await playTTS(text);
    setPlayingId(null);
  };

  const toggleStar = (item: any, type: string) => {
    const itemId = item.id || `custom-${Date.now()}`;
    const collections = JSON.parse(localStorage.getItem('user_collection') || '[]');
    let updated;
    
    if (starred.has(itemId)) {
      updated = collections.filter((i: any) => i.id !== itemId);
      starred.delete(itemId);
    } else {
      updated = [...collections, { 
        id: itemId, 
        type, 
        content: item, 
        addedAt: Date.now(), 
        nextReviewAt: Date.now() + 86400000, 
        reviewStage: 1 
      }];
      starred.add(itemId);
      recordActivity(5);
    }
    
    localStorage.setItem('user_collection', JSON.stringify(updated));
    setStarred(new Set(starred));
  };

  return (
    <div className="pb-24 animate-fadeIn">
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-slate-50/90 backdrop-blur-md z-30 py-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 text-sm font-bold flex items-center gap-2">
          <i className="fa-solid fa-chevron-left"></i> 返回
        </button>
        <div className="flex gap-2">
           <button onClick={() => toggleStar(article, 'article')} className={`${starred.has(article.id) ? 'text-amber-500' : 'text-slate-300'} transition-all`}>
              <i className="fa-solid fa-star text-lg"></i>
           </button>
           <span className={`text-[10px] font-black px-3 py-1.5 rounded-full ${getLevelColor(article.level)}`}>{article.level}</span>
        </div>
      </div>

      <header className="mb-8">
        <h2 className="text-2xl font-black leading-tight text-slate-800 mb-4">{article.title}</h2>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 italic text-slate-500 text-sm leading-relaxed">
           {article.summary}
        </div>
      </header>

      <nav className="flex gap-2 mb-8 p-1.5 bg-slate-200/50 rounded-3xl sticky top-14 z-20">
        {(['content', 'vocab', 'grammar'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 px-4 py-3 text-xs font-black rounded-2xl transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500'}`}>
            {tab === 'content' ? '阅读' : tab === 'vocab' ? '核心词' : '语法解析'}
          </button>
        ))}
      </nav>

      <div className="space-y-6">
        {activeTab === 'content' && (
          <div className="space-y-4">
            {article.sentences?.map((sentence, i) => (
              <div key={i} className={`bg-white rounded-[2rem] p-6 border transition-all ${playingId === `s-${i}` ? 'border-indigo-500 shadow-lg' : 'border-slate-100 shadow-sm'}`}>
                <div className="flex justify-between items-start gap-4">
                   <div className="flex-1">
                      <p className="text-lg text-slate-800 leading-relaxed font-medium">{sentence}</p>
                      <p className="mt-4 text-slate-400 text-sm font-medium border-t border-slate-50 pt-4">
                         {article.translations?.[i]}
                      </p>
                   </div>
                   <button onClick={() => handleTTS(sentence, `s-${i}`)} className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${playingId === `s-${i}` ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-400'}`}>
                     <i className={`fa-solid ${playingId === `s-${i}` ? 'fa-circle-notch fa-spin' : 'fa-volume-high'}`}></i>
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'vocab' && (
          <div className="grid gap-4">
            {article.vocabulary && article.vocabulary.length > 0 ? article.vocabulary.map((v, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm group">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xl font-black text-slate-800">{v.word}</span>
                    <span className="text-[10px] font-black text-indigo-400 uppercase">[{v.reading}]</span>
                  </div>
                  <p className="text-sm text-slate-500 font-medium">{v.meaning}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleStar(v, 'word')} className={`${starred.has(v.id || v.word) ? 'text-amber-500' : 'text-slate-300'}`}>
                    <i className="fa-solid fa-star"></i>
                  </button>
                  <button onClick={() => handleTTS(v.reading || v.word, `v-${i}`)} className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600">
                     <i className="fa-solid fa-volume-high"></i>
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 text-slate-400 italic">正在生成核心词...</div>
            )}
          </div>
        )}

        {activeTab === 'grammar' && (
          <div className="grid gap-4">
            {article.grammar && article.grammar.length > 0 ? article.grammar.map((g, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-black text-indigo-600 text-lg">{g.point}</h4>
                  <button onClick={() => toggleStar(g, 'grammar')} className={`${starred.has(g.id || g.point) ? 'text-amber-500' : 'text-slate-300'}`}>
                    <i className="fa-solid fa-star"></i>
                  </button>
                </div>
                <p className="text-sm text-slate-600 mb-4 font-bold">{g.explanation}</p>
                <div className="bg-slate-50 p-4 rounded-2xl border-l-4 border-indigo-200">
                   <p className="text-xs text-slate-500 italic mb-1 uppercase tracking-tighter">Example:</p>
                   <p className="text-sm text-slate-800 leading-relaxed font-medium">{g.example}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 text-slate-400 italic">正在进行语法拆解...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
