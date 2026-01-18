
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Article } from '../types';
import { playTTS } from '../services/geminiService';
import { getArticleById } from '../services/cacheService';
import { getLevelColor } from './Learning';

export const ArticleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [article, setArticle] = useState<Article | null>(location.state?.article || null);
  const [activeTab, setActiveTab] = useState<'content' | 'vocab' | 'grammar'>('content');
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (!article && id) {
      const cached = getArticleById(id);
      if (cached) setArticle(cached);
    }
  }, [id, article]);

  if (!article) return <div className="p-10 text-center animate-pulse text-slate-400 font-black">语料加载中...</div>;

  const handleTTS = async (text: string, id: string) => {
    setPlayingId(id);
    await playTTS(text);
    setTimeout(() => setPlayingId(null), 500);
  };

  return (
    <div className="pb-24 animate-fadeIn">
      {/* 顶部导航 */}
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-slate-50/90 backdrop-blur-md z-30 py-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 text-sm font-bold flex items-center gap-2">
          <i className="fa-solid fa-chevron-left"></i> 返回列表
        </button>
        <span className={`text-[10px] font-black px-3 py-1 rounded-xl ${getLevelColor(article.level)}`}>{article.level} 深度学习模式</span>
      </div>

      {/* 标题区 */}
      <header className="mb-8">
        <h2 className="text-2xl font-black leading-tight Japanese-text text-slate-800 mb-4" dangerouslySetInnerHTML={{ __html: article.title }}></h2>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 italic text-slate-500 text-sm leading-relaxed shadow-sm">
           <i className="fa-solid fa-quote-left mr-2 text-indigo-200"></i>
           {article.summary}
        </div>
      </header>

      {/* 选项卡 */}
      <nav className="flex gap-2 mb-8 p-1.5 bg-slate-200/50 rounded-3xl sticky top-14 z-20">
        {(['content', 'vocab', 'grammar'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 px-4 py-3 text-xs font-black rounded-2xl transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500'}`}>
            {tab === 'content' ? '原文逐句' : tab === 'vocab' ? '核心词汇' : '语法透析'}
          </button>
        ))}
      </nav>

      {/* 内容区域 */}
      <div className="space-y-6">
        {activeTab === 'content' && (
          <div className="space-y-4">
            {article.sentences?.map((sentence, i) => (
              <div key={i} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start gap-4">
                   <div className="flex-1">
                      <p className="Japanese-text text-lg text-slate-800 leading-[2.2]" dangerouslySetInnerHTML={{ __html: sentence }}></p>
                      <p className="mt-4 text-slate-400 text-sm font-medium border-t border-slate-50 pt-4 leading-relaxed">
                         {article.translations?.[i]}
                      </p>
                   </div>
                   <button 
                    onClick={() => handleTTS(sentence, `s-${i}`)} 
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all ${playingId === `s-${i}` ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-50 text-indigo-400'}`}
                   >
                     <i className={`fa-solid ${playingId === `s-${i}` ? 'fa-circle-notch fa-spin' : 'fa-volume-high'}`}></i>
                   </button>
                </div>
              </div>
            ))}
            {/* 完整原文预览按钮（可选） */}
            <div className="pt-8 border-t border-slate-200">
               <details className="group">
                  <summary className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest cursor-pointer list-none hover:text-indigo-400 transition-colors">
                     查看完整原文全文
                  </summary>
                  <div className="mt-6 p-8 bg-slate-100/50 rounded-[2.5rem] Japanese-text text-slate-600 leading-[2.5]" dangerouslySetInnerHTML={{ __html: article.content }}></div>
               </details>
            </div>
          </div>
        )}

        {activeTab === 'vocab' && (
          <div className="grid gap-4">
            {article.vocabulary?.map((v, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm group">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xl Japanese-text font-black text-slate-800" dangerouslySetInnerHTML={{ __html: v.word }}></span>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">[{v.reading}]</span>
                  </div>
                  <p className="text-sm text-slate-500 font-medium">{v.meaning}</p>
                </div>
                <button onClick={() => handleTTS(v.reading || v.word, `v-${i}`)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${playingId === `v-${i}` ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                   <i className={`fa-solid ${playingId === `v-${i}` ? 'fa-volume-high' : 'fa-volume-high'}`}></i>
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'grammar' && (
          <div className="space-y-6">
            {article.grammar?.map((g, i) => (
              <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h4 className="font-black text-indigo-600 text-xl mb-4">{g.point}</h4>
                <p className="text-slate-600 text-sm font-bold leading-relaxed mb-6 bg-slate-50 p-4 rounded-2xl">{g.explanation}</p>
                <div className="bg-indigo-50/30 p-6 rounded-3xl border border-indigo-50">
                   <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">例句用法</p>
                   <p className="Japanese-text text-slate-800 font-medium mb-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: g.example }}></p>
                   <button onClick={() => handleTTS(g.example, `g-${i}`)} className={`text-[10px] font-black flex items-center gap-2 transition-all uppercase ${playingId === `g-${i}` ? 'text-indigo-600' : 'text-indigo-400'}`}>
                     <i className="fa-solid fa-volume-high"></i> 朗读例句
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
