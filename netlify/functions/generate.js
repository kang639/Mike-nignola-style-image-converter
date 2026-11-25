exports.handler = async function (event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { prompt, width = 1024, height = 768 } = JSON.parse(event.body || '{}');

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '프롬프트가 비어 있습니다.' })
      };
    }

    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 1000000);
    const safeW = Math.min(1280, Math.max(512, Number(width) || 1024));
    const safeH = Math.min(1280, Math.max(512, Number(height) || 768));

    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${safeW}&height=${safeH}&seed=${seed}&nologo=true&model=flux`;

    const response = await fetch(imageUrl);

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: `이미지 생성 서버 오류 (${response.status})` })
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        imageBase64: base64,
        mimeType: 'image/jpeg'
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || '서버 내부 오류' })
    };
  }
};
