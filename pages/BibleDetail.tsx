import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { BibleVerse } from '../types';
import { playTTS } from '../services/geminiService';
import { getBibleVerseById } from '../services/cacheService';

export const BibleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [verse, setVerse] = useState<BibleVerse | null>(location.state?.verse || null);
  const [activeTab, setActiveTab] = useState<'content' | 'vocab' | 'grammar'>('content');
  const [showReadings, setShowReadings] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (!verse && id) {
      const cached = getBibleVerseById(id);
      if (cached) setVerse(cached);
    }
  }, [id, verse]);

  if (!verse) return <div className="p-10 text-center font-black">加载中...</div>;

  const handleTTS = async (text: string, sid: string) => {
    setPlayingId(sid);
    await playTTS(text);
    setPlayingId(null);
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

      <header className="mb-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center">
        <span className="text-[10px] font-black px-3 py-1 rounded-xl mb-4 inline-block bg-purple-50 text-purple-700">{verse.reference}</span>
        <p className="text-xl font-bold leading-relaxed mb-4 Japanese-text">{verse.japaneseText}</p>
        {showTranslation && <p className="text-sm text-slate-400 font-medium italic border-t pt-4">"{verse.chineseTranslation}"</p>}
      </header>

      <nav className="flex gap-2 p-1.5 bg-slate-200/50 rounded-3xl mb-6">
        {(['content', 'vocab', 'grammar'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-3 text-xs font-black rounded-2xl transition-all ${activeTab === t ? 'bg-white text-purple-700 shadow-md' : 'text-slate-500'}`}>
            {t === 'content' ? '正文' : t === 'vocab' ? '词汇' : '语法'}
          </button>
        ))}
      </nav>

      <div className="space-y-4">
        {activeTab === 'content' && verse.sentences.map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex gap-4 shadow-sm">
            <div className="flex-1">
              <p className="Japanese-text text-slate-800">{s}</p>
              {showTranslation && <p className="text-slate-400 text-sm mt-4 border-l-4 pl-4 font-medium">{verse.translations?.[i]}</p>}
            </div>
            <button onClick={() => handleTTS(s, `s-${i}`)} className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${playingId === `s-${i}` ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600'}`}>
              <i className={`fa-solid ${playingId === `s-${i}` ? 'fa-circle-notch fa-spin' : 'fa-volume-high'}`}></i>
            </button>
          </div>
        ))}

        {activeTab === 'vocab' && (verse.vocabulary || []).map((v, i) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-black">{v.word}</span>
                <span className="text-[10px] font-black text-purple-500 furigana">[{v.reading}]</span>
              </div>
              {showTranslation && <p className="text-sm text-slate-500">{v.meaning}</p>}
            </div>
            <button onClick={() => handleTTS(v.word, `v-${i}`)} className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl"><i className="fa-solid fa-volume-high"></i></button>
          </div>
        ))}

        {activeTab === 'grammar' && (verse.grammar || []).map((g, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
             <div className="flex justify-between mb-2">
                <span className="font-black text-purple-700">{g.point}</span>
             </div>
             <p className="text-sm text-slate-600 mb-4">{g.explanation}</p>
             <div className="bg-slate-50 p-4 rounded-2xl italic text-xs text-slate-500">例: {g.example}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
