import { JLPTLevel, Article, Song, LearningCategory, QuizQuestion, BibleVerse, TextSegment } from "../types";
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
  return cleaned;
}

export function segmentsToText(segments: TextSegment[]): string {
  if (!Array.isArray(segments)) return '';
  return segments.map(s => s.t).join('');
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
    contents: `Search ${siteFilters[category]} for 1 entry (JLPT ${level}) for date ${date}. Output structured segments for Furigana.`,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: `Professional Japanese Teacher. Output JSON array. Breakdown ALL Japanese text into: { "t": "Text", "r": "Reading" }. Simplified Chinese for translations.`,
      responseMimeType: "application/json"
    }
  });

  const rawData = JSON.parse(cleanJsonResponse(result.text || "[]"));
  const articles = rawData.map((a: any, i: number) => ({ 
      ...a, 
      id: `${category}-${level}-${date}-${i}-${Date.now()}`, 
      category, 
      level,
      date 
  }));
  
  saveArticlesToCache(articles);
  return articles;
}

export async function fetchBibleVerses(): Promise<BibleVerse[]> {
  const result = await callProxyAPI({
    model: 'gemini-3-flash-preview',
    contents: `Provide 2 famous Japanese Bible verses. Perform deep analysis including vocabulary and grammar points.`,
    config: {
      systemInstruction: `Bible & Japanese Scholar.
      Return a JSON array of objects with this EXACT structure:
      [{
        "reference": "e.g. ヨハネ 3:16",
        "japaneseText": "Plain Japanese string",
        "japaneseSegments": [{"t":"神","r":"かみ"},{"t":"は"}],
        "chineseTranslation": "中文翻译",
        "sentences": [
          [{"t":"神","r":"かみ"},{"t":"は"}] 
        ],
        "translations": ["对应的中文逐句翻译"],
        "vocabulary": [
          {"word":"神","reading":"かみ","meaning":"上帝/神"}
        ],
        "grammar": [
          {"point":"～は","explanation":"提示主题","example":"私は学生です"}
        ]
      }]
      MANDATORY: Breakdown ALL Japanese text into TextSegments {t, r}.`,
      responseMimeType: "application/json"
    }
  });
  const rawData = JSON.parse(cleanJsonResponse(result.text || "[]"));
  const verses = rawData.map((v: any, i: number) => ({
    ...v,
    id: `v-${Date.now()}-${i}`
  }));
  saveBibleVersesToCache(verses);
  return verses;
}

export async function fetchTopSongs(offset: number = 0): Promise<Song[]> {
  const result = await callProxyAPI({
    model: 'gemini-3-flash-preview',
    contents: `Find 2 official Japanese songs by "Stream of Praise Music Ministries" (赞美之泉). Search YouTube official channel.`,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: `Music Expert. Find official YouTube links. Breakdown ALL lyrics into Segments: {"t":"...","r":"..."}.`,
      responseMimeType: "application/json"
    }
  });
  const data = JSON.parse(cleanJsonResponse(result.text || "[]"));
  return data.map((s: any, i: number) => ({ ...s, id: `song-${Date.now()}-${i}`, rank: offset + i + 1 }));
}

export async function generateQuizzes(context: string): Promise<QuizQuestion[]> {
  const result = await callProxyAPI({
    model: 'gemini-3-flash-preview',
    contents: `Generate 5 Japanese quizzes based on: ${context}.`,
    config: { 
        systemInstruction: "Generate JSON quizzes. No ruby tags.",
        responseMimeType: "application/json" 
    }
  });
  return JSON.parse(cleanJsonResponse(result.text || "[]"));
}
