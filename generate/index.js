import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server is running! Use POST /generate for image generation.');
});

app.post('/generate', async (req, res) => {
  try {
    const HF_TOKEN = process.env.HF_API_TOKEN;
    if (!HF_TOKEN) {
      console.error('[ERROR] HF_API_TOKEN is not set in environment variables');
      return res.status(500).json({ error: 'HF_API_TOKEN is not set' });
    }

    const { prompt } = req.body || {};
    if (!prompt) {
      console.error('[ERROR] Prompt not provided in request body');
      return res.status(400).json({ error: 'Prompt not provided' });
    }

    console.log('[INFO] Sending request to Hugging Face with prompt:', prompt);

    const response = await fetch(
      'https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    console.log('[INFO] Response status:', response.status);
    const contentType = response.headers.get('content-type');
    console.log('[INFO] Content-Type from Hugging Face:', contentType);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ERROR] Hugging Face API error:', errorText);
      return res.status(response.status).json({ error: errorText });
    }

    if (contentType && contentType.includes('application/json')) {
      // Обработка JSON-ответа
      try {
        const jsonData = await response.json();
        console.log('[INFO] Received JSON data from Hugging Face');
        return res.json({ success: true, data: jsonData });
      } catch (jsonParseError) {
        console.error('[ERROR] Error parsing JSON from response:', jsonParseError);
        return res.status(500).json({ error: 'Failed to parse JSON response from HF API' });
      }
    } else if (contentType && contentType.startsWith('image/')) {
      // Обработка бинарных данных (изображений)
      try {
        const buffer = await response.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString('base64');
        console.log('[INFO] Converted binary response to base64 image');
        return res.json({
          success: true,
          image: `data:${contentType};base64,${base64Image}`,
        });
      } catch (bufferError) {
        console.error('[ERROR] Error handling binary response:', bufferError);
        return res.status(500).json({ error: 'Failed to process binary response from HF API' });
      }
    } else {
      // Неизвестный или неожиданный Content-Type
      const textData = await response.text();
      console.error('[ERROR] Unexpected content type:', contentType);
      return res.status(500).json({ error: `Unexpected content type: ${contentType}`, data: textData });
    }
  } catch (err) {
    console.error('[ERROR] Unexpected error in /generate handler:', err);
    return res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`[INFO] Server listening on port ${port}`);
});
