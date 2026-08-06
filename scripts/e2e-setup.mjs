import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { request } from "node:http";
import { resolve } from "node:path";

const port = 4174;
const baseUrl = `http://127.0.0.1:${port}`;
const testEnvironment = {
  ...process.env,
  E2E_PORT: String(port),
  VITE_SITE_URL: process.env.VITE_SITE_URL ?? "https://e2e.israel-election-results.test",
};

const waitForServer = async (server) => {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const available = await new Promise((resolveAvailable) => {
      const check = request(baseUrl, (response) => {
        response.resume();
        resolveAvailable(response.statusCode === 200);
      });
      check.on("error", () => resolveAvailable(false));
      check.end();
    });
    if (available) return;
    if (server.exitCode !== null)
      throw new Error(`E2E server exited with code ${server.exitCode}.`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error("Timed out waiting for the E2E server.");
};

const stopServer = async (server) => {
  if (server.exitCode !== null) return;
  server.kill("SIGTERM");
  const exited = Promise.race([
    once(server, "exit"),
    new Promise((resolveTimeout) => setTimeout(resolveTimeout, 5_000)),
  ]);
  await exited;
  if (server.exitCode === null) {
    spawnSync("taskkill.exe", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    await once(server, "exit");
  }
};

export default async function setup() {
  const viteCli = resolve("node_modules/vite/bin/vite.js");
  const build = spawnSync(process.execPath, [viteCli, "build"], {
    env: testEnvironment,
    stdio: "inherit",
  });
  if (build.status !== 0) throw new Error(`E2E production build failed with code ${build.status}.`);

  const server = spawn(process.execPath, [resolve("scripts/e2e-server.mjs")], {
    env: testEnvironment,
    stdio: "inherit",
    windowsHide: true,
  });
  await waitForServer(server);
  return () => stopServer(server);
}
