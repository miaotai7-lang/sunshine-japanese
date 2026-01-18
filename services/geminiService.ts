import { JLPTLevel, Article, Song, LearningCategory, QuizQuestion, BibleVerse } from "../types";
import { saveArticlesToCache, saveBibleVersesToCache } from "./cacheService";

async function callProxyAPI(payload: any) {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Request failed');
  }
  return await response.json();
}

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "");
  cleaned = cleaned.replace(/<ruby>|<rt>|<rp>|<\/ruby>|<\/rt>|<\/rp>/g, "");
  return cleaned;
}

export function playTTS(text: string, rate: number = 0.85): Promise<void> {
  return new Promise((resolve) => {
    const cleanText = text.replace(/<[^>]*>?/gm, '').trim();
    if (!cleanText) return resolve();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find(v => v.lang === 'ja-JP' && v.name.includes('Google')) || 
                    voices.find(v => v.lang === 'ja-JP');
    if (jaVoice) utterance.voice = jaVoice;
    utterance.lang = 'ja-JP';
    utterance.rate = rate;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
    setTimeout(() => resolve(), 5000);
  });
}

export async function fetchLearningContent(
  category: LearningCategory, 
  level: JLPTLevel, 
  date: string
): Promise<Article[]> {
  const siteFilters = {
    news: 'site:nhk.or.jp/news/easy',
    forum: 'site:note.com',
    trending: 'site:kotobank.jp'
  };

  const result = await callProxyAPI({
    model: 'gemini-3-flash-preview',
    contents: `Search ${siteFilters[category]} for 1 Japanese entry for JLPT ${level}. Date: ${date}.`,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: `You are a Professional Japanese Tutor. 
      RULES:
      1. Output JSON array. 
      2. NO HTML/RUBY.
      3. ALL explanations in Simplified Chinese.
      JSON structure: [{title, summary, sentences:[], translations:[], vocabulary:[{word, reading, meaning}], grammar:[{point, explanation, example}]}]`,
      responseMimeType: "application/json"
    }
  });

  const rawData = JSON.parse(cleanJsonResponse(result.text || "[]"));
  const articles = rawData.map((a: any, i: number) => ({ 
      ...a, 
      vocabulary: (a.vocabulary || []).map((v: any, idx: number) => ({...v, id: `v-${Date.now()}-${idx}`})),
      grammar: (a.grammar || []).map((g: any, idx: number) => ({...g, id: `g-${Date.now()}-${idx}`})),
      id: `${category}-${level}-${date}-${i}-${Date.now()}`, 
      category, 
      date 
  }));
  
  saveArticlesToCache(articles);
  return articles;
}

export async function fetchBibleVerses(): Promise<BibleVerse[]> {
  const result = await callProxyAPI({
    model: 'gemini-3-flash-preview',
    contents: `Provide 2 famous Japanese Bible verses.`,
    config: {
      systemInstruction: `Bible Scholar & Japanese Expert.
      - ANALYZE vocabulary and grammar for each verse.
      - NO <ruby> tags.
      - Chinese translation for all fields.
      - JSON: [{reference, japaneseText, chineseTranslation, sentences:[], translations:[], vocabulary:[{word, reading, meaning}], grammar:[{point, explanation, example}]}]`,
      responseMimeType: "application/json"
    }
  });
  const rawData = JSON.parse(cleanJsonResponse(result.text || "[]"));
  const verses = rawData.map((v: any, i: number) => ({
    ...v,
    vocabulary: (v.vocabulary || []).map((vi: any, idx: number) => ({ ...vi, id: `bv-${Date.now()}-${idx}` })),
    grammar: (v.grammar || []).map((gi: any, idx: number) => ({ ...gi, id: `bg-${Date.now()}-${idx}` })),
    id: `v-${Date.now()}-${i}`
  }));
  saveBibleVersesToCache(verses);
  return verses;
}

export async function fetchTopSongs(offset: number = 0): Promise<Song[]> {
  const result = await callProxyAPI({
    model: 'gemini-3-flash-preview',
    contents: `Find 2 official Japanese worship songs from "Stream of Praise". Offset: ${offset}.`,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: "Music Expert. Output JSON. No ruby tags. Simplified Chinese for translations.",
      responseMimeType: "application/json"
    }
  });
  const data = JSON.parse(cleanJsonResponse(result.text || "[]"));
  return data.map((s: any, i: number) => ({ ...s, id: `song-${Date.now()}-${i}`, rank: offset + i + 1 }));
}

export async function generateQuizzes(context: string): Promise<QuizQuestion[]> {
  const result = await callProxyAPI({
    model: 'gemini-3-flash-preview',
    contents: `Generate 5 Japanese quizzes based on: ${context}`,
    config: { 
        systemInstruction: "Generate JSON quizzes. No ruby tags.",
        responseMimeType: "application/json" 
    }
  });
  return JSON.parse(cleanJsonResponse(result.text || "[]"));
}
