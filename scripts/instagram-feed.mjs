/**
 * Grupo Tinbet — últimas publicaciones de Instagram
 *
 * Descarga las últimas publicaciones de la cuenta y las deja en `data/instagram.json`, con sus
 * fotos en `assets/instagram/` (los enlaces de imagen de Instagram vencen a los pocos días, por
 * eso se guardan en el repositorio). Lo ejecuta la GitHub Action `.github/workflows/instagram.yml`.
 *
 * Variables de entorno:
 *   INSTAGRAM_TOKEN        Token de acceso (secreto del repositorio). Sin él no hace nada.
 *   INSTAGRAM_USER_ID      Solo con un token de Facebook (usuario del sistema de Meta Business):
 *                          ID de la cuenta de Instagram. Sin él se usa la API de Instagram con
 *                          inicio de sesión de Instagram (graph.instagram.com) y el token se renueva solo.
 *   INSTAGRAM_API_VERSION  Versión de la API (p. ej. "v24.0"). Por defecto, la de la app.
 *   INSTAGRAM_LIMIT        Cantidad de publicaciones (5 por defecto).
 *   GH_SECRETS_TOKEN       Opcional: token de GitHub con permiso sobre los secretos, para guardar
 *                          el token de Instagram si al renovarlo cambia.
 *   SHARP_DIR              Opcional: carpeta con `sharp` instalado, para pasar las fotos a WebP de 720 px.
 *
 * Nunca imprime el token ni las URL de la API (llevan el token).
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG_DIR = path.join(ROOT, 'assets', 'instagram');
const IMG_URL = 'assets/instagram';
const JSON_FILE = path.join(ROOT, 'data', 'instagram.json');

const env = (name) => (process.env[name] || '').trim();
let token = env('INSTAGRAM_TOKEN');
const userId = env('INSTAGRAM_USER_ID');
const version = env('INSTAGRAM_API_VERSION');
const limit = Number(env('INSTAGRAM_LIMIT')) || 5;
const base = userId ? 'https://graph.facebook.com/' : 'https://graph.instagram.com/';
const node = userId || 'me';

if (!token) {
  console.log('::warning::Falta el secreto INSTAGRAM_TOKEN: las publicaciones de Instagram no se actualizan.');
  process.exit(0);
}
console.log(`::add-mask::${token}`);

/** Llama a la API y devuelve el JSON. Los errores no incluyen la URL (lleva el token). */
async function api(endpoint, params = {}) {
  const url = new URL(`${version && !endpoint.startsWith('refresh_') ? `${version}/` : ''}${endpoint}`, base);
  Object.entries({ ...params, access_token: token }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const e = body.error || {};
    throw new Error(e.message ? `${e.type || 'Error'} ${e.code || ''}: ${e.message}` : `HTTP ${res.status}`);
  }
  return body;
}

/** Con inicio de sesión de Instagram el token dura 60 días: se renueva en cada ejecución. */
async function refreshToken() {
  try {
    const r = await api('refresh_access_token', { grant_type: 'ig_refresh_token' });
    const until = new Date(Date.now() + Number(r.expires_in || 0) * 1000).toISOString().slice(0, 10);
    console.log(`Token de Instagram renovado: vence el ${until}.`);
    if (!r.access_token || r.access_token === token) return;
    console.log(`::add-mask::${r.access_token}`);
    token = r.access_token;
    const ghToken = env('GH_SECRETS_TOKEN');
    if (ghToken && process.env.GITHUB_REPOSITORY) {
      execFileSync('gh', ['secret', 'set', 'INSTAGRAM_TOKEN', '--repo', process.env.GITHUB_REPOSITORY], {
        input: token,
        env: { ...process.env, GH_TOKEN: ghToken },
        stdio: ['pipe', 'ignore', 'inherit']
      });
      console.log('El secreto INSTAGRAM_TOKEN se actualizó con el token renovado.');
    } else {
      console.log('::warning::Instagram entregó un token nuevo. Guárdalo en el secreto INSTAGRAM_TOKEN o configura GH_SECRETS_TOKEN para que se guarde solo.');
    }
  } catch (err) {
    // Un token con menos de 24 horas todavía no se puede renovar: no es un error.
    console.log(`No se renovó el token (${err.message}).`);
  }
}

/** Foto que representa la publicación: portada del reel o primera imagen del carrusel. */
function coverOf(m) {
  if (m.media_type === 'VIDEO') return m.thumbnail_url || null;
  if (m.media_type === 'CAROUSEL_ALBUM') {
    const first = m.children && m.children.data && m.children.data[0];
    if (first) return first.media_type === 'VIDEO' ? first.thumbnail_url || null : first.media_url || null;
  }
  return m.media_url || m.thumbnail_url || null;
}

function loadSharp() {
  const dir = env('SHARP_DIR');
  if (!dir) return null;
  try { return createRequire(path.join(dir, 'node_modules', 'noop.js'))('sharp'); } catch { return null; }
}

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

async function saveImage(sharp, id, url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar la imagen`);
  const input = Buffer.from(await res.arrayBuffer());
  if (sharp) {
    const { data, info } = await sharp(input).rotate().resize({ width: 720, withoutEnlargement: true })
      .webp({ quality: 78 }).toBuffer({ resolveWithObject: true });
    const file = `${id}.webp`;
    await writeFile(path.join(IMG_DIR, file), data);
    return { file, width: info.width, height: info.height };
  }
  const type = (res.headers.get('content-type') || '').split(';')[0].trim();
  const file = `${id}.${EXT[type] || 'jpg'}`;
  await writeFile(path.join(IMG_DIR, file), input);
  return { file };
}

async function main() {
  if (!userId) await refreshToken();

  const previous = JSON.parse(await readFile(JSON_FILE, 'utf8').catch(() => '{}'));
  const known = new Map((previous.posts || []).map((p) => [p.id, p]));

  const profile = await api(node, { fields: 'username' });
  const media = await api(`${node}/media`, {
    fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}',
    limit: String(Math.max(limit * 2, 10))
  });

  const sharp = loadSharp();
  console.log(sharp ? 'Fotos: WebP de 720 px.' : 'Fotos: originales (sharp no está disponible).');
  await mkdir(IMG_DIR, { recursive: true });

  const posts = [];
  for (const m of media.data || []) {
    if (posts.length >= limit) break;
    const cover = coverOf(m);
    if (!cover || !m.permalink) continue;
    const id = String(m.id).replace(/[^\w-]/g, '');
    const old = known.get(id);
    let image = old && old.image && existsSync(path.join(ROOT, old.image)) ? { file: path.basename(old.image), width: old.width, height: old.height } : null;
    if (!image) {
      try { image = await saveImage(sharp, id, cover); } catch (err) { console.log(`Se omite ${id}: ${err.message}`); continue; }
    }
    posts.push({
      id,
      type: m.media_type,
      caption: (m.caption || '').trim(),
      url: m.permalink,
      date: m.timestamp ? new Date(m.timestamp).toISOString() : null,
      image: `${IMG_URL}/${image.file}`,
      ...(image.width ? { width: image.width, height: image.height } : {})
    });
  }

  if (!posts.length) throw new Error('La API no devolvió publicaciones con imagen.');

  // Borra las fotos de publicaciones que ya no están entre las últimas.
  const keep = new Set(posts.map((p) => path.basename(p.image)).concat('.gitkeep'));
  for (const file of await readdir(IMG_DIR)) {
    if (!keep.has(file)) await rm(path.join(IMG_DIR, file));
  }

  const username = profile.username || null;
  const next = {
    username,
    profileUrl: username ? `https://www.instagram.com/${username}/` : null,
    updatedAt: previous.updatedAt || null,
    posts
  };
  const changed = JSON.stringify({ ...next, updatedAt: null }) !== JSON.stringify({ ...previous, updatedAt: null });
  if (changed) next.updatedAt = new Date().toISOString();
  await writeFile(JSON_FILE, `${JSON.stringify(next, null, 2)}\n`);
  console.log(changed ? `Listo: ${posts.length} publicaciones de @${username}.` : 'Sin cambios en Instagram.');
}

main().catch((err) => {
  console.error(`::error::Instagram: ${err.message}`);
  process.exit(1);
});
