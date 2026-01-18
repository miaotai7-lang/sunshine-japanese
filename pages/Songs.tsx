
import React, { useState, useEffect } from 'react';
import { fetchTopSongs, playTTS } from '../services/geminiService';
import { Song } from '../types';

export const Songs: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFurigana, setShowFurigana] = useState(true);
  const [expandedSong, setExpandedSong] = useState<string | null>(null);
  const [isReading, setIsReading] = useState<string | null>(null);

  useEffect(() => {
    const cached = JSON.parse(localStorage.getItem('cached_songs_list') || '[]');
    if (cached.length > 0) {
      setSongs(cached);
    }
  }, []);

  const loadSongs = async (isMore: boolean = false) => {
    if (isMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const data = await fetchTopSongs(isMore ? songs.length : 0);
      const updated = isMore ? [...songs, ...data] : data;
      setSongs(updated);
      localStorage.setItem('cached_songs_list', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    
    setLoading(false);
    setLoadingMore(false);
  };

  const handleRead = async (song: Song) => {
    setIsReading(song.id);
    await playTTS(song.lyrics);
    setIsReading(null);
  };

  return (
    <div className={`space-y-6 pb-24 animate-fadeIn ${showFurigana ? '' : 'hide-furigana'}`}>
      <header className="flex justify-between items-start px-1">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">日语赞美诗</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Global Worship Song Search</p>
        </div>
        <button onClick={() => setShowFurigana(!showFurigana)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showFurigana ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}>
          <i className="fa-solid fa-eye text-xs"></i>
        </button>
      </header>

      {songs.length === 0 && !loading && (
        <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
           <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-indigo-50 text-indigo-400">
              <i className="fa-solid fa-music text-2xl"></i>
           </div>
           <p className="text-slate-400 text-sm font-bold mb-6">点击下方按钮，AI 将在全网范围内<br/>搜索经典日文赞美诗</p>
           <button 
             onClick={() => loadSongs(false)}
             className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-xl active:scale-95"
           >
             开启全网 AI 检索 (2首)
           </button>
        </div>
      )}

      {(loading || loadingMore) && (
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 flex flex-col items-center gap-4 text-center">
           <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-indigo-600 font-black text-[10px] uppercase tracking-widest">Searching for spiritual melodies...</p>
        </div>
      )}

      <div className="grid gap-4">
        {songs.map((song) => (
          <div key={song.id} className={`bg-white rounded-[2.5rem] p-5 border border-slate-100 shadow-sm transition-all overflow-hidden ${expandedSong === song.id ? 'ring-2 ring-indigo-50' : ''}`}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black italic shrink-0">
                {song.rank}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 text-lg truncate">{song.title}</h3>
                <p className="text-xs text-slate-400 truncate">{song.artist}</p>
              </div>
              <button onClick={() => setExpandedSong(expandedSong === song.id ? null : song.id)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${expandedSong === song.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                <i className={`fa-solid ${expandedSong === song.id ? 'fa-minus' : 'fa-plus'}`}></i>
              </button>
            </div>

            {expandedSong === song.id && (
              <div className="mt-6 pt-6 border-t border-slate-50 space-y-6 animate-fadeIn">
                <div className="flex gap-2">
                  <a href={song.youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-rose-600 text-white py-3 rounded-2xl font-black text-[10px] text-center shadow-md active:scale-95 uppercase tracking-widest"><i className="fa-brands fa-youtube mr-2"></i>YouTube</a>
                  <button onClick={() => handleRead(song)} disabled={!!isReading} className="flex-1 bg-indigo-50 text-indigo-600 py-3 rounded-2xl font-black text-[10px] border border-indigo-100 active:scale-95 uppercase tracking-widest">
                    <i className={`fa-solid ${isReading === song.id ? 'fa-circle-notch animate-spin' : 'fa-headset'} mr-2`}></i>AI 导读
                  </button>
                </div>
                <div className="space-y-4">
                   <div className="Japanese-text text-lg text-slate-700 leading-[2.5] whitespace-pre-wrap bg-slate-50/50 p-6 rounded-3xl border border-slate-100" dangerouslySetInnerHTML={{ __html: song.lyrics }}></div>
                   <div className="text-slate-500 text-sm font-medium leading-[1.8] whitespace-pre-wrap bg-emerald-50/20 p-6 rounded-3xl border border-emerald-50/50">{song.translation}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {songs.length > 0 && !loadingMore && (
        <button onClick={() => loadSongs(true)} className="w-full bg-white border-2 border-indigo-100 text-indigo-600 font-black py-5 rounded-[2rem] shadow-sm active:scale-95">
          继续搜索 2 首歌曲
        </button>
      )}
    </div>
  );
};
