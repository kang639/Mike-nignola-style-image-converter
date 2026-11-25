export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { prompt, imageDataUrl, apiKey } = JSON.parse(event.body || '{}');
    const key = process.env.GEMINI_API_KEY || apiKey;

    if (!key) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Netlify 환경변수 GEMINI_API_KEY가 설정되지 않았습니다.' })
      };
    }

    const parts = [{ text: prompt }];

    if (imageDataUrl) {
      const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        });
      }
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ['IMAGE']
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error?.message || 'Gemini API 호출 실패' })
      };
    }

    const imgPart = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);

    if (!imgPart) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'AI가 이미지를 생성하지 못했습니다. 다른 문구로 다시 시도해 주세요.' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: imgPart.inlineData.data,
        mimeType: imgPart.inlineData.mimeType || 'image/png'
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || '서버 내부 오류' })
    };
  }
}
