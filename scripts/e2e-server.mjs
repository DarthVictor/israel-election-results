import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { resolve, sep } from "node:path";

const port = Number(process.env.E2E_PORT ?? "4174");
const rootDirectory = resolve("dist");
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json"],
]);

const fileFor = (pathname) => {
  const decodedPath = decodeURIComponent(pathname);
  const requestedFile = resolve(rootDirectory, `.${decodedPath}`);
  if (requestedFile.startsWith(`${rootDirectory}${sep}`)) {
    try {
      if (statSync(requestedFile).isFile()) return requestedFile;
    } catch {
      // SPA routes intentionally fall back to the application shell.
    }
  }
  return resolve(rootDirectory, "index.html");
};

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", `http://${request.headers.host}`).pathname;
  const file = fileFor(pathname);
  const extension = file.slice(file.lastIndexOf("."));
  response.writeHead(200, {
    "Content-Type": contentTypes.get(extension) ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(file).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`E2E server listening on http://127.0.0.1:${port}`);
});

const stop = () => server.close(() => process.exit(0));
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
