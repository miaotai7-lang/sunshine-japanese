
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

  /**
   * 使用本地 TTS 发音
   */
  const handleTTS = async (text: string, id: string) => {
    // 本地 TTS 非常快，为了给用户视觉反馈，可以保留极短的激活状态
    setPlayingId(id);
    await playTTS(text);
    // 播放开始后延迟一小会儿取消高亮
    setTimeout(() => setPlayingId(null), 500);
  };

  return (
    <div className="pb-24 animate-fadeIn">
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-slate-50/90 backdrop-blur-md z-20 py-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 text-sm font-bold flex items-center gap-2">
          <i className="fa-solid fa-chevron-left"></i> 返回
        </button>
        <span className={`text-[10px] font-black px-3 py-1 rounded-xl ${getLevelColor(article.level)}`}>{article.level} 深度解析</span>
      </div>

      <header className="mb-8">
        <h2 className="text-2xl font-black leading-tight Japanese-text text-slate-800 mb-4" dangerouslySetInnerHTML={{ __html: article.title }}></h2>
        <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100/50 italic text-indigo-700 text-sm leading-relaxed">
           {article.summary}
        </div>
      </header>

      <nav className="flex gap-2 mb-8 p-1.5 bg-slate-200/50 rounded-3xl sticky top-14 z-20">
        {(['content', 'vocab', 'grammar'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 px-4 py-3 text-xs font-black rounded-2xl transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500'}`}>
            {tab === 'content' ? '原文拆解' : tab === 'vocab' ? '核心词汇' : '语法透析'}
          </button>
        ))}
      </nav>

      <div className="space-y-8">
        {activeTab === 'content' && (
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm leading-[2.5]">
             <div className="Japanese-text text-lg text-slate-800 space-y-8" dangerouslySetInnerHTML={{ __html: article.content }}></div>
             <div className="mt-12 pt-8 border-t border-slate-50">
               <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-6">句子级详析</h4>
               <div className="space-y-8">
                 {article.sentences?.map((s, i) => (
                   <div key={i} className="group">
                     <div className="flex justify-between items-start gap-4 mb-2">
                        <p className="Japanese-text text-slate-700 font-medium" dangerouslySetInnerHTML={{ __html: s }}></p>
                        <button onClick={() => handleTTS(s, `s-${i}`)} className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${playingId === `s-${i}` ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-300 hover:text-indigo-600'}`}>
                          <i className={`fa-solid ${playingId === `s-${i}` ? 'fa-volume-high animate-pulse' : 'fa-volume-high'} text-xs`}></i>
                        </button>
                     </div>
                     <p className="text-slate-400 text-xs font-bold pl-4 border-l-2 border-slate-100">{article.translations?.[i]}</p>
                   </div>
                 ))}
               </div>
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
                {/* 重点词汇发音：优先读假名字段以保证 100% 准确 */}
                <button onClick={() => handleTTS(v.reading || v.word, `v-${i}`)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${playingId === `v-${i}` ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                   <i className={`fa-solid ${playingId === `v-${i}` ? 'fa-volume-high animate-pulse' : 'fa-volume-high'}`}></i>
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'grammar' && (
          <div className="space-y-6">
            {article.grammar?.map((g, i) => (
              <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5"><i className="fa-solid fa-feather text-6xl"></i></div>
                <h4 className="font-black text-indigo-600 text-xl mb-4 relative z-10">{g.point}</h4>
                <p className="text-slate-600 text-sm font-bold leading-relaxed mb-6 bg-slate-50 p-4 rounded-2xl">{g.explanation}</p>
                <div className="bg-indigo-50/30 p-6 rounded-3xl border border-indigo-50">
                   <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">Example</p>
                   <p className="Japanese-text text-slate-800 font-medium mb-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: g.example }}></p>
                   <button onClick={() => handleTTS(g.example, `g-${i}`)} className={`text-[10px] font-black flex items-center gap-2 transition-all uppercase ${playingId === `g-${i}` ? 'text-indigo-600 scale-105' : 'text-indigo-400'}`}>
                     <i className={`fa-solid ${playingId === `g-${i}` ? 'fa-volume-high animate-pulse' : 'fa-volume-high'}`}></i> 朗读例句
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
