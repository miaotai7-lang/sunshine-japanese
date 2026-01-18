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
    contents: `Search ${siteFilters[category]} for 1 entry (JLPT ${level}). Date: ${date}. Output structured Furigana segments.`,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: `Professional Japanese Tutor.
      - Segment Format: { "t": "Text", "r": "Reading" }.
      - NO JSON wrapper like "articles:". Direct array.
      - Simplified Chinese for all summaries and translations.`,
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
    contents: `Provide 2 famous Japanese Bible verses with segments for Furigana and full grammar/vocab analysis.`,
    config: {
      systemInstruction: `Bible & Japanese Scholar.
      - MUST output JapaneseSegments, Sentences (segments), Vocabulary, and Grammar.
      - Format: [{"reference":"...","japaneseSegments":[{"t":"神","r":"かみ"}], ...}]`,
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
    contents: `Find 2 official Japanese worship songs by "Stream of Praise" (赞美之泉). Ensure YouTube URLs are working official links.`,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: `Music Expert.
      - Find ONLY "Stream of Praise" (赞美之泉/小羊詩歌) official Japanese versions.
      - YouTube URL MUST BE VALID and formatted as https://www.youtube.com/watch?v=VIDEO_ID.
      - Segment ALL lyrics for Furigana.`,
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
        systemInstruction: "Generate JSON quizzes. No ruby tags, just plain Japanese.",
        responseMimeType: "application/json" 
    }
  });
  return JSON.parse(cleanJsonResponse(result.text || "[]"));
}
