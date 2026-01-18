import React, { useState, useEffect } from 'react';
import { fetchTopSongs, playTTS, segmentsToText } from '../services/geminiService';
import { Song, TextSegment } from '../types';

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
      alert('探测失败，AI 无法在公网找到合适的视频资源，请重试');
    }
    
    setLoading(false);
    setLoadingMore(false);
  };

  const handleRead = async (song: Song) => {
    setIsReading(song.id);
    const fullText = song.lyricsSegments.map(line => segmentsToText(line)).join('\n');
    await playTTS(fullText);
    setIsReading(null);
  };

  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return null;
    try {
      // 兼容多种链接格式
      let vid = '';
      if (url.includes('youtu.be/')) {
        vid = url.split('youtu.be/')[1].split('?')[0];
      } else if (url.includes('v=')) {
        vid = url.split('v=')[1].split('&')[0];
      } else if (url.includes('embed/')) {
        vid = url.split('embed/')[1].split('?')[0];
      }
      return vid ? `https://www.youtube.com/embed/${vid}` : null;
    } catch (e) { return null; }
  };

  const renderSegments = (segments: TextSegment[]) => {
    return (segments || []).map((seg, idx) => (
      <ruby key={idx}>
        {seg.t}
        {seg.r && <rt>{seg.r}</rt>}
      </ruby>
    ));
  };

  return (
    <div className={`space-y-6 pb-24 animate-fadeIn px-1 ${!showFurigana ? 'hide-readings' : ''}`}>
      <header className="flex justify-between items-start px-1">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">AI 音乐发现</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Explore Japanese Melodies</p>
        </div>
        <button onClick={() => setShowFurigana(!showFurigana)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showFurigana ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}>
          <i className="fa-solid fa-eye text-xs"></i>
        </button>
      </header>

      {songs.length === 0 && !loading && (
        <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-slate-200 mx-1">
           <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-rose-50 text-rose-400">
              <i className="fa-solid fa-compact-disc fa-spin-slow text-2xl"></i>
           </div>
           <p className="text-slate-400 text-sm font-bold mb-6">点击下方按钮，AI 将探测全网<br/>优质日语学习曲目与歌词</p>
           <button onClick={() => loadSongs(false)} className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black text-xs shadow-xl active:scale-95">开启 AI 全网搜索</button>
        </div>
      )}

      {(loading || loadingMore) && (
        <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 flex flex-col items-center gap-4 text-center shadow-sm mx-1">
           <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-rose-600 font-black text-[10px] uppercase tracking-widest">Searching World Wide Web...</p>
        </div>
      )}

      <div className="grid gap-4">
        {songs.map((song) => {
          const embedUrl = getYoutubeEmbedUrl(song.youtubeUrl);
          return (
            <div key={song.id} className={`bg-white rounded-[2.5rem] p-5 border border-slate-100 shadow-sm transition-all overflow-hidden mx-1 ${expandedSong === song.id ? 'ring-2 ring-indigo-50' : ''}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
                  <i className="fa-brands fa-youtube text-xl"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-800 text-md truncate">{song.title}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate">{song.artist}</p>
                </div>
                <button onClick={() => setExpandedSong(expandedSong === song.id ? null : song.id)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${expandedSong === song.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                  <i className={`fa-solid ${expandedSong === song.id ? 'fa-minus' : 'fa-plus'}`}></i>
                </button>
              </div>

              {expandedSong === song.id && (
                <div className="mt-6 pt-6 border-t border-slate-50 space-y-6 animate-fadeIn">
                  {embedUrl ? (
                    <div className="aspect-video rounded-3xl overflow-hidden shadow-inner bg-black">
                       <iframe 
                        className="w-full h-full"
                        src={embedUrl}
                        title={song.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                       ></iframe>
                    </div>
                  ) : (
                    <div className="bg-rose-50 p-6 rounded-3xl text-center">
                       <p className="text-rose-600 text-[10px] font-black uppercase mb-4">Video Restricted by YouTube</p>
                       <a href={song.youtubeUrl} target="_blank" rel="noopener noreferrer" className="inline-block bg-rose-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-100">跳转浏览器播放</a>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => handleRead(song)} disabled={!!isReading} className="flex-1 bg-indigo-50 text-indigo-600 py-4 rounded-2xl font-black text-[10px] border border-indigo-100 active:scale-95 uppercase tracking-widest">
                      <i className={`fa-solid ${isReading === song.id ? 'fa-circle-notch animate-spin' : 'fa-headset'} mr-2`}></i>AI 逐句跟读
                    </button>
                    <a href={song.youtubeUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center active:scale-95">
                      <i className="fa-solid fa-external-link text-xs"></i>
                    </a>
                  </div>

                  <div className="space-y-4">
                     <div className="Japanese-text text-lg text-slate-700 leading-[2.5] bg-slate-50/50 p-6 rounded-3xl border border-slate-100 shadow-inner">
                       {song.lyricsSegments.map((line, idx) => (
                         <div key={idx} className="mb-2">{renderSegments(line)}</div>
                       ))}
                     </div>
                     <div className="text-slate-500 text-xs font-medium leading-relaxed whitespace-pre-wrap bg-emerald-50/20 p-6 rounded-3xl border border-emerald-50/50 italic">
                        <span className="block text-[10px] font-black text-emerald-600 uppercase mb-2 tracking-widest">Translation</span>
                        {song.translation}
                     </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {songs.length > 0 && !loadingMore && (
        <button onClick={() => loadSongs(true)} className="w-full bg-white border-2 border-indigo-100 text-indigo-600 font-black py-5 rounded-[2.5rem] shadow-sm active:scale-95 mx-1">
          继续探测更多歌曲
        </button>
      )}
    </div>
  );
};
