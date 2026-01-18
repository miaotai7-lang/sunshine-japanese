
import { JLPTLevel, Article, Song, LearningCategory, QuizQuestion, BibleVerse } from "../types";
import { saveArticlesToCache, saveBibleVersesToCache, getArticlesByDateAndCategory } from "./cacheService";

async function callProxyAPI(payload: any) {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error('Request failed');
  return await response.json();
}

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "");
  return cleaned;
}

/**
 * 极严苛的语义标注指令：要求生成全量长文
 */
const MANDATORY_CHINESE_INSTRUCTION = `You are a professional Japanese curriculum developer for advanced learners.
STRICT CONTENT RULES:
1. FULL ARTICLES ONLY: 'content' must be a comprehensive article (300-500 Japanese characters), structured with paragraphs. DO NOT provide short summaries.
2. NO ENGLISH: All translations/explanations in Simplified Chinese only.
3. RUBY: Use <ruby> tags for ALL kanji in 'content', 'sentences', and 'vocabulary.word'.
4. SEMANTIC TAGGING: Use <span class="g-syntax"> for grammar, <span class="g-particle"> for particles, and <span class="g-place"> for locations.
5. CONTEXTUAL ANALYSIS: 'vocabulary' and 'grammar' MUST be extracted exclusively from the provided article 'content'.
6. LEVEL STRATEGY: Focus on N3-N1 level structures while maintaining readability.`;

/**
 * 本地 TTS 播放器 (Web Speech API)
 * 解决网络延迟，实现秒开发音
 */
export function playTTS(text: string): Promise<void> {
  return new Promise((resolve) => {
    // 移除所有 HTML 标签
    const cleanText = text.replace(/<[^>]*>?/gm, '').trim();
    if (!cleanText) return resolve();

    // 取消当前正在播放的所有语音
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // 获取日语语音引擎
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find(v => v.lang.startsWith('ja')) || voices.find(v => v.lang.includes('JP'));
    
    if (jaVoice) {
      utterance.voice = jaVoice;
    }
    
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9; // 稍微放慢一点，方便学习者听清
    utterance.pitch = 1.0;

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
    
    // 如果 100ms 后还没开始读，可能是浏览器限制（需交互），直接 resolve
    setTimeout(() => resolve(), 1000);
  });
}

// 确保在应用加载时预热语音列表
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
}

export async function fetchLearningContent(
  category: LearningCategory, 
  date: string, 
  isAppend: boolean = false
): Promise<Article[]> {
  const levels = ["N1", "N2", "N3", "N3", "N4", "N5"];
  const randomLevel = levels[Math.floor(Math.random() * levels.length)];

  const prompt = `Generate a COMPREHENSIVE Japanese article for date ${date}.
  Category: ${category}.
  Primary JLPT Target: ${randomLevel}.
  Topic: Trending ${category} in Japan or global events from a Japanese perspective.
  Requirement: Provide the FULL text, breakdown sentences, contextual vocabulary (with readings), and specific grammar analysis.`;

  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: MANDATORY_CHINESE_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              summary: { type: "STRING" },
              content: { type: "STRING" },
              sentences: { type: "ARRAY", items: { type: "STRING" } },
              translations: { type: "ARRAY", items: { type: "STRING" } },
              level: { type: "STRING" },
              vocabulary: { type: "ARRAY", items: { 
                type: "OBJECT", 
                properties: { 
                  word: { type: "STRING" }, 
                  reading: { type: "STRING" }, 
                  meaning: { type: "STRING" } 
                } 
              }},
              grammar: { type: "ARRAY", items: { 
                type: "OBJECT", 
                properties: { 
                  point: { type: "STRING" }, 
                  explanation: { type: "STRING" }, 
                  example: { type: "STRING" } 
                } 
              }}
            }
          }
        }
      }
    });

    const jsonStr = cleanJsonResponse(result.text || "[]");
    const newArticles = JSON.parse(jsonStr).map((a: any, i: number) => ({ 
      ...a, 
      id: `${category}-${date}-${Date.now()}-${i}`, 
      category, 
      date 
    }));
    
    saveArticlesToCache(newArticles);
    return newArticles;
  } catch (e) { 
    console.error("Fetch failed", e);
    return [];
  }
}

export async function fetchTopSongs(offset: number = 0): Promise<Song[]> {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `Generate 5 Japanese Christian hymns. Titles must be plain text. Lyrics with <ruby>.`,
      config: {
        systemInstruction: MANDATORY_CHINESE_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              artist: { type: "STRING" },
              lyrics: { type: "STRING" },
              translation: { type: "STRING" },
              youtubeUrl: { type: "STRING" }
            }
          }
        }
      }
    });
    const jsonStr = cleanJsonResponse(result.text || "[]");
    return JSON.parse(jsonStr).map((s: any, i: number) => ({ ...s, id: `song-${offset}-${i}`, rank: offset + i + 1 }));
  } catch (e) { return []; }
}

export async function fetchBibleVerses(excludeIds: string[] = []): Promise<BibleVerse[]> {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `Provide 5 Japanese Bible verses with <ruby> and Chinese translation.`,
      config: {
        systemInstruction: MANDATORY_CHINESE_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              reference: { type: "STRING" },
              japaneseText: { type: "STRING" },
              chineseTranslation: { type: "STRING" },
              sentences: { type: "ARRAY", items: { type: "STRING" } },
              translations: { type: "ARRAY", items: { type: "STRING" } },
              vocabulary: { type: "ARRAY", items: { type: "OBJECT", properties: { word: { type: "STRING" }, reading: { type: "STRING" }, meaning: { type: "STRING" } } } },
              grammar: { type: "ARRAY", items: { type: "OBJECT", properties: { point: { type: "STRING" }, explanation: { type: "STRING" }, example: { type: "STRING" } } } }
            }
          }
        }
      }
    });
    const jsonStr = cleanJsonResponse(result.text || "[]");
    const data = JSON.parse(jsonStr).map((v: any, i: number) => ({ ...v, id: `bible-${Date.now()}-${i}` }));
    saveBibleVersesToCache(data);
    return data;
  } catch (e) { return []; }
}

export async function generateQuizzes(context: string): Promise<QuizQuestion[]> {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `Generate 5 JLPT questions based on: ${context}. Explanations in Chinese.`,
      config: {
        systemInstruction: MANDATORY_CHINESE_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              type: { type: "STRING" },
              question: { type: "STRING" },
              options: { type: "ARRAY", items: { type: "STRING" } },
              correctAnswer: { type: "NUMBER" },
              explanation: { type: "STRING" },
              audioText: { type: "STRING" }
            }
          }
        }
      }
    });
    const jsonStr = cleanJsonResponse(result.text || "[]");
    return JSON.parse(jsonStr).map((q: any, i: number) => ({ ...q, id: `quiz-${Date.now()}-${i}` }));
  } catch (e) { return []; }
}
