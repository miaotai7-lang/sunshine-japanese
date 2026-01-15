
import React, { useState, useEffect } from 'react';
import { fetchBibleVerses } from '../services/geminiService';
import { getBibleCache } from '../services/cacheService';
import { BibleVerse } from '../types';
import { Link } from 'react-router-dom';

export const Bible: React.FC = () => {
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFurigana, setShowFurigana] = useState(true);

  useEffect(() => {
    const loadInitialVerses = async () => {
      setLoading(true);
      const cached = getBibleCache();
      if (cached.length >= 10) {
        setVerses(cached);
        setLoading(false);
      } else {
        const data = await fetchBibleVerses();
        setVerses(data);
        setLoading(false);
      }
    };
    loadInitialVerses();
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    const excludeIds = verses.map(v => v.id);
    const more = await fetchBibleVerses(excludeIds);
    setVerses(prev => [...prev, ...more]);
    setLoadingMore(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">正在载入圣言...</p>
      </div>
    );
  }

  const validVerses = verses.filter(v => v && v.japaneseText && v.japaneseText.trim().length > 0);

  return (
    <div className={`space-y-6 animate-fadeIn pb-24 ${showFurigana ? '' : 'hide-furigana'}`}>
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold">圣经名句</h2>
          <p className="text-slate-500 text-sm italic">读经学日语，领受智慧</p>
        </div>
        <button 
          onClick={() => setShowFurigana(!showFurigana)} 
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showFurigana ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-200 text-slate-600'}`}
        >
          <i className={`fa-solid ${showFurigana ? 'fa-eye' : 'fa-eye-slash'} text-xs`}></i>
        </button>
      </header>

      <div className="space-y-4">
        {validVerses.map((verse, idx) => (
          <Link 
            key={verse.id || `v-${idx}`} 
            to={`/bible/${verse.id || idx}`} 
            state={{ verse }}
            className="block bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:border-purple-200 transition-all hover:shadow-md group relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-3">
              <span 
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100"
                dangerouslySetInnerHTML={{ __html: verse.reference }}
              ></span>
              <i className="fa-solid fa-chevron-right text-slate-300 group-hover:text-purple-400 transition-colors"></i>
            </div>
            <p 
              className="text-slate-800 font-medium mb-3 leading-relaxed Japanese-text"
              dangerouslySetInnerHTML={{ __html: verse.japaneseText }}
            ></p>
            <p className="text-slate-400 text-xs italic border-t border-slate-50 pt-3 mt-1">
              {verse.chineseTranslation}
            </p>
          </Link>
        ))}
      </div>

      <div className="pt-4">
        <button onClick={loadMore} disabled={loadingMore} className="w-full bg-white border-2 border-purple-100 text-purple-600 font-bold py-4 rounded-3xl shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2">
          {loadingMore ? '正在同步...' : '获取更多金句'}
        </button>
      </div>
    </div>
  );
};
