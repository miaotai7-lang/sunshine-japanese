
import React, { useState, useEffect } from 'react';
import { fetchTopSongs, playTTS } from '../services/geminiService';
import { Song } from '../types';

export const Songs: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFurigana, setShowFurigana] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [expandedSong, setExpandedSong] = useState<string | null>(null);
  const [isReading, setIsReading] = useState<string | null>(null);

  const loadSongs = async (isMore: boolean = false) => {
    if (isMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const data = await fetchTopSongs(isMore ? songs.length : 0);
      setSongs(prev => isMore ? [...prev, ...data] : data);
    } catch (e) {
      console.error(e);
    }
    
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('cached_songs') || '[]');
    setCachedIds(new Set(saved.map((s: any) => s.id)));
    
    if (saved.length > 0) {
      setSongs(saved);
      setLoading(false);
    } else {
      loadSongs();
    }
  }, []);

  const toggleCache = (song: Song) => {
    const saved = JSON.parse(localStorage.getItem('cached_songs') || '[]');
    let nextSaved;
    if (cachedIds.has(song.id)) {
      nextSaved = saved.filter((s: any) => s.id !== song.id);
      setCachedIds(prev => { const n = new Set(prev); n.delete(song.id); return n; });
    } else {
      nextSaved = [...saved, song];
      setCachedIds(prev => new Set(prev).add(song.id));
    }
    localStorage.setItem('cached_songs', JSON.stringify(nextSaved));
  };

  const handleRead = async (song: Song) => {
    setIsReading(song.id);
    await playTTS(song.lyrics);
    setIsReading(null);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500 font-medium">正在从 Hallelujah 频道加载 10 首圣歌...</p>
    </div>
  );

  return (
    <div className={`space-y-6 pb-24 animate-fadeIn ${showFurigana ? '' : 'hide-furigana'}`}>
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">日语赞美诗</h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
             Source: <span className="text-indigo-600">sanbikashi.net/hallelujah</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFurigana(!showFurigana)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showFurigana ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}>
            <i className="fa-solid fa-eye text-xs"></i>
          </button>
        </div>
      </header>

      <div className="grid gap-4">
        {songs.map((song) => (
          <div key={song.id} className={`bg-white rounded-3xl p-5 border border-slate-100 shadow-sm transition-all overflow-hidden ${expandedSong === song.id ? 'ring-2 ring-indigo-50 shadow-md' : ''}`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black italic shrink-0">
                {song.rank}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 text-lg truncate">{song.title}</h3>
                <p className="text-sm text-slate-400 truncate">{song.artist || 'Hallelujah Channel'}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleCache(song)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${cachedIds.has(song.id) ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-300'}`}>
                  <i className="fa-solid fa-download text-xs"></i>
                </button>
                <button onClick={() => setExpandedSong(expandedSong === song.id ? null : song.id)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${expandedSong === song.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <i className={`fa-solid ${expandedSong === song.id ? 'fa-minus' : 'fa-plus'}`}></i>
                </button>
              </div>
            </div>

            {expandedSong === song.id && (
              <div className="mt-6 pt-6 border-t border-slate-50 space-y-6 animate-fadeIn">
                <div className="flex gap-2">
                  <a href={song.youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-rose-600 text-white py-3 rounded-2xl font-bold text-xs text-center shadow-lg active:scale-95 transition-all"><i className="fa-brands fa-youtube mr-2"></i>YouTube</a>
                  <button onClick={() => handleRead(song)} disabled={!!isReading} className="flex-1 bg-indigo-50 text-indigo-600 py-3 rounded-2xl font-bold text-xs border border-indigo-100 active:scale-95 transition-all">
                    <i className={`fa-solid ${isReading === song.id ? 'fa-circle-notch animate-spin' : 'fa-headset'} mr-2`}></i>AI 教读
                  </button>
                </div>
                <div className="space-y-4">
                   <div className="Japanese-text text-lg text-slate-700 leading-[2.5] whitespace-pre-wrap bg-slate-50/50 p-6 rounded-3xl border border-slate-100" dangerouslySetInnerHTML={{ __html: song.lyrics }}></div>
                   {showTranslation && <div className="text-slate-500 text-sm font-medium leading-[1.8] whitespace-pre-wrap bg-emerald-50/20 p-6 rounded-3xl border border-emerald-50/50">{song.translation}</div>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={() => loadSongs(true)} disabled={loadingMore} className="w-full bg-white border-2 border-indigo-100 text-indigo-600 font-black py-5 rounded-3xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 active:scale-95">
        {loadingMore ? '正在加载...' : '获取后续 10 首圣歌'}
      </button>
    </div>
  );
};
