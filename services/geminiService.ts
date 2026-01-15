import { GoogleGenAI, Type, Modality } from "@google/genai";
import { JLPTLevel, Article, Song, BibleVerse, LearningCategory } from "../types";
import { saveArticlesToCache, saveBibleVersesToCache, getArticlesByDateAndCategory } from "./cacheService";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

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

export async function fetchLearningContent(category: LearningCategory, date: string, isAppend: boolean = false): Promise<Article[]> {
  if (!isAppend) {
    const cached = getArticlesByDateAndCategory(date, category);
    if (cached.length >= 5) return cached;
  }
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `抓取 ${date} 的日语学习内容（类别：${category}）。汉字必须标注 <ruby>。翻译必须使用简体中文。`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              content: { type: Type.STRING },
              sentences: { type: Type.ARRAY, items: { type: Type.STRING } },
              translations: { type: Type.ARRAY, items: { type: Type.STRING } },
              level: { type: Type.STRING, enum: Object.values(JLPTLevel) },
              vocabulary: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { word: { type: Type.STRING }, reading: { type: Type.STRING }, meaning: { type: Type.STRING } } } },
              grammar: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { point: { type: Type.STRING }, explanation: { type: Type.STRING }, example: { type: Type.STRING } } } }
            }
          }
        }
      }
    });
    const articles = JSON.parse(response.text || "[]").map((a: any, i: number) => ({ ...a, id: `${category}-${date}-${i}`, category, date }));
    saveArticlesToCache(articles);
    return articles;
  } catch (e) { return []; }
}

export async function fetchTopSongs(offset: number = 0): Promise<Song[]> {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `任务：搜索并返回 10 首日语基督教赞美诗。歌词必须带 <ruby>。翻译必须使用简体中文。`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              artist: { type: Type.STRING },
              lyrics: { type: Type.STRING },
              translation: { type: Type.STRING },
              youtubeUrl: { type: Type.STRING }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || "[]").map((s: any, i: number) => ({ ...s, id: `song-${offset + i}`, rank: offset + i + 1 }));
  } catch (e) { return []; }
}

export async function playTTS(text: string) {
  const ai = getAI();
  const plainText = text.replace(/<[^>]*>?/gm, '').trim();
  if (!plainText) return;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Slow and clear: ${plainText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const buffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    }
  } catch (e) { console.error(e); }
}

export async function generateQuizzes(context: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `基于内容生成10道JLPT练习题：${context}。解释请用简体中文。`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.INTEGER },
            explanation: { type: Type.STRING },
            type: { type: Type.STRING }
          }
        }
      }
    }
  });
  return JSON.parse(response.text || "[]");
}

export async function fetchBibleVerses(excludeIds: string[] = []) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `任务：提供10段日语圣经金句。汉字必须使用 <ruby>。翻译必须使用简体中文。排除 ID：${excludeIds.join(',')}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            reference: { type: Type.STRING },
            japaneseText: { type: Type.STRING },
            chineseTranslation: { type: Type.STRING },
            sentences: { type: Type.ARRAY, items: { type: Type.STRING } },
            translations: { type: Type.ARRAY, items: { type: Type.STRING } },
            vocabulary: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { word: { type: Type.STRING }, reading: { type: Type.STRING }, meaning: { type: Type.STRING } } } },
            grammar: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { point: { type: Type.STRING }, explanation: { type: Type.STRING }, example: { type: Type.STRING } } } }
          }
        }
      }
    }
  });
  const data = JSON.parse(response.text || "[]");
  saveBibleVersesToCache(data);
  return data;
}
