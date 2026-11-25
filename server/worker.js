// SIHAYA — servidor de notificações (Cloudflare Worker).
// Guarda a inscrição de push do iPhone e a lista de horários; a cada minuto (cron)
// envia um push VAZIO no horário certo. O texto do Brolaith é escolhido no aparelho,
// então nenhuma fala ou dado de saúde passa por aqui.
//
// Variáveis (wrangler secret put ...): ACCESS_KEY, VAPID_PUBLIC, VAPID_PRIVATE_JWK.
// Variável comum (wrangler.toml): VAPID_SUBJECT, ALLOWED_ORIGINS. KV: SUBS.

const json = (data, status = 200, origin = '*') =>
  new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': origin,
      'access-control-allow-headers': 'content-type, authorization',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      vary: 'origin',
    },
  });

const b64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const textB64url = (s) => b64url(new TextEncoder().encode(s));

// JWT VAPID (ES256) assinado com a chave privada guardada como segredo.
async function vapidHeader(endpoint, env) {
  const aud = new URL(endpoint).origin;
  const header = textB64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = textB64url(
    JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT }),
  );
  const key = await crypto.subtle.importKey(
    'jwk',
    JSON.parse(env.VAPID_PRIVATE_JWK),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  return `vapid t=${header}.${payload}.${b64url(sig)}, k=${env.VAPID_PUBLIC}`;
}

async function sendPush(sub, env) {
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      authorization: await vapidHeader(sub.endpoint, env),
      ttl: '600',
      urgency: 'high',
      'content-length': '0',
    },
  });
  return res.status;
}

// Hora local (HH:MM) no fuso informado pelo aparelho.
function localTime(timezone, date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone || 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

const allowedOrigin = (req, env) => {
  const origin = req.headers.get('origin') || '';
  const list = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim());
  return list.includes(origin) ? origin : list[0] || '*';
};
const authorized = (req, env) =>
  !!env.ACCESS_KEY && req.headers.get('authorization') === 'Bearer ' + env.ACCESS_KEY;

export default {
  async fetch(req, env) {
    const origin = allowedOrigin(req, env);
    if (req.method === 'OPTIONS') return json({}, 204, origin);
    const { pathname } = new URL(req.url);
    if (pathname === '/vapid' && req.method === 'GET')
      return json({ publicKey: env.VAPID_PUBLIC }, 200, origin);
    if (!authorized(req, env)) return json({ error: 'não autorizado' }, 401, origin);

    if (pathname === '/subscribe' && req.method === 'POST') {
      const body = await req.json().catch(() => null);
      const sub = body?.subscription;
      if (!sub?.endpoint || !/^https:\/\//.test(sub.endpoint))
        return json({ error: 'inscrição inválida' }, 400, origin);
      const schedule = (Array.isArray(body.schedule) ? body.schedule : [])
        .filter((x) => /^([01]\d|2[0-3]):[0-5]\d$/.test(x?.time || ''))
        .slice(0, 200)
        .map((x) => ({ time: x.time, kind: x.kind === 'meal' ? 'meal' : 'water' }));
      await env.SUBS.put(
        'sub',
        JSON.stringify({
          endpoint: sub.endpoint,
          schedule,
          timezone: String(body.timezone || 'America/Sao_Paulo'),
          updated: new Date().toISOString(),
        }),
      );
      return json({ ok: true, reminders: schedule.length }, 200, origin);
    }
    if (pathname === '/test' && req.method === 'POST') {
      const sub = JSON.parse((await env.SUBS.get('sub')) || 'null');
      if (!sub) return json({ error: 'nenhum aparelho conectado' }, 404, origin);
      const status = await sendPush(sub, env);
      return json({ ok: status < 300, status }, status < 300 ? 200 : 502, origin);
    }
    return json({ error: 'não encontrado' }, 404, origin);
  },

  // Cron: a cada minuto, envia o push se houver lembrete neste horário.
  async scheduled(event, env, ctx) {
    const sub = JSON.parse((await env.SUBS.get('sub')) || 'null');
    if (!sub?.schedule?.length) return;
    const now = localTime(sub.timezone, new Date(event.scheduledTime));
    if (!sub.schedule.some((x) => x.time === now)) return;
    ctx.waitUntil(
      sendPush(sub, env).then(async (status) => {
        // 404/410: a inscrição deixou de existir (app removido ou permissão revogada).
        if (status === 404 || status === 410) await env.SUBS.delete('sub');
      }),
    );
  },
};
