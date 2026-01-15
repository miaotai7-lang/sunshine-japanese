import { GoogleGenAI } from "@google/genai";

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许 POST 请求' });
  }

  const { model, contents, config: genConfig } = req.body;
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: '服务器未配置 API_KEY，请检查 Vercel 环境变量设置' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: model || 'gemini-3-flash-preview',
      contents,
      config: genConfig,
    });

    // 关键修正：SDK 的 response.text 是一个计算属性，直接返回 response 到前端时 text 会丢失
    // 所以我们要手动构造一个包含 text 的 JSON 返回
    return res.status(200).json({
      text: response.text,
      candidates: response.candidates,
      // 保持原始数据结构，以便前端处理音频等 Modality
      ...response 
    });
  } catch (error: any) {
    console.error("Gemini API 后端错误:", error);
    return res.status(500).json({ error: error.message || 'AI 响应失败，请稍后再试' });
  }
}