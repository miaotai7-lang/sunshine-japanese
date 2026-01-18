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
      alert('搜索失败，AI 可能暂时无法访问 YouTube');
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
    try {
      const urlObj = new URL(url);
      let vid = '';
      if (urlObj.hostname === 'youtu.be') vid = urlObj.pathname.slice(1);
      else vid = urlObj.searchParams.get('v') || '';
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
    <div className={`space-y-6 pb-24 animate-fadeIn ${!showFurigana ? 'hide-readings' : ''}`}>
      <header className="flex justify-between items-start px-1">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">赞美之泉专栏</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Stream of Praise Official</p>
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
           <p className="text-slate-400 text-sm font-bold mb-6">点击下方按钮，AI 将精准检索<br/>“赞美之泉”官方日语版歌曲</p>
           <button onClick={() => loadSongs(false)} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-xl active:scale-95">开始同步歌曲 (2首)</button>
        </div>
      )}

      {(loading || loadingMore) && (
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 flex flex-col items-center gap-4 text-center shadow-sm">
           <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-indigo-600 font-black text-[10px] uppercase tracking-widest">Searching official media...</p>
        </div>
      )}

      <div className="grid gap-4">
        {songs.map((song) => {
          const embedUrl = getYoutubeEmbedUrl(song.youtubeUrl);
          return (
            <div key={song.id} className={`bg-white rounded-[2.5rem] p-5 border border-slate-100 shadow-sm transition-all overflow-hidden ${expandedSong === song.id ? 'ring-2 ring-indigo-50' : ''}`}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
                  <i className="fa-brands fa-youtube text-lg"></i>
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
                       <p className="text-rose-600 text-xs font-bold mb-4">视频链接无效或不支持在此播放</p>
                       <a href={song.youtubeUrl} target="_blank" rel="noopener noreferrer" className="inline-block bg-rose-600 text-white px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest">跳转浏览器播放</a>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => handleRead(song)} disabled={!!isReading} className="flex-1 bg-indigo-50 text-indigo-600 py-3.5 rounded-2xl font-black text-[10px] border border-indigo-100 active:scale-95 uppercase tracking-widest">
                      <i className={`fa-solid ${isReading === song.id ? 'fa-circle-notch animate-spin' : 'fa-headset'} mr-2`}></i>AI 逐词朗读
                    </button>
                    <a href={song.youtubeUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center active:scale-95">
                      <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                    </a>
                  </div>

                  <div className="space-y-4">
                     <div className="Japanese-text text-lg text-slate-700 leading-[2.5] bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                       {song.lyricsSegments.map((line, idx) => (
                         <div key={idx} className="mb-2">{renderSegments(line)}</div>
                       ))}
                     </div>
                     <div className="text-slate-500 text-sm font-medium leading-[1.8] whitespace-pre-wrap bg-emerald-50/20 p-6 rounded-3xl border border-emerald-50/50">{song.translation}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {songs.length > 0 && !loadingMore && (
        <button onClick={() => loadSongs(true)} className="w-full bg-white border-2 border-indigo-100 text-indigo-600 font-black py-5 rounded-[2rem] shadow-sm active:scale-95">加载更多歌曲</button>
      )}
    </div>
  );
};
