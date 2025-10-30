module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const HF_TOKEN = process.env.HF_API_TOKEN;
    if (!HF_TOKEN) {
      return res.status(500).json({
        success: false,
        error: 'HF_API_TOKEN is not set in environment variables'
      });
    }

    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Prompt not provided. Pass prompt in { "prompt": "..." } body'
      });
    }

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

    if (!sdxlResponse.ok) {
      const errorText = await sdxlResponse.text();
      return res.status(sdxlResponse.status).json({
        success: false,
        error: 'Failed to generate image',
        details: errorText
      });
    }

    // Пробуем получить ответ как JSON
    try {
      const sdxlResult = await sdxlResponse.json();
      return res.json({
        success: true,
        model: 'stabilityai/stable-diffusion-xl-base-1.0',
        prompt: prompt,
        result: sdxlResult
      });
    } catch (jsonError) {
      // Если JSON не удалось распарсить: значит ответ бинарный (e.g. изображение)
      const buffer = await sdxlResponse.arrayBuffer();
      const base64Image = Buffer.from(buffer).toString('base64');
      return res.json({
        success: true,
        model: 'stabilityai/stable-diffusion-xl-base-1.0',
        prompt: prompt,
        image: `data:image/jpeg;base64,${base64Image}`
      });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Image generation failed: ' + error.message
    });
  }
};
