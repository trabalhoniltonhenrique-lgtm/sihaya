// Gera as chaves VAPID (P-256) e uma chave de acesso aleatória.
// Uso: node server/gen-keys.mjs > server/keys.local.json   (arquivo ignorado pelo git)
import { webcrypto as crypto } from 'node:crypto';

const b64url = (bytes) => Buffer.from(bytes).toString('base64url');
const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
  'sign',
  'verify',
]);
const publicRaw = await crypto.subtle.exportKey('raw', pair.publicKey);
const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
const accessKey = b64url(crypto.getRandomValues(new Uint8Array(24)));
console.log(
  JSON.stringify(
    { VAPID_PUBLIC: b64url(publicRaw), VAPID_PRIVATE_JWK: JSON.stringify(privateJwk), ACCESS_KEY: accessKey },
    null,
    2,
  ),
);
