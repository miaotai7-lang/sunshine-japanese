
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
  // 移除可能存在的任何 HTML 标签，特别是 ruby
  cleaned = cleaned.replace(/<ruby>|<rt>|<\/rt>|<\/ruby>/g, "");
  return cleaned;
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

/**
 * 学习语料获取：禁止 Ruby，强制中文
 */
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
    contents: `Search ${siteFilters[category]} for 1 Japanese entry for JLPT ${level}. Date: ${date}.`,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: `You are a Professional Japanese Tutor. 
      MANDATORY RULES:
      1. Output exactly 1 JSON object in an array. 
      2. NO HTML TAGS, NO <ruby>, NO <rt>. Only plain text.
      3. ALL translations MUST be in Simplified Chinese.
      4. vocabulary and grammar MUST be extracted strictly from the generated content.
      JSON structure: {title, summary, sentences:[], translations:[], level, vocabulary:[{word, reading, meaning}], grammar:[{point, explanation, example}]}.`,
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
 * 赞美诗搜索：禁止 Ruby
 */
export async function fetchTopSongs(offset: number = 0): Promise<Song[]> {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `Find 2 official Japanese worship songs from "Stream of Praise" (讃美の泉). Verify YouTube links. Offset: ${offset}.`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: `Worship Music Expert. 
        - NO <ruby> tags. Use plain text for lyrics.
        - Chinese translation required.
        - youtubeUrl must be a valid watch link.
        - JSON: [{title, artist, lyrics, translation, youtubeUrl}]`,
        responseMimeType: "application/json"
      }
    });
    const data = JSON.parse(cleanJsonResponse(result.text || "[]"));
    const songs = data.map((s: any, i: number) => ({ 
      ...s, 
      id: `song-${Date.now()}-${i}`, 
      rank: offset + i + 1 
    }));
    // 保存到歌曲缓存
    const existing = JSON.parse(localStorage.getItem('cached_songs_list') || '[]');
    localStorage.setItem('cached_songs_list', JSON.stringify([...existing, ...songs]));
    return songs;
  } catch (e) {
    return [];
  }
}

/**
 * 圣经金句：禁止 Ruby
 */
export async function fetchBibleVerses(): Promise<BibleVerse[]> {
  const result = await callProxyAPI({
    model: 'gemini-3-flash-preview',
    contents: `Give me 2 famous Japanese Bible verses.`,
    config: {
      systemInstruction: `Bible Scholar. 
      - NO <ruby> tags. 
      - Mandatory Simplified Chinese translation.
      - JSON output (2 items): {reference, japaneseText, chineseTranslation, sentences:[], translations:[], vocabulary:[], grammar:[]}.`,
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
    contents: `Generate 5 Chinese-Japanese quizzes based on: ${context}`,
    config: { 
        systemInstruction: "Generate quizzes. Questions in Japanese, explanations in Chinese.",
        responseMimeType: "application/json" 
    }
  });
  return JSON.parse(cleanJsonResponse(result.text || "[]"));
}
