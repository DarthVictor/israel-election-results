import { readdir, readFile, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { basename, resolve } from "node:path";

const distDirectory = resolve("dist");

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? collectFiles(path) : [path];
    }),
  );

  return files.flat();
}

const files = await collectFiles(distDirectory);
const sizes = await Promise.all(files.map(async (file) => (await stat(file)).size));
const totalBytes = sizes.reduce((total, size) => total + size, 0);
const gzipSizes = await Promise.all(
  files.map(async (file) => gzipSync(await readFile(file)).byteLength),
);
const assetSize = (file) => gzipSizes[files.indexOf(file)] ?? 0;
const scriptBytes = files
  .filter((file) => file.endsWith(".js"))
  .reduce((total, file) => total + assetSize(file), 0);
const geometryFile = files.find((file) => basename(file).startsWith("localities."));
const electionFiles = files.filter((file) => /election-\d+\.[a-f0-9]+\.json$/.test(file));

const assertBudget = (label, bytes, maximum) => {
  if (bytes > maximum) {
    throw new Error(
      `${label} is ${(bytes / 1024).toFixed(1)} KiB gzip; budget is ${(maximum / 1024).toFixed(1)} KiB.`,
    );
  }
};

assertBudget("Initial JavaScript", scriptBytes, 250 * 1024);
if (geometryFile) assertBudget("Locality geometry", assetSize(geometryFile), 1.5 * 1024 * 1024);
for (const file of electionFiles) assertBudget(basename(file), assetSize(file), 300 * 1024);

console.log(`Production bundle: ${files.length} files, ${(totalBytes / 1024).toFixed(1)} KiB`);
console.log(`Initial JavaScript: ${(scriptBytes / 1024).toFixed(1)} KiB gzip`);
if (geometryFile)
  console.log(`Locality geometry: ${(assetSize(geometryFile) / 1024).toFixed(1)} KiB gzip`);
