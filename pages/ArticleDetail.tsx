
import React, { useState, useEffect, useRef } from 'react';
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
  const [isShadowing, setIsShadowing] = useState(false);
  const shadowingRef = useRef(false);

  useEffect(() => {
    if (!article && id) {
      const cached = getArticleById(id);
      if (cached) setArticle(cached);
    }
    return () => {
      shadowingRef.current = false;
      window.speechSynthesis.cancel();
    };
  }, [id, article]);

  if (!article) return <div className="p-10 text-center animate-pulse text-slate-400 font-black">语料加载中...</div>;

  const handleTTS = async (text: string, id: string) => {
    setPlayingId(id);
    await playTTS(text);
    setPlayingId(null);
  };

  /**
   * 影子跟读核心逻辑
   */
  const startShadowing = async () => {
    if (isShadowing) {
      setIsShadowing(false);
      shadowingRef.current = false;
      window.speechSynthesis.cancel();
      setPlayingId(null);
      return;
    }

    setIsShadowing(true);
    shadowingRef.current = true;

    for (let i = 0; i < article.sentences.length; i++) {
      if (!shadowingRef.current) break;
      
      const sentence = article.sentences[i];
      setPlayingId(`s-${i}`);
      
      // 1. AI 示范 (语速稍慢)
      await playTTS(sentence, 0.8);
      
      if (shadowingRef.current) {
        // 2. 状态切换到“请跟读”高亮
        setPlayingId(`shadowing-${i}`);
        // 根据句子长度留出跟读时间 (字数 * 200ms + 1s 宽限)
        const cleanLen = sentence.replace(/<[^>]*>?/gm, '').length;
        const pauseTime = Math.max(2000, cleanLen * 250); 
        await new Promise(resolve => setTimeout(resolve, pauseTime));
      }
    }
    
    setIsShadowing(false);
    shadowingRef.current = false;
    setPlayingId(null);
  };

  return (
    <div className="pb-24 animate-fadeIn">
      {/* 浮动控制栏 */}
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-slate-50/90 backdrop-blur-md z-30 py-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 text-sm font-bold flex items-center gap-2">
          <i className="fa-solid fa-chevron-left"></i> 返回
        </button>
        <div className="flex gap-2">
           <button 
             onClick={startShadowing}
             className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all flex items-center gap-2 ${isShadowing ? 'bg-rose-500 text-white shadow-lg animate-pulse' : 'bg-indigo-100 text-indigo-600'}`}
           >
             <i className={`fa-solid ${isShadowing ? 'fa-stop' : 'fa-headset'}`}></i>
             {isShadowing ? '停止跟读' : '开启影子跟读'}
           </button>
           <span className={`text-[10px] font-black px-3 py-1.5 rounded-full ${getLevelColor(article.level)}`}>{article.level}</span>
        </div>
      </div>

      <header className="mb-8">
        <h2 className="text-2xl font-black leading-tight Japanese-text text-slate-800 mb-4" dangerouslySetInnerHTML={{ __html: article.title }}></h2>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 italic text-slate-500 text-sm leading-relaxed shadow-sm">
           <i className="fa-solid fa-quote-left mr-2 text-indigo-200"></i>
           {article.summary}
        </div>
      </header>

      <nav className="flex gap-2 mb-8 p-1.5 bg-slate-200/50 rounded-3xl sticky top-14 z-20">
        {(['content', 'vocab', 'grammar'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 px-4 py-3 text-xs font-black rounded-2xl transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500'}`}>
            {tab === 'content' ? '阅读' : tab === 'vocab' ? '核心词' : '语法'}
          </button>
        ))}
      </nav>

      <div className="space-y-6">
        {activeTab === 'content' && (
          <div className="space-y-4">
            {article.sentences?.map((sentence, i) => (
              <div 
                key={i} 
                className={`bg-white rounded-[2rem] p-6 border transition-all ${
                  playingId === `s-${i}` ? 'border-indigo-500 shadow-lg ring-2 ring-indigo-50' : 
                  playingId === `shadowing-${i}` ? 'border-rose-400 bg-rose-50 shadow-md' : 
                  'border-slate-100 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                   <div className="flex-1">
                      <p className="Japanese-text text-lg text-slate-800 leading-[2.2]" dangerouslySetInnerHTML={{ __html: sentence }}></p>
                      <p className="mt-4 text-slate-400 text-sm font-medium border-t border-slate-50 pt-4 leading-relaxed">
                         {article.translations?.[i]}
                      </p>
                      {playingId === `shadowing-${i}` && (
                        <div className="mt-3 flex items-center gap-2 text-rose-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                          <i className="fa-solid fa-microphone"></i> 请现在模仿跟读...
                        </div>
                      )}
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
                   <i className="fa-solid fa-volume-high"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
