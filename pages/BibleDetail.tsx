
import React, { useState, useEffect, useRef } from 'react';
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
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [showFurigana, setShowFurigana] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);

  const [recordings, setRecordings] = useState<Record<string, string>>({});
  const [isRecording, setIsRecording] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!verse && id) {
      const cached = getBibleVerseById(id);
      if (cached) setVerse(cached);
    }
    const collections = JSON.parse(localStorage.getItem('user_collection') || '[]');
    setStarred(new Set<string>(collections.map((item: any) => String(item.id))));

    return () => {
      Object.values(recordings).forEach(url => URL.revokeObjectURL(url));
    };
  }, [id, verse]);

  if (!verse) return <div className="p-10 text-center text-slate-400">载入中...</div>;

  const startRecording = async (key: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const url = URL.createObjectURL(new Blob(audioChunksRef.current, { type: 'audio/wav' }));
        setRecordings(p => ({ ...p, [key]: url }));
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setIsRecording(key);
    } catch (e) { alert("录音启动失败"); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(null);
    }
  };

  const toggleStar = (itemId: string, type: string, content: any) => {
    setStarred(prev => {
      const next = new Set(prev);
      const collections = JSON.parse(localStorage.getItem('user_collection') || '[]');
      if (next.has(itemId)) {
        next.delete(itemId);
        localStorage.setItem('user_collection', JSON.stringify(collections.filter((i: any) => i.id !== itemId)));
      } else {
        next.add(itemId);
        localStorage.setItem('user_collection', JSON.stringify([...collections, { id: itemId, type, content, addedAt: Date.now(), nextReviewAt: Date.now() + 86400000, reviewStage: 1 }]));
      }
      return next;
    });
  };

  const cleanText = (text: string) => text.replace(/<[^>]*>?/gm, '');

  const processContent = (text: string) => {
    if (!text) return "";
    return text.replace(/^(reading|meaning|point|explanation|example|word):\s*/i, "").trim();
  };

  return (
    <div className={`pb-24 animate-fadeIn ${showFurigana ? '' : 'hide-furigana'}`}>
      <div className="flex justify-between items-center mb-4 gap-2 sticky top-0 bg-slate-50/90 backdrop-blur-sm z-20 py-2">
        <button onClick={() => navigate(-1)} className="text-slate-400 text-sm font-bold"><i className="fa-solid fa-chevron-left mr-1"></i>返回</button>
        <div className="flex gap-2">
          <button onClick={() => setShowFurigana(!showFurigana)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold ${showFurigana ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-200 text-slate-600'}`}>
            <i className={`fa-solid ${showFurigana ? 'fa-eye' : 'fa-eye-slash'} mr-1`}></i>假名
          </button>
          <button onClick={() => setShowTranslation(!showTranslation)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold ${showTranslation ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-200 text-slate-600'}`}>
            <i className="fa-solid fa-language mr-1"></i>中文
          </button>
        </div>
      </div>

      <header className="mb-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md mb-3 inline-block bg-purple-50 text-purple-700 border border-purple-100" dangerouslySetInnerHTML={{ __html: verse.reference }}></span>
        <p className="text-xl font-bold leading-relaxed mb-4 Japanese-text text-slate-800" dangerouslySetInnerHTML={{ __html: processContent(verse.japaneseText) }}></p>
        {showTranslation && <p className="text-sm text-slate-500 italic border-t border-slate-50 pt-4">"{verse.chineseTranslation}"</p>}
      </header>

      <nav className="flex gap-2 border-b border-slate-200 mb-6 py-2 overflow-x-auto no-scrollbar">
        {(['content', 'vocab', 'grammar'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-purple-100 text-purple-700' : 'text-slate-400 hover:text-slate-600'}`}>
            {tab === 'content' ? '名句拆解' : tab === 'vocab' ? `词汇` : `语法`}
          </button>
        ))}
      </nav>

      <div className="space-y-4">
        {activeTab === 'content' && (
          <div className="space-y-4">
            {verse.sentences.map((sentence, idx) => (
              <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-purple-50 group-hover:bg-purple-400 transition-colors"></div>
                <p className="text-lg Japanese-text text-slate-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: processContent(sentence) }}></p>
                {showTranslation && <p className="text-slate-400 text-sm border-l-4 border-slate-100 pl-3 leading-relaxed">{verse.translations?.[idx]}</p>}
                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                  <div className="flex gap-2">
                    <button onClick={() => playTTS(cleanText(sentence))} className="w-9 h-9 flex items-center justify-center rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100"><i className="fa-solid fa-volume-high"></i></button>
                  </div>
                  <button onClick={() => toggleStar(`v-${verse.id}-${idx}`, 'sentence', sentence)} className={`${starred.has(`v-${verse.id}-${idx}`) ? 'text-amber-500' : 'text-slate-300'} text-xs font-bold flex items-center gap-1`}><i className="fa-solid fa-star"></i>收藏</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'vocab' && (
          <div className="grid gap-4">
            {verse.vocabulary?.map((vocab, vIdx) => (
              <div key={vIdx} className="bg-white p-5 rounded-3xl border border-slate-100 flex flex-col shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-black text-xl text-slate-800 Japanese-text leading-tight" dangerouslySetInnerHTML={{ __html: processContent(vocab.word) }}></div>
                  <button onClick={() => playTTS(cleanText(vocab.word))} className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 hover:text-purple-600"><i className="fa-solid fa-volume-high text-xs"></i></button>
                </div>
                {showTranslation && <div className="text-sm text-slate-600 font-medium bg-slate-50/50 p-3 rounded-2xl mt-2">{processContent(vocab.meaning)}</div>}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'grammar' && (
          <div className="space-y-5">
            {verse.grammar?.map((g, gIdx) => (
              <div key={gIdx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h4 className="font-black text-purple-700 text-xl mb-3">{processContent(g.point)}</h4>
                {showTranslation && (
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-slate-600 leading-relaxed">{processContent(g.explanation)}</p>
                    <div className="bg-purple-50/50 p-5 rounded-2xl border-2 border-purple-50 border-dashed">
                      <p className="text-base Japanese-text text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: processContent(g.example) }}></p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
