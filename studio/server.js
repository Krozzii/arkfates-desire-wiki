const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const {spawn} = require("node:child_process");
const {DEFAULT_HOMEPAGE, validateHomepageConfig} = require("./shared/homepageSchema");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const STUDIO_ROOT = __dirname;
const APP_PORT = Number.parseInt(process.env.ARKFATES_STUDIO_PORT || "3001", 10);
const PREVIEW_PORT = APP_PORT + 1;
const LOOPBACK = "127.0.0.1";
const ADMIN_ORIGIN = `http://${LOOPBACK}:${APP_PORT}`;
const PREVIEW_DIRECTORY = path.join(PROJECT_ROOT, ".arkfates-studio", "preview");
const SOURCE_CONFIG = path.join(PROJECT_ROOT, ".arkfates-studio", "homepage.json");
const STATE_DIRECTORY = path.join(PROJECT_ROOT, ".arkfates-studio", "state");
const DRAFT_CONFIG = path.join(STATE_DIRECTORY, "homepage-draft.json");
const MEDIA_DIRECTORY = path.join(PROJECT_ROOT, ".arkfates-studio", "media");
const MEDIA_INDEX = path.join(STATE_DIRECTORY, "media.json");
const PREVIEW_META = path.join(STATE_DIRECTORY, "preview.json");
const PUBLIC_MEDIA_DIRECTORY = path.join(PROJECT_ROOT, "src", "site", "img");
const MAX_JSON_BYTES = 32 * 1024;
const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
const ALLOWED_MEDIA = new Map([
  ["image/png", {extension: ".png", signature: (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))}],
  ["image/jpeg", {extension: ".jpg", signature: (b) => b.length > 2 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff}],
  ["image/webp", {extension: ".webp", signature: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP"}],
  ["image/gif", {extension: ".gif", signature: (b) => ["GIF87a", "GIF89a"].includes(b.subarray(0, 6).toString())}],
  ["image/avif", {extension: ".avif", signature: (b) => b.subarray(4, 12).toString().includes("ftyp") && /avi[fs]/.test(b.subarray(8, 16).toString())}],
]);
const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"], [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"], [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"], [".xml", "application/xml; charset=utf-8"],
  [".svg", "image/svg+xml"], [".png", "image/png"], [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"], [".webp", "image/webp"], [".gif", "image/gif"],
  [".avif", "image/avif"], [".woff2", "font/woff2"], [".woff", "font/woff"],
  [".ico", "image/x-icon"], [".txt", "text/plain; charset=utf-8"],
]);

let previewBuildInFlight = null;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function isInside(root, target) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function ensureSafeDirectory(root, target, create = false) {
  const absoluteRoot = path.resolve(root);
  const absoluteTarget = path.resolve(target);
  if (!isInside(absoluteRoot, absoluteTarget)) throw new Error("La ruta queda fuera del repositorio.");
  let current = absoluteRoot;
  for (const part of path.relative(absoluteRoot, absoluteTarget).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try {
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("La ruta local no puede atravesar enlaces simbólicos ni archivos.");
    } catch (error) {
      if (error.code !== "ENOENT" || !create) throw error;
      fs.mkdirSync(current);
    }
  }
  return absoluteTarget;
}

function ensureSafeFileParent(root, filePath, create = false) {
  if (!isInside(root, filePath)) throw new Error("La ruta queda fuera del repositorio.");
  ensureSafeDirectory(root, path.dirname(filePath), create);
  try {
    const stat = fs.lstatSync(filePath);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("El destino debe ser un archivo regular y no un enlace simbólico.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function prepareStudioPaths(paths) {
  ensureSafeDirectory(paths.projectRoot, path.dirname(paths.sourceConfig), true);
  ensureSafeDirectory(paths.projectRoot, paths.stateDirectory, true);
  for (const filePath of [paths.sourceConfig, paths.draftConfig, paths.mediaIndex, paths.previewMeta]) {
    ensureSafeFileParent(paths.projectRoot, filePath);
  }
}

function safeResolve(root, relativePath) {
  if (typeof relativePath !== "string" || relativePath.includes("\0") || relativePath.includes("\\")) return null;
  const pieces = relativePath.split(/[\/]+/).filter(Boolean);
  if (pieces.some((piece) => piece === "." || piece === ".." || piece.startsWith("."))) return null;
  const resolved = path.resolve(root, ...pieces);
  if (!isInside(root, resolved)) return null;
  return resolved;
}

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(value));
}

function readRegularJson(filePath, fallback) {
  try {
    const stat = fs.lstatSync(filePath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("El archivo de configuración debe ser un archivo regular.");
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return {exists: true, raw, value: parsed, revision: sha256(raw), modifiedAt: stat.mtime.toISOString()};
  } catch (error) {
    if (error.code === "ENOENT") return {exists: false, raw: "", value: fallback, revision: null, modifiedAt: null};
    throw error;
  }
}

function readMediaIndex(stateDirectory) {
  const indexPath = path.join(stateDirectory, "media.json");
  try {
    const stat = fs.lstatSync(indexPath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("El índice local de medios no es un archivo válido.");
    const parsed = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

function validateMediaInConfig(config, mediaIndex, projectRoot = PROJECT_ROOT) {
  return validateHomepageConfig(config, {
    assetExists: (id) => Boolean(mediaIndex[id]),
    siteAssetExists: (ref) => Boolean(publicAssetFile(projectRoot, ref)),
  });
}

function writeAtomically(filePath, data, projectRoot = PROJECT_ROOT) {
  ensureSafeFileParent(projectRoot, filePath, true);
  const temporary = `${filePath}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  try {
    fs.writeFileSync(temporary, data, {flag: "wx", mode: 0o600});
    fs.renameSync(temporary, filePath);
  } finally {
    try { fs.unlinkSync(temporary); } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}

function isAuthorizedHost(request, port) {
  return request.headers.host === `${LOOPBACK}:${port}`;
}

function isAuthorizedWrite(request, port) {
  return isAuthorizedHost(request, port) && request.headers.origin === `http://${LOOPBACK}:${port}`;
}

async function readRequestBody(request, maximumBytes) {
  const declared = Number(request.headers["content-length"] || 0);
  if (declared > maximumBytes) {
    request.resume();
    const error = new Error("El archivo supera el tamaño permitido.");
    error.statusCode = 413;
    throw error;
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > maximumBytes) {
      const error = new Error("La solicitud supera el tamaño permitido.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, total);
}

function publicFileList(mediaRoot, mediaIndex) {
  const entries = [];
  const accepted = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".svg"]);
  const walk = (directory, relative = "", depth = 0) => {
    if (depth > 4 || entries.length >= 500) return;
    let children;
    try { children = fs.readdirSync(directory, {withFileTypes: true}); } catch { return; }
    for (const child of children) {
      if (entries.length >= 500) break;
      if (child.name.startsWith(".")) continue;
      const childRelative = path.posix.join(relative, child.name);
      const absolute = path.join(directory, child.name);
      if (child.isDirectory()) {
        walk(absolute, childRelative, depth + 1);
      } else if (child.isFile() && accepted.has(path.extname(child.name).toLowerCase())) {
        const stat = fs.statSync(absolute);
        if (stat.size <= MAX_MEDIA_BYTES) {
          entries.push({
            kind: "site",
            ref: `/img/${childRelative.replace(/\\/g, "/")}`,
            name: child.name,
            size: stat.size,
          });
        }
      }
    }
  };
  try {
    const stat = fs.lstatSync(mediaRoot);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return entries;
    const realRoot = fs.realpathSync(mediaRoot);
    if (!isInside(path.resolve(mediaRoot), realRoot)) return entries;
  } catch { return entries; }
  walk(mediaRoot);

  for (const [id, metadata] of Object.entries(mediaIndex)) {
    if (!/^[a-f0-9]{24}$/.test(id) || !metadata || typeof metadata !== "object") continue;
    entries.push({kind: "upload", ref: id, name: metadata.originalName, size: metadata.size});
  }
  return entries;
}

function readStudioState(paths) {
  prepareStudioPaths(paths);
  const source = readRegularJson(paths.sourceConfig, DEFAULT_HOMEPAGE);
  const mediaIndex = readMediaIndex(paths.stateDirectory);
  const sourceCheck = validateMediaInConfig(source.value, mediaIndex, paths.projectRoot);
  if (!sourceCheck.ok) throw new Error(`La configuración de portada guardada no es válida: ${sourceCheck.errors.join(" ")}`);

  const draft = readRegularJson(paths.draftConfig, DEFAULT_HOMEPAGE);
  const draftCheck = draft.exists ? validateMediaInConfig(draft.value, mediaIndex, paths.projectRoot) : null;
  if (draft.exists && !draftCheck.ok) throw new Error(`El borrador de portada no es válido: ${draftCheck.errors.join(" ")}`);

  let previewMeta = null;
  try { previewMeta = JSON.parse(fs.readFileSync(paths.previewMeta, "utf8")); } catch {}
  let outputBuiltAt = null;
  let outputExists = false;
  try {
    const stat = fs.statSync(path.join(paths.previewDirectory, "index.html"));
    outputBuiltAt = stat.mtime.toISOString();
    outputExists = stat.isFile();
  } catch {}

  let publicSiteGeneratedAt = null;
  let publicSiteGenerated = false;
  try {
    const stat = fs.statSync(path.join(paths.projectRoot, "dist", "index.html"));
    publicSiteGenerated = stat.isFile();
    publicSiteGeneratedAt = stat.mtime.toISOString();
  } catch {}

  const activeConfig = draft.exists ? draftCheck.value : sourceCheck.value;
  const activeRevision = draft.exists ? draft.revision : source.revision;
  return {
    homepage: activeConfig,
    sourceRevision: source.revision,
    draftRevision: draft.exists ? draft.revision : null,
    hasDraft: draft.exists,
    draftModifiedAt: draft.modifiedAt,
    preview: {
      generated: outputExists,
      generatedAt: outputBuiltAt,
      current: Boolean(outputExists && previewMeta && previewMeta.activeRevision === activeRevision),
    },
    publicSite: {generated: publicSiteGenerated, generatedAt: publicSiteGeneratedAt},
    media: publicFileList(paths.publicMediaDirectory, mediaIndex),
  };
}

function publicAssetFile(projectRoot, reference) {
  if (typeof reference !== "string" || !reference.startsWith("/img/") || reference.includes("\\") || reference.includes("\0")) return null;
  const relative = reference.slice("/img/".length);
  const resolved = safeResolve(path.join(projectRoot, "src", "site", "img"), relative);
  if (!resolved) return null;
  try {
    const realRoot = fs.realpathSync(path.join(projectRoot, "src", "site", "img"));
    const realFile = fs.realpathSync(resolved);
    if (!isInside(realRoot, realFile)) return null;
    const stat = fs.lstatSync(resolved);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_MEDIA_BYTES) return null;
    return resolved;
  } catch { return null; }
}

function compilePreviewStyles(paths) {
  const sass = require("sass");
  const sourceDirectory = path.join(paths.projectRoot, "src", "site", "styles");
  const outputDirectory = path.join(paths.previewDirectory, "styles");
  fs.mkdirSync(outputDirectory, {recursive: true});
  for (const entry of fs.readdirSync(sourceDirectory, {withFileTypes: true})) {
    if (!entry.isFile() || !entry.name.endsWith(".scss") || entry.name.startsWith("_")) continue;
    const sourcePath = path.join(sourceDirectory, entry.name);
    const targetPath = path.join(outputDirectory, `${entry.name.slice(0, -5)}.css`);
    const result = sass.compile(sourcePath, {style: "compressed"});
    fs.writeFileSync(targetPath, result.css, {mode: 0o600});
  }
}

function sniffImage(buffer, contentType) {
  const format = ALLOWED_MEDIA.get(contentType);
  if (!format || !format.signature(buffer)) return null;
  return format;
}

function serveStaticFile(response, filePath, method = "GET", allowedRoot = null) {
  let stat;
  try {
    if (allowedRoot) {
      const realRoot = fs.realpathSync(allowedRoot);
      const realFile = fs.realpathSync(filePath);
      if (!isInside(realRoot, realFile)) return false;
    }
    stat = fs.lstatSync(filePath);
    if (!stat.isFile() || stat.isSymbolicLink()) return false;
  } catch { return false; }
  const type = MIME_TYPES.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
  response.writeHead(200, {
    "Content-Type": type,
    "Content-Length": stat.size,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": type.startsWith("text/html") ? "no-store" : "no-cache",
  });
  if (method === "HEAD") response.end();
  else fs.createReadStream(filePath).pipe(response);
  return true;
}

function routePath(urlPath, root, allowedRoot = root) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath); } catch { return null; }
  if (decoded.includes("\\") || decoded.includes("\0") || decoded.split("/").some((part) => part === ".." || part.startsWith("."))) return null;
  const relative = decoded.replace(/^\/+/, "");
  let result = safeResolve(root, relative || "index.html");
  if (!result) return null;
  try {
    const realRoot = fs.realpathSync(allowedRoot);
    const candidate = fs.realpathSync(result);
    if (!isInside(realRoot, candidate)) return null;
    const stat = fs.lstatSync(result);
    if (stat.isSymbolicLink()) return null;
    if (stat.isDirectory()) result = path.join(result, "index.html");
  } catch {}
  return result;
}

function createPaths(projectRoot = PROJECT_ROOT) {
  const root = path.resolve(projectRoot);
  return {
    projectRoot: root,
    studioRoot: path.join(root, "studio"),
    sourceConfig: path.join(root, ".arkfates-studio", "homepage.json"),
    stateDirectory: path.join(root, ".arkfates-studio", "state"),
    draftConfig: path.join(root, ".arkfates-studio", "state", "homepage-draft.json"),
    mediaIndex: path.join(root, ".arkfates-studio", "state", "media.json"),
    mediaDirectory: path.join(root, ".arkfates-studio", "media"),
    previewMeta: path.join(root, ".arkfates-studio", "state", "preview.json"),
    previewDirectory: path.join(root, ".arkfates-studio", "preview"),
    publicMediaDirectory: path.join(root, "src", "site", "img"),
  };
}

function createStudioServer({projectRoot = PROJECT_ROOT, port = APP_PORT, previewPort = port + 1, spawnCommand = spawn} = {}) {
  const paths = createPaths(projectRoot);
  let uploadWriteQueue = Promise.resolve();

  async function saveDraft(request, response) {
    if (!isAuthorizedWrite(request, port)) return sendJson(response, 403, {error: "Origen local no autorizado."});
    if (!request.headers["content-type"]?.startsWith("application/json")) return sendJson(response, 415, {error: "Se requiere application/json."});
    let body;
    try { body = JSON.parse((await readRequestBody(request, MAX_JSON_BYTES)).toString("utf8")); }
    catch (error) { return sendJson(response, error.statusCode || 400, {error: "El JSON de la solicitud no es válido."}); }

    try {
      prepareStudioPaths(paths);
      const currentSource = readRegularJson(paths.sourceConfig, DEFAULT_HOMEPAGE);
      const currentDraft = readRegularJson(paths.draftConfig, DEFAULT_HOMEPAGE);
      if (body.sourceRevision !== currentSource.revision || body.draftRevision !== (currentDraft.exists ? currentDraft.revision : null)) {
        return sendJson(response, 409, {error: "La portada o el borrador cambió fuera del Studio. Se conservó la versión actual.", code: "revision_conflict"});
      }
      const mediaIndex = readMediaIndex(paths.stateDirectory);
      const result = validateMediaInConfig(body.config, mediaIndex, paths.projectRoot);
      if (!result.ok) return sendJson(response, 422, {error: "La configuración contiene valores no permitidos.", details: result.errors});
      writeAtomically(paths.draftConfig, `${JSON.stringify(result.value, null, 2)}\n`, paths.projectRoot);
      sendJson(response, 200, {state: readStudioState(paths)});
    } catch (error) {
      sendJson(response, 400, {error: error.message});
    }
  }

  async function discardDraft(request, response) {
    if (!isAuthorizedWrite(request, port)) return sendJson(response, 403, {error: "Origen local no autorizado."});
    if (!request.headers["content-type"]?.startsWith("application/json")) return sendJson(response, 415, {error: "Se requiere application/json."});
    let body;
    try { body = JSON.parse((await readRequestBody(request, MAX_JSON_BYTES)).toString("utf8")); }
    catch { return sendJson(response, 400, {error: "El JSON de la solicitud no es válido."}); }
    try {
      prepareStudioPaths(paths);
      const currentSource = readRegularJson(paths.sourceConfig, DEFAULT_HOMEPAGE);
      const currentDraft = readRegularJson(paths.draftConfig, DEFAULT_HOMEPAGE);
      if (body.sourceRevision !== currentSource.revision || body.draftRevision !== (currentDraft.exists ? currentDraft.revision : null)) {
        return sendJson(response, 409, {error: "La portada o el borrador cambió fuera del Studio. Se conservó la versión actual.", code: "revision_conflict"});
      }
      if (currentDraft.exists) {
        fs.unlinkSync(paths.draftConfig);
      }
      sendJson(response, 200, {state: readStudioState(paths)});
    } catch (error) {
      sendJson(response, 400, {error: error.message});
    }
  }

  async function uploadMedia(request, response, url) {
    if (!isAuthorizedWrite(request, port)) return sendJson(response, 403, {error: "Origen local no autorizado."});
    const contentType = (request.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    const format = ALLOWED_MEDIA.get(contentType);
    const rawName = url.searchParams.get("filename") || "imagen";
    const filename = path.basename(rawName).replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 160);
    const originalExtension = path.extname(filename).toLowerCase();
    if (!format || !filename || (originalExtension && ![format.extension, ...(format.extension === ".jpg" ? [".jpeg"] : [])].includes(originalExtension))) {
      request.resume();
      return sendJson(response, 415, {error: "Formato no compatible. Usa PNG, JPEG, WebP, GIF o AVIF."});
    }
    let bytes;
    try { bytes = await readRequestBody(request, MAX_MEDIA_BYTES); }
    catch (error) { return sendJson(response, error.statusCode || 400, {error: error.message}); }
    const detected = sniffImage(bytes, contentType);
    if (!detected) return sendJson(response, 415, {error: "El archivo no coincide con el tipo de imagen declarado."});

    try {
      const id = crypto.randomBytes(12).toString("hex");
      const assetPath = path.join(paths.mediaDirectory, `${id}${detected.extension}`);
      prepareStudioPaths(paths);
      ensureSafeDirectory(paths.projectRoot, paths.mediaDirectory, true);
      fs.writeFileSync(assetPath, bytes, {flag: "wx", mode: 0o600});
      const metadata = {id, originalName: filename, contentType, size: bytes.length, createdAt: new Date().toISOString()};
      uploadWriteQueue = uploadWriteQueue.catch(() => {}).then(() => {
        const current = readMediaIndex(paths.stateDirectory);
        current[id] = metadata;
        writeAtomically(paths.mediaIndex, `${JSON.stringify(current, null, 2)}\n`, paths.projectRoot);
      });
      await uploadWriteQueue;
      sendJson(response, 201, {asset: {kind: "upload", ref: id, name: filename, size: bytes.length}});
    } catch (error) {
      sendJson(response, 500, {error: "No se pudo guardar la imagen local."});
    }
  }

  function buildPreview() {
    if (previewBuildInFlight) return previewBuildInFlight;
    previewBuildInFlight = new Promise((resolve, reject) => {
      const eleventyCli = path.join(paths.projectRoot, "node_modules", "@11ty", "eleventy", "cmd.cjs");
      if (!fs.existsSync(eleventyCli)) {
        reject(new Error("No se encontró Eleventy en las dependencias locales del repositorio."));
        return;
      }
      if (!isInside(paths.projectRoot, paths.previewDirectory) || path.basename(paths.previewDirectory) !== "preview") {
        reject(new Error("La carpeta de vista previa configurada no es segura."));
        return;
      }
      try {
        ensureSafeDirectory(paths.projectRoot, path.dirname(paths.previewDirectory), true);
        const stat = fs.lstatSync(paths.previewDirectory);
        if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("La carpeta de vista previa no puede ser un enlace simbólico ni un archivo.");
        fs.rmSync(paths.previewDirectory, {recursive: true, force: true});
      } catch (error) {
        if (error.code !== "ENOENT") { reject(error); return; }
      }

      try { compilePreviewStyles(paths); }
      catch (error) { reject(new Error(`No se pudieron generar los estilos de la vista previa: ${error.message}`)); return; }

      const child = spawnCommand(process.execPath, [eleventyCli, "--quiet", `--output=${path.relative(paths.projectRoot, paths.previewDirectory)}`], {
        cwd: paths.projectRoot,
        env: {
          ...process.env,
          ARKFATES_STUDIO_PREVIEW: "1",
          ARKFATES_STUDIO_PORT: String(port),
          ELEVENTY_ENV: "dev",
          NODE_ENV: "development",
        },
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        shell: false,
      });
      let output = "";
      const append = (chunk) => { output = `${output}${chunk}`.slice(-16000); };
      child.stdout.on("data", append);
      child.stderr.on("data", append);
      const timeout = setTimeout(() => child.kill(), 180000);
      child.once("error", (error) => { clearTimeout(timeout); reject(error); });
      child.once("close", (code, signal) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(`Eleventy no pudo generar la vista previa (código ${code ?? signal}). ${output.trim()}`));
          return;
        }
        try {
          const state = readStudioState(paths);
          if (!fs.existsSync(path.join(paths.previewDirectory, "index.html"))) throw new Error("Eleventy terminó, pero no generó la portada en la carpeta de vista previa.");
          writeAtomically(paths.previewMeta, `${JSON.stringify({activeRevision: state.hasDraft ? state.draftRevision : state.sourceRevision, builtAt: new Date().toISOString()}, null, 2)}\n`, paths.projectRoot);
          resolve({state: readStudioState(paths), log: output.trim()});
        } catch (error) { reject(error); }
      });
    }).finally(() => { previewBuildInFlight = null; });
    return previewBuildInFlight;
  }

  const server = http.createServer(async (request, response) => {
    if (!isAuthorizedHost(request, port)) return sendJson(response, 421, {error: "Studio disponible solo mediante 127.0.0.1."});
    let url;
    try { url = new URL(request.url, ADMIN_ORIGIN); }
    catch { return sendJson(response, 400, {error: "URL no válida."}); }

    if (request.method === "GET" && url.pathname === "/") {
      const file = path.join(STUDIO_ROOT, "public", "index.html");
      response.setHeader("Content-Security-Policy", `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-src http://127.0.0.1:${previewPort}; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'`);
      response.setHeader("Referrer-Policy", "same-origin");
      return serveStaticFile(response, file, "GET", path.join(STUDIO_ROOT, "public"));
    }
    if ((request.method === "GET" || request.method === "HEAD") && ["/app.js", "/styles.css"].includes(url.pathname)) {
      return serveStaticFile(response, path.join(STUDIO_ROOT, "public", url.pathname.slice(1)), request.method, path.join(STUDIO_ROOT, "public"))
        || sendJson(response, 404, {error: "Archivo no encontrado."});
    }
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/__studio/preview-bridge.js") {
      return serveStaticFile(response, path.join(STUDIO_ROOT, "public", "preview-bridge.js"), request.method, path.join(STUDIO_ROOT, "public"))
        || sendJson(response, 404, {error: "Archivo no encontrado."});
    }
    if ((request.method === "GET" || request.method === "HEAD") && ["/fonts/manrope-latin-wght-normal.woff2", "/fonts/epilogue-latin-wght-normal.woff2"].includes(url.pathname)) {
      const fontPath = path.join(paths.projectRoot, "src", "site", "img", "fonts", path.basename(url.pathname));
      return serveStaticFile(response, fontPath, request.method, path.join(paths.projectRoot, "src", "site", "img", "fonts")) || sendJson(response, 404, {error: "Fuente local no encontrada."});
    }
    if (request.method === "GET" && url.pathname === "/api/state") {
      try { return sendJson(response, 200, readStudioState(paths)); }
      catch (error) { return sendJson(response, 500, {error: error.message}); }
    }
    if (request.method === "POST" && url.pathname === "/api/draft") return saveDraft(request, response);
    if (request.method === "POST" && url.pathname === "/api/draft/discard") return discardDraft(request, response);
    if (request.method === "POST" && url.pathname === "/api/media") return uploadMedia(request, response, url);
    if (request.method === "POST" && url.pathname === "/api/preview") {
      if (!isAuthorizedWrite(request, port)) return sendJson(response, 403, {error: "Origen local no autorizado."});
      try { return sendJson(response, 200, await buildPreview()); }
      catch (error) { return sendJson(response, 500, {error: error.message}); }
    }
    if ((request.method === "GET" || request.method === "HEAD") && /^\/__studio\/media\/[a-f0-9]{24}$/.test(url.pathname)) {
      const id = url.pathname.slice("/__studio/media/".length);
      try {
        prepareStudioPaths(paths);
        const index = readMediaIndex(paths.stateDirectory);
        const metadata = index[id];
        if (!metadata || !ALLOWED_MEDIA.has(metadata.contentType)) return sendJson(response, 404, {error: "Imagen no encontrada."});
        const asset = path.join(paths.mediaDirectory, `${id}${ALLOWED_MEDIA.get(metadata.contentType).extension}`);
        ensureSafeFileParent(paths.projectRoot, asset);
        return serveStaticFile(response, asset, request.method, paths.mediaDirectory) || sendJson(response, 404, {error: "Imagen no encontrada."});
      } catch { return sendJson(response, 404, {error: "Imagen no encontrada."}); }
    }
    return sendJson(response, 404, {error: "Ruta no encontrada."});
  });

  return {server, paths, port, previewPort, buildPreview};
}

function createPreviewServer({projectRoot = PROJECT_ROOT, port = PREVIEW_PORT} = {}) {
  const paths = createPaths(projectRoot);
  const server = http.createServer((request, response) => {
    if (!isAuthorizedHost(request, port)) {
      response.writeHead(421, {"Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff"});
      response.end("Vista previa disponible solo mediante 127.0.0.1.");
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, {Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8"});
      response.end("Método no permitido.");
      return;
    }
    let url;
    try { url = new URL(request.url, `http://${LOOPBACK}:${port}`); }
    catch { response.writeHead(400).end(); return; }
    const file = routePath(url.pathname, paths.previewDirectory, paths.projectRoot);
    if (!file) { response.writeHead(400).end("Ruta no válida."); return; }
    if (serveStaticFile(response, file, request.method, paths.projectRoot)) return;
    if (url.pathname === "/" || url.pathname === "/index.html") {
      response.writeHead(503, {"Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store"});
      response.end("<!doctype html><html lang=es><meta charset=utf-8><title>Vista previa pendiente</title><body><main><h1>La vista previa aún no se ha generado</h1><p>Vuelve a ARKFATES STUDIO y actualiza la vista previa con Eleventy.</p></main></body></html>");
      return;
    }
    response.writeHead(404, {"Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff"});
    response.end("No encontrado.");
  });
  return {server, port};
}

function startStudio() {
  if (!Number.isInteger(APP_PORT) || APP_PORT < 1024 || APP_PORT > 65534) throw new Error("ARKFATES_STUDIO_PORT debe ser un puerto entre 1024 y 65534.");
  const app = createStudioServer();
  const preview = createPreviewServer();
  app.server.listen(APP_PORT, LOOPBACK, () => {
    console.log(`ARKFATES STUDIO: ${ADMIN_ORIGIN}`);
    console.log(`Vista previa Eleventy: http://${LOOPBACK}:${PREVIEW_PORT}`);
  });
  preview.server.listen(PREVIEW_PORT, LOOPBACK);
  const stop = () => {
    app.server.close();
    preview.server.close();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

if (require.main === module) {
  try { startStudio(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = {
  createPaths,
  createPreviewServer,
  createStudioServer,
  isAuthorizedWrite,
  publicAssetFile,
  routePath,
  safeResolve,
  sniffImage,
  validateMediaInConfig,
};
