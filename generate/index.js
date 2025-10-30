import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

// Добавляем обработчик GET / для проверки сервера
app.get('/', (req, res) => {
  res.send('Server is running! Use POST /generate for image generation.');
});

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

    if (!response.ok) {
      // Если пришла ошибка, пытаемся прочитать текст и вернуть его
      const errorText = await response.text();
      return res.status(500).json({ error: errorText });
    }

    // Получаем бинарный ответ (изображение) в виде массива байт
    const arrayBuffer = await response.arrayBuffer();

    // Конвертируем бинарные данные в base64 строку
    const base64Image = Buffer.from(arrayBuffer).toString('base64');

    // Возвращаем base64 с указанием MIME типа (обычно jpeg)
    return res.json({ 
      success: true,
      image: `data:image/jpeg;base64,${base64Image}`
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
