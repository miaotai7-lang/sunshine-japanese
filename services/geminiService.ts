
import { JLPTLevel, Article, Song, LearningCategory, QuizQuestion, BibleVerse } from "../types";
import { saveArticlesToCache, saveBibleVersesToCache } from "./cacheService";

// 统一调用接口
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
  if (cleaned.endsWith('}') && !cleaned.endsWith('}]')) cleaned += ']';
  return cleaned;
}

export function playTTS(text: string, rate: number = 0.85): Promise<void> {
  return new Promise((resolve) => {
    const cleanText = text.replace(/<rt>.*?<\/rt>/g, '').replace(/<[^>]*>?/gm, '').trim();
    if (!cleanText) return resolve();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find(v => v.lang === 'ja-JP' && v.name.includes('Google')) || 
                    voices.find(v => v.lang === 'ja-JP') || 
                    voices.find(v => v.lang.startsWith('ja'));
    if (jaVoice) utterance.voice = jaVoice;
    utterance.lang = 'ja-JP';
    utterance.rate = rate;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
    setTimeout(() => resolve(), 5000);
  });
}

/**
 * 学习语料获取
 */
export async function fetchLearningContent(
  category: LearningCategory, 
  level: JLPTLevel, 
  date: string, 
  isAppend: boolean = false
): Promise<Article[]> {
  const siteFilters = {
    news: 'site:nhk.or.jp/news/easy',
    forum: 'site:note.com OR site:ameblo.jp',
    trending: 'site:kotobank.jp'
  };

  const result = await callProxyAPI({
    model: 'gemini-3-flash-preview',
    contents: `Search ${siteFilters[category]} for 2 Japanese entries for JLPT ${level}. Date: ${date}.`,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: `You are a Fast Japanese Content Generator. 
      Output exactly 2 JSON items in an array. 
      JSON structure: {title, summary, sentences:[], translations:[], level, vocabulary:[], grammar:[]}.
      Use <ruby> for ALL Kanji. Be concise to ensure high speed.`,
      responseMimeType: "application/json"
    }
  });

  const data = JSON.parse(cleanJsonResponse(result.text || "[]"));
  const articles = data.map((a: any, i: number) => ({ 
    ...a, 
    id: `${category}-${level}-${date}-${i}-${Date.now()}`, 
    category, 
    date 
  }));
  saveArticlesToCache(articles);
  return articles;
}

/**
 * 赞美诗搜索：精准锁定并校验“赞美之泉”视频链接
 */
export async function fetchTopSongs(offset: number = 0): Promise<Song[]> {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `Find 2 REAL Japanese worship songs from "Stream of Praise" (讃美の泉). 
      You MUST verify that the youtubeUrl is functional and leads to the official "Stream of Praise" channel or a verified version. 
      Offset: ${offset}.`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: `Worship Music Verification Expert. 
        Your goal: Provide songs from "Stream of Praise" (讃美の泉) with VALID YouTube links.
        - SEARCH specifically on YouTube for "讃美の泉 [Song Title] Japanese".
        - DO NOT hallucinate YouTube IDs. Only use links you find in the search results.
        - Output 2 JSON objects in an array.
        - Structure: {title, artist, lyrics, translation, youtubeUrl}.
        - lyrics: Full text with <ruby> tags.
        - youtubeUrl: Must be a full, valid https://www.youtube.com/watch?v=... link.`,
        responseMimeType: "application/json"
      }
    });
    const data = JSON.parse(cleanJsonResponse(result.text || "[]"));
    return data.map((s: any, i: number) => ({ 
      ...s, 
      artist: s.artist || '讃美の泉 (Stream of Praise)',
      id: `song-${Date.now()}-${i}`, 
      rank: offset + i + 1 
    }));
  } catch (e) {
    console.error("Song search failed", e);
    return [];
  }
}

/**
 * 圣经金句
 */
export async function fetchBibleVerses(excludeIds: string[] = []): Promise<BibleVerse[]> {
  const result = await callProxyAPI({
    model: 'gemini-3-flash-preview',
    contents: `Give me 2 famous Japanese Bible verses (新共同訳).`,
    config: {
      systemInstruction: `Bible Scholar. JSON output (2 items). Use <ruby> for Kanji. 
      Structure: {reference, japaneseText, chineseTranslation, sentences:[], translations:[], vocabulary:[], grammar:[]}.`,
      responseMimeType: "application/json"
    }
  });
  const data = JSON.parse(cleanJsonResponse(result.text || "[]"));
  const verses = data.map((v: any, i: number) => ({ ...v, id: `v-${Date.now()}-${i}` }));
  saveBibleVersesToCache(verses);
  return verses;
}

export async function generateQuizzes(context: string): Promise<QuizQuestion[]> {
  const result = await callProxyAPI({
    model: 'gemini-3-flash-preview',
    contents: `Generate 5 quizzes based on: ${context}`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(cleanJsonResponse(result.text || "[]"));
}
