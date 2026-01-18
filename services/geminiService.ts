
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
 * 学习语料获取：支持等级选择，指定内容来源，每次 2 条
 */
export async function fetchLearningContent(
  category: LearningCategory, 
  level: JLPTLevel, 
  date: string, 
  isAppend: boolean = false
): Promise<Article[]> {
  const prompts = {
    news: `Search for 2 latest Japanese news articles suitable for JLPT ${level} level.`,
    forum: `Search for 2 real Japanese personal blog posts (from ameblo.jp or note.com) about daily life, suitable for JLPT ${level}.`,
    trending: `Search for 2 latest Japanese slang words or idioms trending now, explaining their usage for JLPT ${level}.`
  };

  const result = await callProxyAPI({
    model: 'gemini-3-pro-preview',
    contents: `${prompts[category]} for ${date}.`,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: `Expert Japanese Teacher. Output exactly 2 JSON objects. Use <ruby> for all Kanji. 
      Structure: {title, summary, sentences:[], translations:[], level: "${level}", vocabulary:[], grammar:[]}.`,
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
 * 全网搜索赞美诗，每次 2 首
 */
export async function fetchTopSongs(offset: number = 0): Promise<Song[]> {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-pro-preview',
      contents: `Search the whole web for 2 real Japanese Christian worship songs. Provide full lyrics with <ruby> and Chinese translation. Offset: ${offset}.`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: `Worship Music Expert. Output exactly 2 JSON objects in an array. 
        Structure: {title, artist, lyrics, translation, youtubeUrl}.`,
        responseMimeType: "application/json"
      }
    });
    const data = JSON.parse(cleanJsonResponse(result.text || "[]"));
    return data.map((s: any, i: number) => ({ ...s, id: `song-${Date.now()}-${i}`, rank: offset + i + 1 }));
  } catch (e) {
    console.error("Song search failed", e);
    return [];
  }
}

/**
 * 圣经金句获取，每次 2 句
 */
export async function fetchBibleVerses(excludeIds: string[] = []): Promise<BibleVerse[]> {
  const result = await callProxyAPI({
    model: 'gemini-3-pro-preview',
    contents: `Fetch 2 inspiring Japanese Bible verses.`,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: `Bible Scholar. JSON output. 2 items. Use <ruby>.`,
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
