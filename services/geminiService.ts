
import { JLPTLevel, Article, Song, LearningCategory, QuizQuestion } from "../types";
import { saveArticlesToCache, saveBibleVersesToCache, getArticlesByDateAndCategory } from "./cacheService";

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
  cleaned = cleaned.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
  return cleaned;
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
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

let sharedAudioCtx: AudioContext | null = null;

export async function playTTS(text: string) {
  try {
    if (!sharedAudioCtx) {
      sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    
    const response = await callProxyAPI({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `朗读这段日语，请语速自然清晰：${text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioBuffer = await decodeAudioData(decode(base64Audio), sharedAudioCtx, 24000, 1);
      const source = sharedAudioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(sharedAudioCtx.destination);
      source.start(0);
    }
  } catch (e) {
    console.error("TTS Error:", e);
  }
}

/**
 * 核心锁定指令：不仅锁定语言为中文，还严格限制 HTML/Ruby 标签的使用。
 */
const MANDATORY_CHINESE_INSTRUCTION = `You are a professional Japanese-to-Chinese education bot. 
STRICT OUTPUT RULES:
1. NO ENGLISH: All translations, meanings, grammar explanations, and summaries MUST be in Simplified Chinese. Absolutely no English words allowed.
2. RUBY RESTRICTION: Use <ruby> tags ONLY for Japanese body text/lyrics.
3. PLAIN TEXT ONLY: Titles, References, Word Meanings, and Grammar Explanations MUST be plain text (No <ruby>, No HTML).
4. NO EXCEPTIONS: Even if the source has English, translate it to Simplified Chinese.`;

export async function fetchLearningContent(category: LearningCategory, date: string, isAppend: boolean = false): Promise<Article[]> {
  const cached = getArticlesByDateAndCategory(date, category);
  if (!isAppend && cached.length > 0) return cached;

  let sourceInstruction = "";
  if (category === 'news') sourceInstruction = "Source: NHK News Web Easy. Get 3 articles.";
  else if (category === 'forum') sourceInstruction = "Source: Yahoo Japan. Get 3 interesting Q&A.";
  else sourceInstruction = "Source: Google Trends Japan. Get 3 topics.";

  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `Generate content for ${date}. Category: ${category}. ${sourceInstruction}`,
      config: {
        systemInstruction: MANDATORY_CHINESE_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING", description: "Japanese title in PLAIN TEXT. NO <ruby> tags." },
              summary: { type: "STRING", description: "Simplified Chinese summary. NO ENGLISH. NO HTML." },
              content: { type: "STRING", description: "Japanese body with <ruby> tags." },
              sentences: { type: "ARRAY", items: { type: "STRING" }, description: "Japanese sentences with <ruby>." },
              translations: { type: "ARRAY", items: { type: "STRING" }, description: "Translations in SIMPLIFIED CHINESE ONLY. NO ENGLISH." },
              level: { type: "STRING" },
              vocabulary: { type: "ARRAY", items: { 
                type: "OBJECT", 
                properties: { 
                  word: { type: "STRING", description: "Japanese word with <ruby> (only here)." }, 
                  reading: { type: "STRING" }, 
                  meaning: { type: "STRING", description: "Meaning in SIMPLIFIED CHINESE ONLY. NO ENGLISH. NO RUBY." } 
                } 
              }},
              grammar: { type: "ARRAY", items: { 
                type: "OBJECT", 
                properties: { 
                  point: { type: "STRING", description: "Grammar point name. PLAIN TEXT ONLY." }, 
                  explanation: { type: "STRING", description: "Explanation in SIMPLIFIED CHINESE ONLY. NO ENGLISH." }, 
                  example: { type: "STRING", description: "Example sentence with <ruby>." } 
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

export async function fetchTopSongs(offset: number = 0): Promise<Song[]> {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `Find 5 Japanese Christian hymns. Titles must be plain Japanese. Translations must be Simplified Chinese.`,
      config: {
        systemInstruction: MANDATORY_CHINESE_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING", description: "Song title in PLAIN TEXT Japanese. DO NOT USE <ruby>." },
              artist: { type: "STRING", description: "Plain text." },
              lyrics: { type: "STRING", description: "Japanese lyrics with <ruby> tags." },
              translation: { type: "STRING", description: "Lyrics translated to SIMPLIFIED CHINESE ONLY. NO ENGLISH. NO HTML." },
              youtubeUrl: { type: "STRING" }
            }
          }
        }
      }
    });
    const jsonStr = cleanJsonResponse(result.text || "[]");
    return JSON.parse(jsonStr).map((s: any, i: number) => ({ ...s, id: `song-${offset + i}`, rank: offset + i + 1 }));
  } catch (e) { return []; }
}

export async function fetchBibleVerses(excludeIds: string[] = []) {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `Provide 5 Japanese Bible verses. Reference and translation must be clean text (No Ruby).`,
      config: {
        systemInstruction: MANDATORY_CHINESE_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              id: { type: "STRING" },
              reference: { type: "STRING", description: "Plain text (e.g. 'ヨハネ 3:16'). NO <ruby>." },
              japaneseText: { type: "STRING", description: "Japanese verse with <ruby>." },
              chineseTranslation: { type: "STRING", description: "SIMPLIFIED CHINESE translation only. NO ENGLISH." },
              sentences: { type: "ARRAY", items: { type: "STRING" }, description: "Japanese with <ruby>." },
              translations: { type: "ARRAY", items: { type: "STRING" }, description: "Simplified Chinese ONLY." },
              vocabulary: { type: "ARRAY", items: { 
                type: "OBJECT", 
                properties: { 
                  word: { type: "STRING" }, 
                  reading: { type: "STRING" }, 
                  meaning: { type: "STRING", description: "SIMPLIFIED CHINESE ONLY. NO ENGLISH." } 
                } 
              }},
              grammar: { type: "ARRAY", items: { 
                type: "OBJECT", 
                properties: { 
                  point: { type: "STRING" }, 
                  explanation: { type: "STRING", description: "SIMPLIFIED CHINESE ONLY. NO ENGLISH." }, 
                  example: { type: "STRING" } 
                } 
              }}
            }
          }
        }
      }
    });
    const jsonStr = cleanJsonResponse(result.text || "[]");
    const data = JSON.parse(jsonStr);
    saveBibleVersesToCache(data);
    return data;
  } catch (e) { return []; }
}

export async function generateQuizzes(context: string): Promise<QuizQuestion[]> {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `Generate 5 JLPT questions based on: ${context}. Explanations must be Simplified Chinese.`,
      config: {
        systemInstruction: MANDATORY_CHINESE_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              type: { type: "STRING" },
              question: { type: "STRING", description: "Japanese with <ruby>." },
              options: { type: "ARRAY", items: { type: "STRING" }, description: "Japanese with <ruby>." },
              correctAnswer: { type: "NUMBER" },
              explanation: { type: "STRING", description: "Simplified Chinese explanation. NO ENGLISH. NO RUBY." },
              audioText: { type: "STRING" }
            }
          }
        }
      }
    });
    const jsonStr = cleanJsonResponse(result.text || "[]");
    const data = JSON.parse(jsonStr);
    return data.map((q: any, i: number) => ({
      ...q,
      id: `quiz-${Date.now()}-${i}`,
      type: q.type?.toLowerCase() || 'vocabulary'
    }));
  } catch (e) {
    return [];
  }
}
