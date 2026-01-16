
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
 * 极严苛的语义标注指令
 */
const MANDATORY_CHINESE_INSTRUCTION = `You are a Japanese linguistics expert for Chinese students.
STRICT RULES:
1. NO ENGLISH: All translations/explanations in Simplified Chinese only.
2. RUBY: Use <ruby> for all kanji in Japanese body text.
3. SEMANTIC TAGGING (MANDATORY): Wrap the following in <span> tags in 'content' and 'sentences':
   - Grammar structures/patterns: <span class="g-syntax">...</span>
   - Particles (は,が,を,に,へ,と,も,で,等): <span class="g-particle">...</span>
   - Place names (cities, countries): <span class="g-place">...</span>
4. PLAIN TEXT: Titles and meanings must be PLAIN TEXT (No Ruby, No Tags).
5. LEVEL: Adhere strictly to requested JLPT levels.`;

export async function fetchLearningContent(
  category: LearningCategory, 
  date: string, 
  isAppend: boolean = false,
  levelFocus: string = "N5-N1"
): Promise<Article[]> {
  const cached = getArticlesByDateAndCategory(date, category);
  if (!isAppend && cached.length > 0) return cached;

  const prompt = `Generate 3 Japanese learning articles for date ${date}. 
  Category: ${category}. 
  Level Focus: ${levelFocus}. 
  Ensure rich semantic tagging for grammar, particles, and places.`;

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
    const articles = JSON.parse(jsonStr).map((a: any, i: number) => ({ 
      ...a, 
      id: `${category}-${date}-${i}-${Math.random().toString(36).substr(2, 5)}`, 
      category, 
      date 
    }));
    saveArticlesToCache(articles);
    return articles;
  } catch (e) { 
    console.error(e);
    return cached;
  }
}

// Function to decode raw PCM audio data from base64 string
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Function to convert base64 to Uint8Array
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function playTTS(text: string) {
  try {
    const result = await callProxyAPI({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say naturally and clearly: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      }
    });

    const base64Audio = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      const bytes = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(bytes, audioContext, 24000, 1);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    }
  } catch (e) {
    console.error("TTS playback failed:", e);
  }
}

export async function fetchTopSongs(offset: number = 0): Promise<Song[]> {
  const prompt = `Generate 5 Japanese Christian worship songs or hymns. Offset: ${offset}. Return in JSON format.
  Include rank (number), title (string), artist (string), lyrics (string with <ruby> tags for all kanji), translation (string in Chinese), and youtubeUrl (dummy string).`;
  
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: MANDATORY_CHINESE_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              rank: { type: "NUMBER" },
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
    return JSON.parse(jsonStr).map((s: any, i: number) => ({
      ...s,
      id: `song-${offset}-${i}-${Math.random().toString(36).substr(2, 5)}`
    }));
  } catch (e) {
    console.error("Failed to fetch songs:", e);
    return [];
  }
}

export async function fetchBibleVerses(excludeIds: string[] = []): Promise<BibleVerse[]> {
  const prompt = `Generate 5 inspirational Bible verses in Japanese. 
  Return JSON format with: reference, japaneseText (with <ruby> tags for all kanji), chineseTranslation, sentences (array of segments with <ruby>), translations (array of Chinese for segments), vocabulary, and grammar points.`;

  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: prompt,
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
              vocabulary: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    word: { type: "STRING" },
                    reading: { type: "STRING" },
                    meaning: { type: "STRING" }
                  }
                }
              },
              grammar: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    point: { type: "STRING" },
                    explanation: { type: "STRING" },
                    example: { type: "STRING" }
                  }
                }
              }
            }
          }
        }
      }
    });
    const jsonStr = cleanJsonResponse(result.text || "[]");
    const verses = JSON.parse(jsonStr).map((v: any, i: number) => ({
      ...v,
      id: `bible-${Date.now()}-${i}`
    }));
    saveBibleVersesToCache(verses);
    return verses;
  } catch (e) {
    console.error("Failed to fetch Bible verses:", e);
    return [];
  }
}

export async function generateQuizzes(context: string): Promise<QuizQuestion[]> {
  const prompt = `Generate 5 Japanese language quiz questions based on this context: ${context}. 
  Mix types between listening, reading, grammar, and vocabulary. 
  For 'listening' type, include 'audioText'. Return in JSON format.`;

  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: prompt,
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
    return JSON.parse(jsonStr).map((q: any, i: number) => ({
      ...q,
      id: `quiz-${Date.now()}-${i}`
    }));
  } catch (e) {
    console.error("Failed to generate quizzes:", e);
    return [];
  }
}
