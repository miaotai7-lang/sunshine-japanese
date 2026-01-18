
import { JLPTLevel, Article, Song, LearningCategory, QuizQuestion, BibleVerse } from "../types";
import { saveArticlesToCache, getArticlesByDateAndCategory } from "./cacheService";

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

const MANDATORY_CHINESE_INSTRUCTION = `You are a professional Japanese curriculum developer.
STRICT CONTENT RULES:
1. QUANTITY: Generate exactly 5 articles.
2. SENTENCE MAPPING: The 'sentences' array must contain EVERY sentence of the 'content' in order.
3. TRANSLATION MAPPING: The 'translations' array must match the 'sentences' array 1:1 in Simplified Chinese.
4. NO SUMMARIES: 'content' must be the full article text (300-500 characters).
5. RUBY: Use <ruby> tags for ALL kanji in 'content', 'sentences', and 'vocabulary.word'.
6. SEMANTIC TAGGING: Use <span class="g-syntax"> for grammar, <span class="g-particle"> for particles, and <span class="g-place"> for locations.
7. ANALYSIS: 'vocabulary' and 'grammar' MUST be relevant to the text.`;

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
    utterance.rate = 0.9;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
    setTimeout(() => resolve(), 1000);
  });
}

export async function fetchLearningContent(
  category: LearningCategory, 
  date: string, 
  isAppend: boolean = false
): Promise<Article[]> {
  const batchId = Date.now().toString(36);
  const prompt = `Generate 5 COMPREHENSIVE Japanese articles for ${date}. Category: ${category}. Use a mix of JLPT N1-N5 levels.`;

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
                properties: { word: { type: "STRING" }, reading: { type: "STRING" }, meaning: { type: "STRING" } } 
              }},
              grammar: { type: "ARRAY", items: { 
                type: "OBJECT", 
                properties: { point: { type: "STRING" }, explanation: { type: "STRING" }, example: { type: "STRING" } } 
              }}
            }
          }
        }
      }
    });

    const jsonStr = cleanJsonResponse(result.text || "[]");
    const newArticles = JSON.parse(jsonStr).map((a: any, i: number) => ({ 
      ...a, 
      id: `${category}-${date}-${batchId}-${i}`, 
      category, 
      date 
    }));
    
    saveArticlesToCache(newArticles);
    return newArticles;
  } catch (e) { 
    return [];
  }
}

// 其余 fetch 函数保持不变...
export async function fetchTopSongs(offset: number = 0): Promise<Song[]> {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `Generate 5 Japanese Christian hymns.`,
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
      contents: `Provide 5 Japanese Bible verses.`,
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
    return JSON.parse(jsonStr).map((v: any, i: number) => ({ ...v, id: `bible-${Date.now()}-${i}` }));
  } catch (e) { return []; }
}

export async function generateQuizzes(context: string): Promise<QuizQuestion[]> {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `Generate 5 JLPT questions based on: ${context}.`,
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
