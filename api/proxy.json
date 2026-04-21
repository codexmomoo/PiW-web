// Vercel Serverless Function - HLS Video Proxy for PW
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'url parameter required' });
  }

  let targetUrl;
  try {
    targetUrl = decodeURIComponent(url);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // PW specific allowed domains
  const allowedDomains = [
    'studyuk.site',
    'api.penpencil.co',
    'videos.penpencil.co',
    'd1d34p8vz63oiq.cloudfront.net',
    'pw.live',
    'akamaized.net',
    'cloudfront.net',
  ];

  const urlObj = new URL(targetUrl);
  const isAllowed = allowedDomains.some(d => urlObj.hostname.includes(d));

  if (!isAllowed) {
    return res.status(403).json({ error: 'Domain not allowed: ' + urlObj.hostname });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
        'client-id': '5eb393ee95fab7468a79d189',
        'Accept': '*/*',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Upstream error: ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // M3U8 file - segment URLs ko proxy karo
    if (targetUrl.includes('.m3u8') || targetUrl.includes('main.m3u8') || contentType.includes('mpegurl')) {
      let text = await response.text();
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
      const proxyBase = '/api/proxy?url=';
      const cleanBaseUrl = baseUrl.split('?')[0];

      // Rewrite segment URLs (.ts files)
      text = text.replace(/^(?!#)([^\r\n]+)$/gm, (line) => {
        line = line.trim();
        if (!line || line.startsWith('#')) return line;

        let segmentUrl;
        if (line.startsWith('http://') || line.startsWith('https://')) {
          segmentUrl = line;
        } else {
          segmentUrl = cleanBaseUrl + line;
        }

        const separator = segmentUrl.includes('?') ? '&' : '?';
        return proxyBase + encodeURIComponent(segmentUrl + separator + '_cb=' + Date.now());
      });

      // Rewrite key URIs (for encrypted HLS)
      text = text.replace(/URI="([^"]+)"/g, (match, uri) => {
        let keyUrl;
        if (uri.startsWith('http://') || uri.startsWith('https://')) {
          keyUrl = uri;
        } else {
          keyUrl = cleanBaseUrl + uri;
        }
        return `URI="${proxyBase + encodeURIComponent(keyUrl)}"`;
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache, no-store');
      return res.status(200).send(text);
    }

    // Video segments (.ts, .m4s, .mp4)
    let finalContentType = contentType;
    if (targetUrl.includes('.ts')) finalContentType = 'video/mp2t';
    else if (targetUrl.includes('.m4s')) finalContentType = 'video/iso.segment';
    else if (targetUrl.includes('.mp4')) finalContentType = 'video/mp4';

    res.setHeader('Content-Type', finalContentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const buffer = await response.arrayBuffer();
    return res.status(200).send(Buffer.from(buffer));

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
}