import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { BibleVerse, TextSegment } from '../types';
import { playTTS, segmentsToText } from '../services/geminiService';
import { getBibleVerseById } from '../services/cacheService';
import { toggleCollection, isCollected } from '../services/collectionService';

export const BibleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [verse, setVerse] = useState<BibleVerse | null>(location.state?.verse || null);
  const [activeTab, setActiveTab] = useState<'content' | 'vocab' | 'grammar'>('content');
  const [showReadings, setShowReadings] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [, setUpdateTick] = useState(0);

  useEffect(() => {
    if (!verse && id) {
      const cached = getBibleVerseById(id);
      if (cached) setVerse(cached);
    }
  }, [id, verse]);

  if (!verse) return <div className="p-10 text-center font-black">加载中...</div>;

  const handleTTS = async (segments: TextSegment[], sid: string) => {
    setPlayingId(sid);
    await playTTS(segmentsToText(segments));
    setPlayingId(null);
  };

  const handleToggleCollect = (type: any, content: any) => {
    toggleCollection(type, content);
    setUpdateTick(prev => prev + 1);
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
    <div className={`pb-24 animate-fadeIn px-2 ${!showReadings ? 'hide-readings' : ''}`}>
      <div className="flex justify-between items-center py-4 sticky top-0 bg-slate-50/90 backdrop-blur-md z-30">
        <button onClick={() => navigate(-1)} className="text-slate-400 font-black"><i className="fa-solid fa-chevron-left"></i></button>
        <div className="flex gap-2">
          <button onClick={() => setShowReadings(!showReadings)} className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all ${showReadings ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>
            {showReadings ? '隐藏假名' : '显示假名'}
          </button>
          <button onClick={() => setShowTranslation(!showTranslation)} className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all ${showTranslation ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>
            {showTranslation ? '隐藏翻译' : '显示翻译'}
          </button>
        </div>
      </div>

      <header className="mb-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center relative">
        <button 
          onClick={() => handleToggleCollect('verse', verse)} 
          className={`absolute top-6 right-6 collect-btn w-11 h-11 rounded-full flex items-center justify-center ${isCollected(verse) ? 'bg-rose-50 text-rose-500 active' : 'bg-slate-50 text-slate-300'}`}
        >
          <i className={`fa-${isCollected(verse) ? 'solid' : 'regular'} fa-heart text-lg`}></i>
        </button>
        <span className="text-[10px] font-black px-3 py-1 rounded-xl mb-4 inline-block bg-purple-50 text-purple-700">{verse.reference}</span>
        <p className="text-xl font-bold leading-relaxed mb-4 Japanese-text">{renderSegments(verse.japaneseSegments)}</p>
        {showTranslation && <p className="text-sm text-slate-400 font-medium italic border-t pt-4">"{verse.chineseTranslation}"</p>}
      </header>

      <nav className="flex gap-2 p-1.5 bg-slate-200/50 rounded-3xl mb-6">
        {(['content', 'vocab', 'grammar'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-3 text-xs font-black rounded-2xl transition-all ${activeTab === t ? 'bg-white text-purple-700 shadow-md' : 'text-slate-500'}`}>
            {t === 'content' ? '正文解析' : t === 'vocab' ? '词汇' : '语法'}
          </button>
        ))}
      </nav>

      <div className="space-y-4">
        {activeTab === 'content' && verse.sentences.map((segments, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex flex-col gap-4 shadow-sm">
            <div className="flex-1">
              <p className="Japanese-text text-slate-800">{renderSegments(segments)}</p>
              {showTranslation && <p className="text-slate-400 text-sm mt-4 border-l-4 pl-4 font-medium">{verse.translations?.[i]}</p>}
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => handleToggleCollect('sentence', { segments, translation: verse.translations?.[i] })} 
                className={`collect-btn w-10 h-10 rounded-xl flex items-center justify-center ${isCollected({ segments, translation: verse.translations?.[i] }) ? 'bg-rose-50 text-rose-500 active' : 'bg-slate-50 text-slate-300'}`}
              >
                <i className={`fa-${isCollected({ segments, translation: verse.translations?.[i] }) ? 'solid' : 'regular'} fa-heart`}></i>
              </button>
              <button onClick={() => handleTTS(segments, `s-${i}`)} className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${playingId === `s-${i}` ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600'}`}>
                <i className={`fa-solid ${playingId === `s-${i}` ? 'fa-circle-notch fa-spin' : 'fa-volume-high'}`}></i>
              </button>
            </div>
          </div>
        ))}

        {activeTab === 'vocab' && (verse.vocabulary || []).map((v, i) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-black">{v.word}</span>
                <span className="text-[10px] font-black text-purple-500 furigana">[{v.reading}]</span>
              </div>
              {showTranslation && <p className="text-sm text-slate-500">{v.meaning}</p>}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleToggleCollect('word', v)} 
                className={`collect-btn w-9 h-9 rounded-xl flex items-center justify-center ${isCollected(v) ? 'bg-rose-50 text-rose-500 active' : 'bg-slate-50 text-slate-300'}`}
              >
                <i className={`fa-${isCollected(v) ? 'solid' : 'regular'} fa-heart text-xs`}></i>
              </button>
              <button onClick={() => playTTS(v.word)} className="w-9 h-9 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center"><i className="fa-solid fa-volume-high text-xs"></i></button>
            </div>
          </div>
        ))}

        {activeTab === 'grammar' && (verse.grammar || []).map((g, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
             <div className="flex justify-between mb-2">
                <span className="font-black text-purple-700">{g.point}</span>
                <button 
                  onClick={() => handleToggleCollect('grammar', g)} 
                  className={`collect-btn w-8 h-8 rounded-lg flex items-center justify-center ${isCollected(g) ? 'bg-rose-50 text-rose-500 active' : 'bg-slate-50 text-slate-300'}`}
                >
                  <i className={`fa-${isCollected(g) ? 'solid' : 'regular'} fa-heart text-[10px]`}></i>
                </button>
             </div>
             <p className="text-sm text-slate-600 mb-4">{g.explanation}</p>
             <div className="bg-slate-50 p-4 rounded-2xl italic text-xs text-slate-500">例: {g.example}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
