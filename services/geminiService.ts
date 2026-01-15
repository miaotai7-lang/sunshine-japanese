import { JLPTLevel, Article, Song, LearningCategory } from "../types";
import { saveArticlesToCache, saveBibleVersesToCache, getArticlesByDateAndCategory } from "./cacheService";

// 统一的代理请求函数
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

// 辅助函数：解码 Base64 音频
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

export async function playTTS(text: string) {
  try {
    const response = await callProxyAPI({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `朗读这段日语，语速自然：${text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start();
    }
  } catch (e) {
    console.error("TTS Error via Proxy:", e);
  }
}

export async function fetchLearningContent(category: LearningCategory, date: string, isAppend: boolean = false): Promise<Article[]> {
  if (!isAppend) {
    const cached = getArticlesByDateAndCategory(date, category);
    if (cached.length >= 5) return cached;
  }

  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `任务：抓取 ${date} 的日语学习内容（类别：${category}）。汉字必须标注 <ruby>。翻译必须使用简体中文。`,
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

    const articles = JSON.parse(result.text || "[]").map((a: any, i: number) => ({ 
      ...a, 
      id: `${category}-${date}-${i}`, 
      category, 
      date 
    }));
    saveArticlesToCache(articles);
    return articles;
  } catch (e) { 
    console.error(e);
    return []; 
  }
}

export async function fetchTopSongs(offset: number = 0): Promise<Song[]> {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `任务：搜索并返回 10 首日语基督教赞美诗。歌词必须带 <ruby>。翻译必须使用简体中文。`,
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
    return JSON.parse(result.text || "[]").map((s: any, i: number) => ({ ...s, id: `song-${offset + i}`, rank: offset + i + 1 }));
  } catch (e) { return []; }
}

export async function generateQuizzes(context: string) {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `基于内容生成10道JLPT练习题：${context}。解释请用简体中文。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              question: { type: "STRING" },
              options: { type: "ARRAY", items: { type: "STRING" } },
              correctAnswer: { type: "INTEGER" },
              explanation: { type: "STRING" },
              type: { type: "STRING" }
            }
          }
        }
      }
    });
    return JSON.parse(result.text || "[]");
  } catch (e) { return []; }
}

export async function fetchBibleVerses(excludeIds: string[] = []) {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `任务：提供10段日语圣经金句。汉字必须使用 <ruby>。翻译必须使用简体中文。排除 ID：${excludeIds.join(',')}`,
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
    const data = JSON.parse(result.text || "[]");
    saveBibleVersesToCache(data);
    return data;
  } catch (e) { return []; }
}
