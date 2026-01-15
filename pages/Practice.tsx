
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { generateQuizzes, playTTS } from '../services/geminiService';
import { QuizQuestion } from '../types';

const Confetti: React.FC = () => (
  <div className="confetti-container">
    {Array.from({ length: 50 }).map((_, i) => (
      <div 
        key={i} 
        className="confetti" 
        style={{ 
          left: `${Math.random() * 100}%`, 
          animationDelay: `${Math.random() * 3}s`,
          animationDuration: `${2 + Math.random() * 2}s`
        }} 
      />
    ))}
  </div>
);

export const Practice: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [mode, setMode] = useState<'daily' | 'collection' | 'mistakes'>('daily');

  const loadQuestions = async (targetMode: 'daily' | 'collection' | 'mistakes') => {
    setLoading(true);
    setShowResult(false);
    setCurrentIdx(0);
    setScore(0);
    setSelectedOption(null);
    setAnswered(false);
    setMode(targetMode);

    let context = "今日推荐新闻和常用日语表达";
    
    if (targetMode === 'collection') {
      const collection = JSON.parse(localStorage.getItem('user_collection') || '[]');
      context = collection.length > 0 
        ? `针对这些内容练习: ${JSON.stringify(collection.slice(-15).map((c: any) => c.content))}` 
        : "基础词汇";
    } else if (targetMode === 'mistakes') {
      const mistakes = JSON.parse(localStorage.getItem('user_mistakes') || '[]');
      context = mistakes.length > 0 
        ? `强化练习: ${JSON.stringify(mistakes.slice(-10))}` 
        : "易错点";
    }

    try {
      const data = await generateQuizzes(context);
      setQuestions(data.slice(0, 10));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    const initialMode = location.state?.mode || 'daily';
    loadQuestions(initialMode);
  }, [location.state]);

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelectedOption(idx);
    setAnswered(true);
    
    const currentQ = questions[currentIdx];
    if (idx === currentQ.correctAnswer) {
      setScore(s => s + 1);
      if (mode === 'collection') updateEbbinghaus(currentQ, true);
    } else {
      saveToMistakes(currentQ);
      if (mode === 'collection') updateEbbinghaus(currentQ, false);
    }
  };

  const saveToMistakes = (q: QuizQuestion) => {
    const mistakes = JSON.parse(localStorage.getItem('user_mistakes') || '[]');
    if (!mistakes.find((m: any) => m.question === q.question)) {
      localStorage.setItem('user_mistakes', JSON.stringify([...mistakes, q]));
    }
  };

  const updateEbbinghaus = (q: QuizQuestion, success: boolean) => {
    const collections = JSON.parse(localStorage.getItem('user_collection') || '[]');
    const updated = collections.map((item: any) => {
       if (q.question.includes(item.content.word || item.content)) {
         const nextStage = success ? Math.min(item.reviewStage + 1, 5) : 1;
         const nextReview = Date.now() + (nextStage * 24 * 60 * 60 * 1000);
         return { ...item, reviewStage: nextStage, nextReviewAt: nextReview };
       }
       return item;
    });
    localStorage.setItem('user_collection', JSON.stringify(updated));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1);
      setSelectedOption(null);
      setAnswered(false);
    } else {
      setShowResult(true);
    }
  };

  const getEncouragement = () => {
    const ratio = score / (questions.length || 1);
    if (ratio === 1) return { ja: "素晴らしい！完美！", icon: "fa-crown", color: "text-amber-500" };
    if (ratio >= 0.8) return { ja: "よくできました！很棒！", icon: "fa-star", color: "text-indigo-500" };
    if (ratio >= 0.6) return { ja: "お疲れ様！继续努力！", icon: "fa-thumbs-up", color: "text-emerald-500" };
    return { ja: "次は頑張りましょう！加油！", icon: "fa-fire", color: "text-orange-500" };
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500 font-medium italic">AI 正在根据你的弱点量身定制题目...</p>
    </div>
  );

  if (showResult) {
    const msg = getEncouragement();
    return (
      <div className="text-center space-y-8 py-12 animate-fadeIn px-4 relative">
        {score >= 6 && <Confetti />}
        <div className={`inline-block p-8 bg-white rounded-full shadow-xl border-4 border-slate-50 mb-4 scale-110`}>
          <i className={`fa-solid ${msg.icon} text-6xl ${msg.color}`}></i>
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-800 mb-2">{msg.ja}</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Test Completed</p>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 max-w-sm mx-auto">
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-400 text-sm font-bold">正确率</span>
            <span className="text-2xl font-black text-indigo-600">{(score/questions.length*100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${(score/questions.length*100)}%` }}></div>
          </div>
          <p className="mt-4 text-slate-500 text-sm">你一共答对了 <span className="font-bold text-slate-800">{score}</span> 道题目</p>
        </div>

        <div className="flex flex-col gap-3 max-w-xs mx-auto pt-6">
          <button onClick={() => loadQuestions(mode)} className="bg-indigo-600 text-white font-black py-5 rounded-3xl shadow-lg shadow-indigo-200 active:scale-95 transition-all">生成下一组题目</button>
          <button onClick={() => navigate('/')} className="text-slate-400 font-bold py-3 hover:text-indigo-600 transition-colors">返回首页</button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <span>模式: {mode === 'daily' ? '每日挑战' : mode === 'mistakes' ? '错题强化' : '收藏复习'}</span>
        <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-black">{currentIdx + 1} / {questions.length}</span>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 min-h-[300px] flex flex-col relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-50">
           <div className="bg-indigo-400 h-full transition-all duration-500" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}></div>
        </div>
        
        <div className="flex justify-between mb-4 mt-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-tighter">{currentQ.type}</span>
          {currentQ.type === 'listening' && (
            <button onClick={() => playTTS(currentQ.audioText || "")} className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
              <i className="fa-solid fa-volume-high text-lg"></i>
            </button>
          )}
        </div>
        
        <h3 
          className="text-xl font-bold leading-relaxed mb-auto py-4 Japanese-text text-slate-800"
          dangerouslySetInnerHTML={{ __html: currentQ.question }}
        ></h3>

        <div className="grid gap-3 mt-8">
          {currentQ.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={`w-full text-left p-5 rounded-2xl border-2 transition-all relative ${
                answered 
                  ? idx === currentQ.correctAnswer 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800' 
                    : idx === selectedOption 
                      ? 'border-rose-500 bg-rose-50 text-rose-800' 
                      : 'border-slate-50 opacity-40'
                  : selectedOption === idx 
                    ? 'border-indigo-500 bg-indigo-50 shadow-sm' 
                    : 'border-slate-100 hover:border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className={`shrink-0 w-7 h-7 rounded-lg text-[11px] flex items-center justify-center font-black ${
                  answered && idx === currentQ.correctAnswer ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="Japanese-text leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: option }}></span>
              </div>
              {answered && idx === currentQ.correctAnswer && <i className="fa-solid fa-circle-check absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500"></i>}
              {answered && idx === selectedOption && idx !== currentQ.correctAnswer && <i className="fa-solid fa-circle-xmark absolute right-5 top-1/2 -translate-y-1/2 text-rose-500"></i>}
            </button>
          ))}
        </div>
      </div>

      {answered && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-indigo-50 p-6 rounded-3xl text-sm text-indigo-900 leading-relaxed border border-indigo-100 shadow-inner">
            <h4 className="font-bold mb-2 flex items-center gap-2 text-indigo-600">
               <i className="fa-solid fa-wand-magic-sparkles"></i> AI 深度解析
            </h4>
            <p className="font-medium">{currentQ.explanation}</p>
          </div>
          <button onClick={handleNext} className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2">
            {currentIdx < questions.length - 1 ? '继续下一题' : '查看最终结果'}
            <i className="fa-solid fa-arrow-right text-xs"></i>
          </button>
        </div>
      )}
    </div>
  );
};
