// api/rooms.js — Бүх room жагсаалт
const R = process.env.UPSTASH_REDIS_REST_URL;
const T = process.env.UPSTASH_REDIS_REST_TOKEN;

async function get(key) {
  const res = await fetch(R, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + T, 'Content-Type': 'application/json' },
    body: JSON.stringify(['GET', key])
  });
  const j = await res.json();
  try { return JSON.parse(j.result); } catch { return j.result || []; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const rooms = (await get('all_rooms')) || [];
  return res.status(200).json(rooms);
}
