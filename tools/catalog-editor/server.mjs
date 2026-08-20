import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const toolDir = fileURLToPath(new URL('.', import.meta.url));
const projectDir = resolve(toolDir, '../..');
const dataDir = resolve(projectDir, 'public/data/v1');
const staticDir = resolve(toolDir, 'web');
const backupDir = resolve(toolDir, 'backups');
const port = Number(process.env.CATALOG_EDITOR_PORT || 4310);
const host = '127.0.0.1';
const maxBodyBytes = 20 * 1024 * 1024;

function send(response, status, body, contentType = 'application/json; charset=utf-8') {
  response.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(contentType.startsWith('application/json') ? JSON.stringify(body) : body);
}

function safeJsonFile(name) {
  if (!/^[a-z0-9][a-z0-9._-]*\.json$/i.test(name)) throw new Error('Nome file non valido.');
  const target = resolve(dataDir, name);
  if (!target.startsWith(`${dataDir}${sep}`)) throw new Error('Percorso non consentito.');
  return target;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function jsonFiles() {
  return (await readdir(dataDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === '.json')
    .map((entry) => entry.name)
    .sort((a, b) => (a === 'manifest.json' ? -1 : b === 'manifest.json' ? 1 : a.localeCompare(b)));
}

async function catalogSummary() {
  return Promise.all(
    (await jsonFiles()).map(async (name) => {
      const path = safeJsonFile(name);
      const [info, data] = await Promise.all([stat(path), readJson(path)]);
      return {
        name,
        bytes: info.size,
        kind: Array.isArray(data) ? 'array' : typeof data,
        records: Array.isArray(data) ? data.length : null,
      };
    }),
  );
}

async function requestJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) throw new Error('Il JSON supera il limite di 20 MB.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function basicWarnings(data) {
  if (!Array.isArray(data)) return [];
  const warnings = [];
  const ids = data.map((item) => item?.id).filter(Boolean);
  if (ids.length !== data.length) warnings.push('Alcuni record non hanno un campo id valorizzato.');
  if (new Set(ids).size !== ids.length) warnings.push('Sono presenti ID duplicati.');
  return warnings;
}

async function backup(paths) {
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const folder = join(backupDir, stamp);
  await mkdir(folder, { recursive: true });
  for (const path of paths) {
    try {
      await copyFile(path, join(folder, path.split(/[\\/]/).at(-1)));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return folder;
}

async function atomicJsonWrite(path, data) {
  const temp = `${path}.catalog-editor.tmp`;
  await writeFile(temp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(temp, path);
}

async function updateManifestCount(fileName, data) {
  if (fileName === 'manifest.json' || !Array.isArray(data)) return false;
  const manifestPath = safeJsonFile('manifest.json');
  const manifest = await readJson(manifestPath);
  const catalogName = Object.entries(manifest.files ?? {}).find(
    ([, file]) => file === fileName,
  )?.[0];
  if (!catalogName) return false;
  manifest.catalog ??= {};
  manifest.catalog[catalogName] = data.length;
  await atomicJsonWrite(manifestPath, manifest);
  return true;
}

async function saveCatalog(fileName, data) {
  const target = safeJsonFile(fileName);
  const manifestPath = safeJsonFile('manifest.json');
  const folder = await backup(fileName === 'manifest.json' ? [target] : [target, manifestPath]);
  await atomicJsonWrite(target, data);
  const manifestUpdated = await updateManifestCount(fileName, data);
  return { backup: folder, manifestUpdated, warnings: basicWarnings(data) };
}

async function serveStatic(pathname, response) {
  const requested = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!['index.html', 'app.js', 'styles.css'].includes(requested)) return false;
  const file = await readFile(join(staticDir, requested));
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
  };
  send(response, 200, file, types[extname(requested)]);
  return true;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || `${host}:${port}`}`);
    const catalogMatch = url.pathname.match(/^\/api\/catalogs\/([^/]+)$/);

    if (request.method === 'GET' && url.pathname === '/api/catalogs') {
      return send(response, 200, { dataDir, catalogs: await catalogSummary() });
    }
    if (request.method === 'GET' && catalogMatch) {
      const name = decodeURIComponent(catalogMatch[1]);
      return send(response, 200, { name, data: await readJson(safeJsonFile(name)) });
    }
    if (request.method === 'PUT' && catalogMatch) {
      const name = decodeURIComponent(catalogMatch[1]);
      const payload = await requestJson(request);
      if (!Object.hasOwn(payload, 'data'))
        throw new Error('Il corpo deve contenere la proprietà data.');
      const result = await saveCatalog(name, payload.data);
      return send(response, 200, { ok: true, ...result });
    }
    if (request.method === 'POST' && url.pathname === '/api/catalogs') {
      const payload = await requestJson(request);
      const name = String(payload.name || '').endsWith('.json')
        ? payload.name
        : `${payload.name}.json`;
      const target = safeJsonFile(name);
      try {
        await stat(target);
        return send(response, 409, { error: 'Esiste già un catalogo con questo nome.' });
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      await atomicJsonWrite(target, payload.data ?? []);
      return send(response, 201, { ok: true, name });
    }
    if (request.method === 'POST' && url.pathname === '/api/validate') {
      try {
        const result = await execFileAsync(process.execPath, ['scripts/validate-data.mjs'], {
          cwd: projectDir,
          timeout: 30_000,
        });
        return send(response, 200, { ok: true, output: result.stdout.trim() });
      } catch (error) {
        return send(response, 422, {
          ok: false,
          output: String(error.stderr || error.stdout || error.message).trim(),
        });
      }
    }
    if (request.method === 'GET' && (await serveStatic(url.pathname, response))) return;
    send(response, 404, { error: 'Risorsa non trovata.' });
  } catch (error) {
    send(response, 400, { error: error.message || 'Richiesta non valida.' });
  }
});

server.listen(port, host, () => {
  console.log(`Editor cataloghi: http://${host}:${port}`);
  console.log(`Cartella dati: ${dataDir}`);
});
