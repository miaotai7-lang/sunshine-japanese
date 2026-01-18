
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
 * 学习语料获取：限制特定高质量域名
 */
export async function fetchLearningContent(
  category: LearningCategory, 
  level: JLPTLevel, 
  date: string, 
  isAppend: boolean = false
): Promise<Article[]> {
  // 定义特定网站地图，缩小搜索范围以提速
  const siteFilters = {
    news: 'site:nhk.or.jp/news/easy', // NHK Easy News 专为学习者设计
    forum: 'site:note.com OR site:ameblo.jp', // 日本主流博客
    trending: 'site:kotobank.jp OR site:dic.nicovideo.jp' // 词典与流行语百科
  };

  const prompts = {
    news: `Search ${siteFilters.news} for 2 recent Japanese news articles suitable for JLPT ${level}.`,
    forum: `Search ${siteFilters.forum} for 2 authentic Japanese blog posts about daily life for JLPT ${level}.`,
    trending: `Search ${siteFilters.trending} for 2 Japanese slang/trending words and explain them for JLPT ${level}.`
  };

  const result = await callProxyAPI({
    model: 'gemini-3-pro-preview',
    contents: `${prompts[category]} Query date: ${date}.`,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: `You are an expert Japanese teacher. ONLY use sources from the provided site filter. 
      Output exactly 2 JSON objects in an array. MUST use <ruby> for all Kanji.
      JSON structure: {title, summary, sentences:[], translations:[], level, vocabulary:[], grammar:[]}.`,
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
 * 赞美诗搜索：锁定专业赞美诗库
 */
export async function fetchTopSongs(offset: number = 0): Promise<Song[]> {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-pro-preview',
      // 锁定专门的赞美诗歌词库，大幅提升速度和歌词准确度
      contents: `Search (site:praise-library.com OR site:m-lp.com) for 2 Japanese Christian worship songs. Lyrics must include <ruby>. Offset: ${offset}.`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: `Worship Music Expert. Output exactly 2 JSON objects in an array. 
        Structure: {title, artist, lyrics, translation, youtubeUrl}. Ensure lyrics are formatted for learning with <ruby>.`,
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
 * 圣经金句获取：由于圣经文本固定，AI 通常极快，保持现有的高质量检索
 */
export async function fetchBibleVerses(excludeIds: string[] = []): Promise<BibleVerse[]> {
  const result = await callProxyAPI({
    model: 'gemini-3-pro-preview',
    contents: `Fetch 2 inspiring Japanese Bible verses using 新共同訳 (New Interconfessional Version).`,
    config: {
      tools: [{ googleSearch: {} }],
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
