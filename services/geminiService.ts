
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

// 核心语音播放逻辑优化
export function playTTS(text: string, rate: number = 0.85): Promise<void> {
  return new Promise((resolve) => {
    // 预处理：移除HTML标签，特别是ruby标签
    const cleanText = text.replace(/<rt>.*?<\/rt>/g, '').replace(/<[^>]*>?/gm, '').trim();
    if (!cleanText) return resolve();

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // 强制筛选日语语音包，避免中文引擎误读
    const voices = window.speechSynthesis.getVoices();
    // 优先级排序：Google原生 > 系统原生日语 > 包含 ja 的任何语音
    const jaVoice = voices.find(v => v.lang === 'ja-JP' && v.name.includes('Google')) || 
                    voices.find(v => v.lang === 'ja-JP') || 
                    voices.find(v => v.lang.startsWith('ja'));
    
    if (jaVoice) {
      utterance.voice = jaVoice;
    }
    
    utterance.lang = 'ja-JP';
    utterance.rate = rate; // 稍微慢一点，听得更清楚
    utterance.pitch = 1.0;
    
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    
    window.speechSynthesis.speak(utterance);
    
    // 兜底机制：如果5秒还没结束，强制结束
    setTimeout(() => resolve(), 5000);
  });
}

const OPTIMIZED_INSTRUCTION = `Expert Japanese Educator. 
Rules: Output 5 JSON objects with <ruby> for all Kanji. Semantic tags: <span class="g-syntax">, <span class="g-particle">.`;

// Fix: Added isAppend parameter to resolve 'Expected 2 arguments, but got 3' errors in callers
export async function fetchLearningContent(category: LearningCategory, date: string, isAppend: boolean = false): Promise<Article[]> {
  const result = await callProxyAPI({
    model: 'gemini-3-flash-preview',
    contents: `Generate 5 Japanese ${category} articles for ${date}. Balanced levels.`,
    config: {
      systemInstruction: OPTIMIZED_INSTRUCTION,
      responseMimeType: "application/json",
      temperature: 0.2
    }
  });
  const data = JSON.parse(cleanJsonResponse(result.text || "[]"));
  // Fix: Generate unique IDs when appending to allow multiple batches for the same day/category
  const timestamp = Date.now();
  const articles = data.map((a: any, i: number) => ({ 
    ...a, 
    id: isAppend ? `${category}-${date}-${i}-${timestamp}` : `${category}-${date}-${i}`, 
    category, 
    date 
  }));
  saveArticlesToCache(articles);
  return articles;
}

/**
 * 歌曲抓取优化：指定来源并增加数量
 */
export async function fetchTopSongs(offset: number = 0): Promise<Song[]> {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-pro-preview', // 使用增强版以获得更好的搜索效果
      contents: `Fetch exactly 10 real Japanese worship songs from https://sanbikashi.net/hallelujah/. Provide lyrics with <ruby> and translations. Batch starting from offset ${offset}.`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: `Japanese Worship Music Expert. Output JSON ARRAY of 10 objects. 
        Structure: {title, artist, lyrics, translation, youtubeUrl}. 
        IMPORTANT: Search the specific website for actual lyrics content.`,
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
    config: {
      systemInstruction: `Expert Japanese Bible Scholar. JSON output. Use <ruby>.`,
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
    contents: `5 quizzes based on: ${context}`,
    config: {
      systemInstruction: `Expert Japanese Teacher. JSON output. Use <ruby>.`,
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(cleanJsonResponse(result.text || "[]"));
}
