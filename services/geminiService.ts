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
    // Fallback for some mobile browsers where onend never fires
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
      systemInstruction: `Professional Japanese Teacher.
      CRITICAL RULES:
      1. MUST breakdown ALL Japanese text into: { "t": "Text", "r": "Reading" }.
      2. If a segment is only Kana, "r" is optional or same as "t".
      3. Return ONLY a JSON array of objects.
      JSON structure: [{
        "title": "Plain Text",
        "titleSegments": [{"t":"日","r":"に"},{"t":"本","r":"ほん"}],
        "summary": "Chinese Summary",
        "sentences": [ [{"t":"今","r":"いま"},{"t":"日","r":"にち"}] ],
        "translations": ["Chinese sentence"],
        "vocabulary": [{"word":"今日","reading":"きょう","meaning":"今天"}],
        "grammar": [{"point":"～は","explanation":"Topic","example":"これは本です"}]
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
    contents: `Give 2 Japanese Bible verses with segment analysis for Furigana.`,
    config: {
      systemInstruction: `Bible Scholar. Return JSON array. 
      Structure: [{"reference":"...","japaneseSegments":[{"t":"神","r":"かみ"}], "chineseTranslation":"...", "sentences": [[...]], "translations": ["..."], "vocabulary": [...], "grammar": [...]}]`,
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
      systemInstruction: `Music Expert. 
      - YouTube URL MUST BE official (e.g., https://www.youtube.com/watch?v=...).
      - Breakdown ALL lyrics into Segments: {"t":"...","r":"..."}.
      - Return JSON array.`,
      responseMimeType: "application/json"
    }
  });
  const data = JSON.parse(cleanJsonResponse(result.text || "[]"));
  return data.map((s: any, i: number) => ({ ...s, id: `song-${Date.now()}-${i}`, rank: offset + i + 1 }));
}

export async function generateQuizzes(context: string): Promise<QuizQuestion[]> {
  const result = await callProxyAPI({
    model: 'gemini-3-flash-preview',
    contents: `Generate 5 Japanese quizzes based on: ${context}. Keep it simple JSON.`,
    config: { 
        systemInstruction: "Generate JSON quizzes. Options and questions should be plain Japanese. No ruby tags.",
        responseMimeType: "application/json" 
    }
  });
  return JSON.parse(cleanJsonResponse(result.text || "[]"));
}
