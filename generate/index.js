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
      console.error('HF_API_TOKEN is not set in environment variables');
      return res.status(500).json({ error: 'HF_API_TOKEN is not set' });
    }

    const { prompt } = req.body || {};
    if (!prompt) {
      console.error('Prompt not provided in request body');
      return res.status(400).json({ error: 'Prompt not provided' });
    }

    console.log('Sending request to Hugging Face with prompt:', prompt);

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

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hugging Face API error text:', errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const contentType = response.headers.get('content-type');
    console.log('Content-Type from Hugging Face:', contentType);

    if (contentType && contentType.includes('application/json')) {
      try {
        const jsonData = await response.json();
        console.log('Received JSON data from Hugging Face');
        return res.json({ success: true, data: jsonData });
      } catch (jsonParseError) {
        console.error('Error parsing JSON from response:', jsonParseError);
        return res.status(500).json({ error: 'Failed to parse JSON response from HF API' });
      }
    } else {
      // Для бинарных данных: изображение, PDF, etc.
      try {
        const buffer = await response.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString('base64');
        console.log('Converted binary response to base64 image');
        return res.json({
          success: true,
          image: `data:image/jpeg;base64,${base64Image}`,
        });
      } catch (bufferError) {
        console.error('Error handling binary response:', bufferError);
        return res.status(500).json({ error: 'Failed to process binary response from HF API' });
      }
    }
  } catch (err) {
    console.error('Unexpected error in /generate handler:', err);
    return res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
