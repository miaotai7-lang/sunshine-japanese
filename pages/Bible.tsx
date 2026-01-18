
import React, { useState, useEffect } from 'react';
import { fetchBibleVerses } from '../services/geminiService';
import { getBibleCache } from '../services/cacheService';
import { BibleVerse } from '../types';
import { Link } from 'react-router-dom';

export const Bible: React.FC = () => {
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFurigana, setShowFurigana] = useState(true);

  useEffect(() => {
    const cached = getBibleCache();
    if (cached.length > 0) {
      setVerses(cached);
    } else {
      loadInitial();
    }
  }, []);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const data = await fetchBibleVerses();
      setVerses(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      // Fixed: fetchBibleVerses expects 0 arguments, removed excludeIds which was the 1st
      const more = await fetchBibleVerses();
      setVerses(prev => [...prev, ...more]);
    } catch (e) {
      console.error(e);
    }
    setLoadingMore(false);
  };

  return (
    <div className={`space-y-6 animate-fadeIn pb-24 ${showFurigana ? '' : 'hide-furigana'}`}>
      <header className="flex justify-between items-end px-1">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">圣经名句</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Spiritual Japanese Practice</p>
        </div>
        <button 
          onClick={() => setShowFurigana(!showFurigana)} 
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showFurigana ? 'bg-purple-600 text-white shadow-lg shadow-purple-100' : 'bg-slate-200 text-slate-600'}`}
        >
          <i className="fa-solid fa-eye text-xs"></i>
        </button>
      </header>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Searching Scriptures...</p>
        </div>
      )}

      <div className="space-y-4">
        {verses.map((verse, idx) => (
          <Link 
            key={verse.id || `v-${idx}`} 
            to={`/bible/${verse.id || idx}`} 
            state={{ verse }}
            className="block bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm hover:border-purple-200 transition-all group overflow-hidden"
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-black px-3 py-1 rounded-xl bg-purple-50 text-purple-600 border border-purple-100" dangerouslySetInnerHTML={{ __html: verse.reference }}></span>
              <i className="fa-solid fa-chevron-right text-slate-200 group-hover:text-purple-300 transition-colors"></i>
            </div>
            <p className="text-slate-800 font-bold mb-4 leading-relaxed Japanese-text" dangerouslySetInnerHTML={{ __html: verse.japaneseText }}></p>
            <p className="text-slate-400 text-xs italic border-t border-slate-50 pt-4">{verse.chineseTranslation}</p>
          </Link>
        ))}
      </div>

      {!loading && (
        <button 
          onClick={loadMore} 
          disabled={loadingMore} 
          className="w-full bg-white border-2 border-purple-100 text-purple-600 font-black py-5 rounded-[2rem] shadow-sm active:scale-95 flex items-center justify-center gap-2"
        >
          {loadingMore ? 'AI 正在同步...' : '再搜索 2 句名言'}
        </button>
      )}
    </div>
  );
};
