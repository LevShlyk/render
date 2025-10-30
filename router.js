module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const HF_TOKEN = process.env.HF_API_TOKEN;
    console.log('HF_TOKEN:', HF_TOKEN);

    if (!HF_TOKEN) {
      return res.json({
        success: false,
        error: 'HF_API_TOKEN is not set in environment variables',
        solution: 'Add HF_API_TOKEN to your Vercel project settings'
      });
    }

    // Диагностика токена Hugging Face
    const whoamiResponse = await fetch('https://huggingface.co/api/whoami', {
      headers: { 'Authorization': `Bearer ${HF_TOKEN}` }
    });
    if (!whoamiResponse.ok) {
      const errorText = await whoamiResponse.text();
      return res.json({
        success: false,
        error: `Invalid HF token (HTTP ${whoamiResponse.status})`,
        details: errorText
      });
    }

    // Получаем prompt из body запроса
    const { prompt } = await req.json?.() || req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.json({
        success: false,
        error: 'Prompt not provided. Pass prompt in { "prompt": "..." } body'
      });
    }

    // POST запрос к SDXL через Inference Providers
    const sdxlResponse = await fetch(
      "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    const sdxlResult = await sdxlResponse.json();

    // Если пришла ошибка от Hugging Face
    if (!sdxlResponse.ok || sdxlResult.error) {
      return res.json({
        success: false,
        error: 'Failed to generate image',
        details: sdxlResult.error || sdxlResult,
        status: sdxlResponse.status
      });
    }

    // Обычно результат возвращается с полем image (base64-строка, png/jpg)
    return res.json({
      success: true,
      model: 'stabilityai/stable-diffusion-xl-base-1.0',
      prompt: prompt,
      result: sdxlResult,
    });

  } catch (error) {
    console.error('Image generation error:', error);
    return res.json({
      success: false,
      error: 'Image generation failed: ' + error.message
    });
  }
};
