import { GEMINI_API_BASE } from './config.mjs';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

/**
 * Call gemini-3-pro-image (Nano Banana Pro) via generateContent and return
 * the raw image bytes it produced. Retries on rate limits / transient
 * server errors with exponential backoff; fails fast on anything else
 * (bad API key, bad model name, invalid request) so problems surface
 * immediately instead of burning retries.
 */
export async function generateImage({
  apiKey,
  model,
  prompt,
  aspectRatio,
  imageSize,
  maxRetries = 3,
}) {
  const url = `${GEMINI_API_BASE}/${model}:generateContent`;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: { aspectRatio, imageSize },
    },
  });

  let attempt = 0;
  for (;;) {
    attempt += 1;
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body,
      });
    } catch (err) {
      if (attempt > maxRetries) throw new Error(`Network error calling Gemini: ${err.message}`);
      await sleep(2 ** attempt * 1000);
      continue;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      if (RETRYABLE_STATUS.has(res.status) && attempt <= maxRetries) {
        await sleep(2 ** attempt * 1000);
        continue;
      }
      throw new Error(`Gemini API error ${res.status}: ${text.slice(0, 500)}`);
    }

    const json = await res.json();
    const parts = json?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inlineData?.data);
    if (!imagePart) {
      const finishReason = json?.candidates?.[0]?.finishReason;
      throw new Error(
        `Gemini returned no image (finishReason: ${finishReason || 'unknown'}). ` +
          `Response: ${JSON.stringify(json).slice(0, 500)}`
      );
    }

    return {
      data: Buffer.from(imagePart.inlineData.data, 'base64'),
      mimeType: imagePart.inlineData.mimeType || 'image/png',
    };
  }
}

export function extensionForMime(mimeType) {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  return 'jpg';
}
