
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

// 缓存音频上下文，减少每次播放的初始化时间
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

export async function fetchLearningContent(category: LearningCategory, date: string, isAppend: boolean = false): Promise<Article[]> {
  // 离线优先：如果缓存中有数据且不是强制刷新（isAppend），则直接返回，不展示加载动画
  const cached = getArticlesByDateAndCategory(date, category);
  if (!isAppend && cached.length > 0) {
    return cached;
  }

  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `任务：抓取 ${date} 的日语学习内容（类别：${category}）。
      要求：
      1. 返回 JSON。汉字标注 <ruby>。
      2. 所有翻译必须强制使用简体中文，禁止使用英文。
      3. 解释和语法说明必须为简体中文。`,
      config: {
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
              vocabulary: { type: "ARRAY", items: { type: "OBJECT", properties: { word: { type: "STRING" }, reading: { type: "STRING" }, meaning: { type: "STRING" } } } },
              grammar: { type: "ARRAY", items: { type: "OBJECT", properties: { point: { type: "STRING" }, explanation: { type: "STRING" }, example: { type: "STRING" } } } }
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
    return cached; // 报错则降级使用缓存
  }
}

export async function fetchTopSongs(offset: number = 0): Promise<Song[]> {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `搜索日语基督教赞美诗。汉字带 <ruby>。翻译必须为简体中文。`,
      config: {
        tools: [{ googleSearch: {} }],
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
    return JSON.parse(jsonStr).map((s: any, i: number) => ({ ...s, id: `song-${offset + i}`, rank: offset + i + 1 }));
  } catch (e) { return []; }
}

export async function fetchBibleVerses(excludeIds: string[] = []) {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `提供10段日语圣经金句。汉字使用 <ruby>。翻译强制为简体中文。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              id: { type: "STRING" },
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
    const data = JSON.parse(jsonStr);
    saveBibleVersesToCache(data);
    return data;
  } catch (e) { return []; }
}

/**
 * Generates quiz questions based on the provided context using Gemini 3 Flash.
 */
export async function generateQuizzes(context: string): Promise<QuizQuestion[]> {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `任务：基于以下内容生成10道日语练习题（题型包含：听力理解、阅读理解、语法、词汇）：${context}。
      要求：
      1. 返回 JSON 数组。
      2. 汉字标注 <ruby>。
      3. 听力题 (listening) 必须包含 audioText 字段（纯日语，不带ruby，用于TTS播放）。
      4. 题目、选项和解析必须使用简体中文。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              type: { type: "STRING", description: "listening, reading, grammar, or vocabulary" },
              question: { type: "STRING" },
              options: { type: "ARRAY", items: { type: "STRING" } },
              correctAnswer: { type: "NUMBER", description: "Correct option index (0-3)" },
              explanation: { type: "STRING" },
              audioText: { type: "STRING" }
            },
            required: ["type", "question", "options", "correctAnswer", "explanation"]
          }
        }
      }
    });

    const jsonStr = cleanJsonResponse(result.text || "[]");
    const data = JSON.parse(jsonStr);
    return data.map((q: any, i: number) => ({
      ...q,
      id: `quiz-${Date.now()}-${i}`,
      type: (['listening', 'reading', 'grammar', 'vocabulary'].includes(q.type?.toLowerCase()) 
        ? q.type.toLowerCase() 
        : 'vocabulary') as QuizQuestion['type']
    }));
  } catch (e) {
    console.error("Generate Quizzes Error:", e);
    return [];
  }
}
