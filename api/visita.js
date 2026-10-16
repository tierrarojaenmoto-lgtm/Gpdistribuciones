// api/visita.js (Vercel Serverless Function)
const BOTS = /bot|crawl|spider|slurp|bing|google|yandex|baidu|duckduck|facebook|preview|monitor|headless/i;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();

  const ua = req.headers['user-agent'] || '';
  if (BOTS.test(ua)) return res.status(204).end();

  const { SLACK_WEBHOOK_URL } = process.env;
  if (!SLACK_WEBHOOK_URL) {
    console.error('Falta SLACK_WEBHOOK_URL');
    return res.status(500).end();
  }

  try {
    const pais = req.headers['x-vercel-ip-country'] || '?';
    const ciudad = decodeURIComponent(req.headers['x-vercel-ip-city'] || '?');
    const hora = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text:
          `🆕 *Visita en el catálogo*\n` +
          `*Ubicación aprox.:* ${ciudad}, ${pais}\n` +
          `*Dispositivo:* ${ua.slice(0, 120)}\n` +
          `*Hora:* ${hora}`
      })
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).end();
  }
};
