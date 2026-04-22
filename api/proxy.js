// Vercel Serverless Function - HLS Video Proxy for PW
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url parameter required' });

  let targetUrl;
  try { targetUrl = decodeURIComponent(url); }
  catch { return res.status(400).json({ error: 'Invalid URL' }); }

  const allowedDomains = [
    'studyuk.site',
    'api.penpencil.co',
    'videos.penpencil.co',
    'd1d34p8vz63oiq.cloudfront.net',
    'pw.live',
    'akamaized.net',
    'cloudfront.net'
  ];

  const urlObj = new URL(targetUrl);
  const isAllowed = allowedDomains.some(d => urlObj.hostname.includes(d));
  if (!isAllowed) return res.status(403).json({ error: 'Domain not allowed' });

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
      'client-id': '5eb393ee95fab7468a79d189',
      'Accept': '*/*',
      'Origin': 'https://studyuk.site',
      'Referer': 'https://studyuk.site/'
    };
    
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // M3U8 - rewrite segment URLs
    if (targetUrl.includes('.m3u8') || targetUrl.includes('main.m3u8') || contentType.includes('mpegurl')) {
      let text = await response.text();
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
      const proxyBase = '/api/proxy?url=';
      const cleanBaseUrl = baseUrl.split('?')[0];

      text = text.replace(/^(?!#)([^\r\n]+)$/gm, (line) => {
        line = line.trim();
        if (!line || line.startsWith('#')) return line;
        let segmentUrl = line.startsWith('http') ? line : cleanBaseUrl + line;
        return proxyBase + encodeURIComponent(segmentUrl + (segmentUrl.includes('?')?'&':'?') + '_cb=' + Date.now());
      });

      text = text.replace(/URI="([^"]+)"/g, (match, uri) => {
        let keyUrl = uri.startsWith('http') ? uri : cleanBaseUrl + uri;
        return `URI="${proxyBase + encodeURIComponent(keyUrl)}"`;
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache');
      return res.status(200).send(text);
    }

    // Video segments
    let finalContentType = contentType;
    if (targetUrl.includes('.ts')) finalContentType = 'video/mp2t';
    else if (targetUrl.includes('.m4s')) finalContentType = 'video/iso.segment';
    else if (targetUrl.includes('.mp4')) finalContentType = 'video/mp4';

    res.setHeader('Content-Type', finalContentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
    const buffer = await response.arrayBuffer();
    return res.status(200).send(Buffer.from(buffer));

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
}