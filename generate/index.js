import express from 'express';
import fetch from 'node-fetch';

console.log('Server starting...');

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

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
