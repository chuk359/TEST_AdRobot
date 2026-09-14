import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const requested = pathname === "/" ? "/index.html" : pathname;
  const file = normalize(join(root, requested));
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, { "content-type": mime[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(response);
}).listen(4173, "127.0.0.1", () => console.log("Chart demo: http://127.0.0.1:4173"));
