
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

/**
 * 高质量日语语音播放
 * 自动过滤 <ruby> 注音标签，选择原生 ja-JP 语音包
 */
export function playTTS(text: string, rate: number = 0.85): Promise<void> {
  return new Promise((resolve) => {
    // 关键：移除注音部分 <rt>...</rt> 及其余 HTML
    const cleanText = text
      .replace(/<rt>.*?<\/rt>/g, '') // 移除假名注音
      .replace(/<[^>]*>?/gm, '')    // 移除其余标签
      .trim();
    
    if (!cleanText) return resolve();

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // 强制筛选日语语音包
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
    
    // 5秒强制结束保护
    setTimeout(() => resolve(), 5000);
  });
}

const OPTIMIZED_INSTRUCTION = `Expert Japanese Educator. Rules: Output 5 JSON objects with <ruby> for all Kanji. Semantic tags: <span class="g-syntax">, <span class="g-particle">.`;

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
 * 歌曲抓取优化：指定来源并增加数量至 10 首
 */
export async function fetchTopSongs(offset: number = 0): Promise<Song[]> {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-pro-preview', // 使用增强版以获得更好的搜索效果
      contents: `Fetch exactly 10 real Japanese worship songs from the website: https://sanbikashi.net/hallelujah/. 
      Search specifically for content in that domain. Provide lyrics with <ruby> and Chinese translations. 
      Batch starting from offset ${offset}.`,
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
