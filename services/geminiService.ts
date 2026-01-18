
import { JLPTLevel, Article, Song, LearningCategory, QuizQuestion, BibleVerse } from "../types";
import { saveArticlesToCache, saveBibleVersesToCache } from "./cacheService";
import { GoogleGenAI } from "@google/genai";

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

// 核心语音播放逻辑优化
export function playTTS(text: string, rate: number = 0.85): Promise<void> {
  return new Promise((resolve) => {
    // 关键优化：移除 ruby 注音内容，只读正文汉字/假名
    const cleanText = text.replace(/<rt>.*?<\/rt>/g, '').replace(/<[^>]*>?/gm, '').trim();
    if (!cleanText) return resolve();

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // 强制筛选日语语音包，避免中文引擎误读
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find(v => v.lang === 'ja-JP' && v.name.includes('Google')) || 
                    voices.find(v => v.lang === 'ja-JP') || 
                    voices.find(v => v.lang.startsWith('ja'));
    
    if (jaVoice) {
      utterance.voice = jaVoice;
    }
    
    utterance.lang = 'ja-JP';
    utterance.rate = rate; 
    utterance.pitch = 1.0;
    
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    
    window.speechSynthesis.speak(utterance);
    
    // 兜底超时
    setTimeout(() => resolve(), 8000);
  });
}

const OPTIMIZED_INSTRUCTION = `Expert Japanese Educator. Rules: Output JSON with <ruby> for all Kanji. Semantic tags: <span class="g-syntax">, <span class="g-particle">.`;

export async function fetchLearningContent(category: LearningCategory, date: string, isAppend: boolean = false): Promise<Article[]> {
  const result = await callProxyAPI({
    model: 'gemini-3-flash-preview',
    contents: `Generate 5 Japanese ${category} articles for ${date}.`,
    config: {
      systemInstruction: OPTIMIZED_INSTRUCTION,
      responseMimeType: "application/json",
      temperature: 0.2
    }
  });
  const data = JSON.parse(cleanJsonResponse(result.text || "[]"));
  const articles = data.map((a: any, i: number) => ({ 
    ...a, 
    id: isAppend ? `${category}-${date}-${i}-${Date.now()}` : `${category}-${date}-${i}`, 
    category, 
    date 
  }));
  saveArticlesToCache(articles);
  return articles;
}

/**
 * 歌曲抓取优化：指定特定网站来源，抓取 10 首，使用搜索增强
 */
export async function fetchTopSongs(offset: number = 0): Promise<Song[]> {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-pro-preview', // 搜索功能必须用 Pro
      contents: `Search and fetch exactly 10 real Japanese worship songs from the website: https://sanbikashi.net/hallelujah/. 
      Provide the real Japanese lyrics using <ruby> for Kanji, and a full Chinese translation. 
      Batch starting from offset ${offset}.`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: `Japanese Worship Music Expert. Output JSON ARRAY of 10 objects. 
        Structure: {title, artist, lyrics, translation, youtubeUrl}. 
        Ensure you get content specifically from sanbikashi.net.`,
        responseMimeType: "application/json"
      }
    });
    const jsonStr = cleanJsonResponse(result.text || "[]");
    const data = JSON.parse(jsonStr);
    return data.map((s: any, i: number) => ({ ...s, id: `song-${Date.now()}-${i}`, rank: offset + i + 1 }));
  } catch (e) {
    console.error("Song fetch failed", e);
    return [];
  }
}

export async function fetchBibleVerses(excludeIds: string[] = []): Promise<BibleVerse[]> {
  const result = await callProxyAPI({
    model: 'gemini-3-flash-preview',
    contents: `5 inspiring Japanese Bible verses.`,
    config: { systemInstruction: `Expert Japanese Bible Scholar. JSON output with <ruby>.`, responseMimeType: "application/json" }
  });
  const data = JSON.parse(cleanJsonResponse(result.text || "[]"));
  const verses = data.map((v: any, i: number) => ({ ...v, id: `v-${Date.now()}-${i}` }));
  saveBibleVersesToCache(verses);
  return verses;
}

export async function generateQuizzes(context: string): Promise<QuizQuestion[]> {
  const result = await callProxyAPI({
    model: 'gemini-3-flash-preview',
    contents: `5 quizzes based on: ${context}`,
    config: { systemInstruction: `Expert Japanese Teacher. JSON output with <ruby>.`, responseMimeType: "application/json" }
  });
  return JSON.parse(cleanJsonResponse(result.text || "[]"));
}
