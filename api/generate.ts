
import { GoogleGenAI } from "@google/genai";

export const config = {
  maxDuration: 60, // 维持 60s，确保复杂任务能完成
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
    const ai = new GoogleGenAI({ apiKey });
    // 为复杂的 5 篇文章生成任务，确保模型有足够的输出配额
    const response = await ai.models.generateContent({
      model: model || 'gemini-3-flash-preview',
      contents,
      config: {
        ...genConfig,
        // 如果没有指定 maxOutputTokens，默认可能会比较保守，这里可以根据需要放开
        // 但不要设置过大以免导致超时
      },
    });

    if (!response || !response.text) {
      throw new Error("AI returned an empty response.");
    }

    return res.status(200).json({
      text: response.text,
      candidates: response.candidates,
    });
  } catch (error: any) {
    console.error("Gemini API Backend Error:", error);
    
    // 区分处理常见的错误类型
    let status = 500;
    let message = 'AI 响应失败';
    
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      message = '请求过于频繁，请稍后再试（API 配额限制）';
      status = 429;
    } else if (error.message?.includes('timeout')) {
      message = 'AI 生成耗时过长，请尝试减少内容或重试';
      status = 504;
    } else {
      message = error.message || 'AI 引擎由于未知原因中断';
    }

    return res.status(status).json({ error: message });
  }
}
