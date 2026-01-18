
import { GoogleGenAI } from "@google/genai";

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { model, contents, config: genConfig } = req.body;
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: API_KEY missing' });
  }

  try {
    // Correct initialization as per guidelines: Always use the named parameter and process.env.API_KEY directly.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    
    // Use ai.models.generateContent to query GenAI with both the model name and prompt.
    const response = await ai.models.generateContent({
      model: model || 'gemini-3-flash-preview',
      contents,
      config: {
        ...genConfig,
        temperature: 0.7,
      },
    });

    if (!response || !response.text) {
      throw new Error("AI returned an empty response.");
    }

    return res.status(200).json({
      // Access the .text property directly (not a method).
      text: response.text,
      candidates: response.candidates,
    });
  } catch (error: any) {
    console.error("Gemini API Backend Error:", error);
    
    let status = 500;
    let message = 'AI 响应失败';
    
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      message = '请求过于频繁，请稍后再试';
      status = 429;
    } else if (error.message?.includes('404') || error.message?.includes('Requested entity was not found')) {
      // Handle the "Requested entity was not found" error specifically as per guidelines.
      message = '请求的 AI 资源不可用';
      status = 404;
    } else if (error.message?.includes('timeout')) {
      message = '生成耗时过长，请重试';
      status = 504;
    } else {
      message = error.message || 'AI 引擎异常';
    }

    return res.status(status).json({ error: message });
  }
}
