export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const targetUrl = decodeURIComponent(req.query.url || '');
  if (!targetUrl) return res.status(400).json({ error: 'url required' });

  try {
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    if (targetUrl.includes('.m3u8')) {
      let text = await response.text();
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
      const proxyBase = '/api/proxy?url=';
      const cleanBaseUrl = baseUrl.split('?')[0];
      
      text = text.replace(/^(?!#)([^\r\n]+)$/gm, (line) => {
        line = line.trim();
        if (!line || line.startsWith('#')) return line;
        let segmentUrl = line.startsWith('http') ? line : cleanBaseUrl + line;
        return proxyBase + encodeURIComponent(segmentUrl);
      });
      
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache');
      return res.status(200).send(text);
    }
    
    res.setHeader('Content-Type', contentType);
    const buffer = await response.arrayBuffer();
    return res.status(200).send(Buffer.from(buffer));
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}