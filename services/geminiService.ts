
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

export async function fetchLearningContent(category: LearningCategory, date: string, isAppend: boolean = false): Promise<Article[]> {
  const cached = getArticlesByDateAndCategory(date, category);
  if (!isAppend && cached.length > 0) return cached;

  let sourceInstruction = "";
  if (category === 'news') sourceInstruction = "Source: NHK News Web Easy. Get 3 latest easy-to-read news.";
  else if (category === 'forum') sourceInstruction = "Source: Yahoo!知恵袋 or 5ch summaries. Get 3 interesting discussions.";
  else sourceInstruction = "Source: Google Trends Japan or Twitter Trends JP. Get 3 hot keywords with explanations.";

  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `Task: Rapidly fetch Japanese learning content for ${date}.
      Category: ${category}.
      Strict Formatting Rules:
      1. ${sourceInstruction}
      2. Limit output to exactly 3 items.
      3. ONLY use <ruby> tags for Japanese text fields (title, content, sentences, vocabulary.word).
      4. STRIP all HTML and <ruby> tags from Chinese fields (summary, translations, meaning, explanation). These fields must be PLAIN TEXT.
      5. ALL translations and meanings MUST be in Simplified Chinese only.
      6. Strict JSON format.`,
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
    return cached;
  }
}

export async function fetchTopSongs(offset: number = 0): Promise<Song[]> {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `Search 5 Japanese Christian hymns. Japanese lyrics use <ruby>. Translation field must be PLAIN TEXT Simplified Chinese.`,
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
      contents: `Provide 5 Japanese Bible verses. Use <ruby> only for Japanese text. translations fields must be PLAIN TEXT Simplified Chinese.`,
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

export async function generateQuizzes(context: string): Promise<QuizQuestion[]> {
  try {
    const result = await callProxyAPI({
      model: 'gemini-3-flash-preview',
      contents: `Generate 5 JLPT practice questions. <ruby> for Japanese options/question. PLAIN TEXT for Chinese explanations.`,
      config: {
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
