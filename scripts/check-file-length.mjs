import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const checkedExtensions = new Set([".css", ".js", ".mjs", ".ts", ".tsx"]);
const ignoredDirectories = new Set(["coverage", "dist", "node_modules"]);
const maximumLines = 120;

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return ignoredDirectories.has(entry.name) ? [] : sourceFiles(path);
      }
      return checkedExtensions.has(extname(entry.name)) ? [path] : [];
    }),
  );
  return nested.flat();
}

const files = await sourceFiles(root);
const oversized = [];
for (const file of files) {
  const contents = await readFile(file, "utf8");
  const lines = contents === "" ? 0 : contents.split(/\r?\n/).length;
  if (lines > maximumLines) oversized.push({ file: relative(root, file), lines });
}

if (oversized.length > 0) {
  for (const item of oversized) console.error(`${item.file}: ${item.lines} lines`);
  console.error(`Source files may not exceed ${maximumLines} lines.`);
  process.exitCode = 1;
}
