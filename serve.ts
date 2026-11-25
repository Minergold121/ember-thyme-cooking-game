// A tiny static server for game/ (Node standard library only), so the
// game can be played locally without a build step:
// `node serve.ts` serves game/ on http://localhost:8080.
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("./game", import.meta.url)));
const args = process.argv.slice(2);
const portIndex = args.indexOf("--port");
const requested = portIndex === -1 ? 8080 : Number(args[portIndex + 1]);
const port = Number.isInteger(requested) && requested > 0 && requested < 65536 ? requested : 8080;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

createServer((request, response) => {
  const urlPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const rel = normalize(urlPath === "/" ? "index.html" : urlPath.replace(/^\//, ""));
  const file = join(root, rel);
  if (!file.startsWith(root + sep) && file !== root) {
    response.writeHead(403);
    response.end("forbidden");
    return;
  }
  let stat;
  try { stat = statSync(file); } catch { stat = null; }
  if (!stat || !stat.isFile()) {
    response.writeHead(404);
    response.end("not found");
    return;
  }
  response.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
  createReadStream(file).pipe(response);
}).listen(port, () => console.log("serving game/ on http://localhost:" + port));
