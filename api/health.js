export default function handler(_req, res) {
  res.status(200).json({
    ok: true,
    service: 'wedding-site-bolt-api',
    timestamp: new Date().toISOString(),
  });
}
