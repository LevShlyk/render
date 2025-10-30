import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

app.post('/generate', async (req, res) => {
  const HF_TOKEN = process.env.HF_API_TOKEN;
  if (!HF_TOKEN) return res.status(500).json({ error: 'HF_API_TOKEN is not set' });

  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Prompt not provided' });

  try {
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    const data = await response.json();
    if (!response.ok || data.error) return res.status(500).json({ error: data.error || 'Error from HF API' });

    return res.json({ result: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
