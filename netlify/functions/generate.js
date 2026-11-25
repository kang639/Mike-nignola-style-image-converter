exports.handler = async function (event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { prompt, imageDataUrl } = JSON.parse(event.body || '{}');

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '프롬프트가 비어 있습니다.' })
      };
    }

    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(prompt);
    let targetUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&seed=${seed}&nologo=true&model=flux`;

    // 원본 사진이 업로드된 경우: 임시 호스팅에 올린 뒤 Image-to-Image(kontext) 모델로 원본 구도 유지 변환
    if (imageDataUrl) {
      const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const ext = mimeType.split('/')[1] || 'jpg';
        const buffer = Buffer.from(match[2], 'base64');

        const formData = new FormData();
        formData.append('file', new Blob([buffer], { type: mimeType }), `upload.${ext}`);

        const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', {
          method: 'POST',
          body: formData
        });

        if (uploadRes.ok) {
          const uploadJson = await uploadRes.json();
          const rawUrl = uploadJson?.data?.url;
          if (rawUrl) {
            const directImageUrl = rawUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
            targetUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=kontext&image=${encodeURIComponent(directImageUrl)}&seed=${seed}&nologo=true`;
          }
        }
      }
    }

    const response = await fetch(targetUrl);

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
