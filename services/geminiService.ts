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

// 辅助函数：将 TextSegment 数组转为纯文本用于语音合成
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
    contents: `Search ${siteFilters[category]} for 1 entry (JLPT ${level}). Date: ${date}.`,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: `Professional Japanese Tutor.
      MANDATORY: Breakdown ALL Japanese text into segments for Furigana.
      Segment Format: { "t": "Kanji", "r": "Reading" }. If no kanji, "r" is optional.
      JSON structure: [{
        "title": "Plain Text Title",
        "titleSegments": [{"t":"日","r":"に"},{"t":"本","r":"ほん"}],
        "summary": "Chinese summary",
        "sentences": [ [{"t":"今","r":"いま"},{"t":"日","r":"にち"}] ], 
        "translations": ["Chinese translation"],
        "vocabulary": [{"word":"今日","reading":"きょう","meaning":"今天"}],
        "grammar": [{"point":"～は","explanation":"主题","example":"これは本です"}]
      }]`,
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
    contents: `Provide 2 famous Japanese Bible verses with full analysis.`,
    config: {
      systemInstruction: `Bible & Japanese Scholar. 
      Analyze vocabulary and grammar. Output structured segments for Furigana.
      Segment Format: { "t": "Text", "r": "Reading" }.
      JSON structure: [{
        "reference": "Chapter Verse",
        "japaneseText": "Full text",
        "japaneseSegments": [{"t":"神","r":"かみ"}],
        "chineseTranslation": "Chinese text",
        "sentences": [ [{"t":"神","r":"かみ"}] ],
        "translations": ["Chinese line"],
        "vocabulary": [{"word":"神","reading":"かみ","meaning":"上帝"}],
        "grammar": [{"point":"AはB","explanation":"判别式","example":"私は神です"}]
      }]`,
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
    contents: `Find 2 official Japanese worship songs from "Stream of Praise". YouTube URL MUST BE VALID.`,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: `Music & Japanese Expert.
      Break lyrics into lines of Segments: { "t": "Text", "r": "Reading" }.
      YouTube URL must be a direct working link.
      JSON structure: [{
        "title": "Song Title",
        "artist": "Artist Name",
        "lyricsSegments": [ [{"t":"愛","r":"あい"}] ],
        "translation": "Full Chinese translation",
        "youtubeUrl": "https://www.youtube.com/watch?v=..."
      }]`,
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
        systemInstruction: "Generate JSON quizzes. Options and questions should be plain Japanese.",
        responseMimeType: "application/json" 
    }
  });
  return JSON.parse(cleanJsonResponse(result.text || "[]"));
}
