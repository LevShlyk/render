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
    if (!HF_TOKEN) return res.status(500).json({ error: 'HF_API_TOKEN is not set' });

    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Prompt not provided' });

    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0",
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const contentType = response.headers.get('content-type');
    console.log('Content-Type:', contentType);

    if (contentType && contentType.indexOf('application/json') !== -1) {
      // Если JSON - парсим как JSON
      const jsonData = await response.json();
      return res.json({ success: true, data: jsonData });
    } else {
      // Иначе - читаем бинарный буфер и отдаем base64
      const buffer = await response.arrayBuffer();
      const base64Image = Buffer.from(buffer).toString('base64');
      return res.json({
        success: true,
        image: `data:image/jpeg;base64,${base64Image}`
      });
    }
  } catch (err) {
    console.error('Error in /generate:', err);
    return res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
