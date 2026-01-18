
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
  // 处理可能存在的 Markdown 格式
  cleaned = cleaned.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "");
  // 如果 AI 输出截断，尝试补全末尾的 ]
  if (cleaned.endsWith('}') && !cleaned.endsWith('}]')) {
    cleaned += ']';
  } else if (!cleaned.endsWith(']') && !cleaned.endsWith('}')) {
     // 极端截断情况尝试修复
     const lastBrace = cleaned.lastIndexOf('}');
     if (lastBrace !== -1) cleaned = cleaned.substring(0, lastBrace + 1) + ']';
  }
  return cleaned;
}

// 极其精简的指令，减少 AI 的 Token 开销
const OPTIMIZED_INSTRUCTION = `Expert Japanese Educator.
Rules:
1. Output JSON ARRAY of 5 objects.
2. Structure: {title, summary, content, sentences:[], translations:[], level, vocabulary:[{word, reading, meaning}], grammar:[{point, explanation, example}]}.
3. Content: 300-500 chars per article.
4. MUST: Use <ruby> for all Kanji.
5. Chinese ONLY for explanations/translations.
6. Semantic Tags: <span class="g-syntax"> grammar, <span class="g-particle"> particles.`;

export function playTTS(text: string): Promise<void> {
  return new Promise((resolve) => {
    const cleanText = text.replace(/<[^>]*>?/gm, '').trim();
    if (!cleanText) return resolve();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find(v => v.lang.startsWith('ja')) || voices.find(v => v.lang.includes('JP'));
    if (jaVoice) utterance.voice = jaVoice;
    utterance.lang = 'ja-JP';
    utterance.rate = 0.95;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export async function fetchLearningContent(
  category: LearningCategory, 
  date: string, 
  isAppend: boolean = false
): Promise<Article[]> {
  const batchId = Date.now().toString(36);
  
  // 增加抓取成功的确定性：降低随机度，提高专注度
  const fetchAttempt = async (retryCount = 0): Promise<Article[]> => {
    try {
      const result = await callProxyAPI({
        model: 'gemini-3-flash-preview',
        contents: `Generate 5 high-quality Japanese ${category} articles for ${date}. Balanced levels (N1-N5).`,
        config: {
          systemInstruction: OPTIMIZED_INSTRUCTION,
          responseMimeType: "application/json",
          temperature: 0.2, // 降低随机性，提高生成速度和准确度
        }
      });

      const jsonStr = cleanJsonResponse(result.text || "[]");
      const data = JSON.parse(jsonStr);
      
      const newArticles = data.map((a: any, i: number) => ({ 
        ...a, 
        id: `${category}-${date}-${batchId}-${i}`, 
        category, 
        date 
      }));
      
      saveArticlesToCache(newArticles);
      return newArticles;
    } catch (e) {
      if (retryCount < 1) { // 失败重试一次
        console.warn("Retrying fetch...", e);
        return fetchAttempt(retryCount + 1);
      }
      console.error("Fetch failed after retries", e);
      throw e;
    }
  };

  return fetchAttempt();
}

/**
 * Fix: Added generateQuizzes to satisfy errors in Practice.tsx
 */
export async function generateQuizzes(context: string): Promise<QuizQuestion[]> {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `Generate 5 Japanese quizzes based on: ${context}`,
      config: {
        systemInstruction: `Expert Japanese Language Teacher.
Output JSON ARRAY of 5 objects.
Structure: {type, question, options:[], correctAnswer:index, explanation, audioText}.
Rules:
1. type: 'listening' | 'reading' | 'grammar' | 'vocabulary'.
2. Use <ruby> for all Kanji in question and options.
3. audioText: plain text version for TTS if type is 'listening'.
4. correctAnswer is 0-3.`,
        responseMimeType: "application/json",
        temperature: 0.5,
      }
    });
    const jsonStr = cleanJsonResponse(result.text || "[]");
    const data = JSON.parse(jsonStr);
    return data.map((q: any, i: number) => ({ 
      ...q, 
      id: `quiz-${Date.now()}-${i}`,
      correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0
    }));
  } catch (e) {
    console.error("Quiz generation failed", e);
    throw e;
  }
}

/**
 * Fix: Added fetchTopSongs to satisfy errors in Songs.tsx
 */
export async function fetchTopSongs(offset: number = 0): Promise<Song[]> {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `Generate 5 Japanese worship songs (batch starting from rank ${offset + 1})`,
      config: {
        systemInstruction: `Japanese Worship Music Expert.
Output JSON ARRAY of 5 objects.
Structure: {title, artist, lyrics, translation, youtubeUrl}.
Rules:
1. Use <ruby> for all Kanji in lyrics.
2. lyrics: full song text.
3. translation: full chinese translation.
4. youtubeUrl: a valid YouTube link placeholder (e.g., https://www.youtube.com/watch?v=...).`,
        responseMimeType: "application/json",
        temperature: 0.4,
      }
    });
    const jsonStr = cleanJsonResponse(result.text || "[]");
    const data = JSON.parse(jsonStr);
    return data.map((s: any, i: number) => ({ 
      ...s, 
      id: `song-${offset + i}`, 
      rank: offset + i + 1 
    }));
  } catch (e) {
    console.error("Song fetch failed", e);
    throw e;
  }
}

/**
 * Fix: Added fetchBibleVerses to satisfy errors in Bible.tsx
 */
export async function fetchBibleVerses(excludeIds: string[] = []): Promise<BibleVerse[]> {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `Generate 5 inspiring Japanese Bible verses. Avoid these IDs if possible: ${excludeIds.join(',')}.`,
      config: {
        systemInstruction: `Expert Japanese Bible Scholar.
Output JSON ARRAY of 5 objects.
Structure: {id, reference, japaneseText, chineseTranslation, sentences:[], translations:[], vocabulary:[{word, reading, meaning}], grammar:[{point, explanation, example}]}.
Rules:
1. Use <ruby> for all Kanji in japaneseText, sentences, vocabulary.word, and grammar.example.
2. sentences and translations must be 1-to-1 breakdown of the verse.
3. id should be unique string.`,
        responseMimeType: "application/json",
        temperature: 0.3,
      }
    });
    const jsonStr = cleanJsonResponse(result.text || "[]");
    const data = JSON.parse(jsonStr);
    const verses = data.map((v: any, i: number) => ({ 
      ...v, 
      id: v.id || `v-bible-${Date.now()}-${i}` 
    }));
    saveBibleVersesToCache(verses);
    return verses;
  } catch (e) {
    console.error("Bible verse fetch failed", e);
    throw e;
  }
}
