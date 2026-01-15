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

    // 修复：不再使用 ...response 展开运算符，避免与手动定义的键冲突
    // 只返回前端需要的最核心数据
    return res.status(200).json({
      text: response.text,
      candidates: response.candidates,
      usageMetadata: (response as any).usageMetadata // 可选：添加用量统计
    });
  } catch (error: any) {
    console.error("Gemini API 后端错误:", error);
    return res.status(500).json({ error: error.message || 'AI 响应失败，请稍后再试' });
  }
}
