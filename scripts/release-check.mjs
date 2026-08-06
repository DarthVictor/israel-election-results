import { access, readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const distDirectory = resolve("dist");
const generatedDirectory = resolve(distDirectory, "data/generated");
const requiredFiles = [
  "dist/index.html",
  "dist/favicon.svg",
  "dist/apple-touch-icon.svg",
  "dist/apple-touch-icon.png",
  "dist/social-preview.svg",
  "dist/social-preview.png",
  "dist/site.webmanifest",
  "dist/data/generated/manifest.json",
];
const generatedAssetName = /^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-f0-9]{12}\.json$/;
const generatedAssetUrl = /^\/data\/generated\/([a-z0-9]+(?:-[a-z0-9]+)*\.[a-f0-9]{12}\.json)$/;
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const requiredHtmlValue = (html, pattern, label) => {
  const match = html.match(pattern);
  if (!match?.[1]) throw new Error(`Release metadata is missing ${label}.`);
  return match[1];
};

const httpsUrl = (value, label) => {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be an absolute HTTPS URL.`);
  }
  if (parsed.protocol !== "https:" || !parsed.hostname) {
    throw new Error(`${label} must be an absolute HTTPS URL.`);
  }
  return parsed;
};

const verifyPng = async (relativePath, expectedWidth, expectedHeight) => {
  const png = await readFile(resolve(relativePath));
  if (!png.subarray(0, pngSignature.length).equals(pngSignature)) {
    throw new Error(`${relativePath} is not a PNG file.`);
  }
  if (png.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error(`${relativePath} has no PNG header.`);
  }
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width !== expectedWidth || height !== expectedHeight) {
    throw new Error(
      `${relativePath} must be ${expectedWidth}x${expectedHeight}, received ${width}x${height}.`,
    );
  }
};

const manifestFileFor = (assetUrl) => {
  const match = assetUrl.match(generatedAssetUrl);
  if (!match) {
    throw new Error(
      `Manifest URL ${JSON.stringify(assetUrl)} must reference a content-addressed generated JSON asset.`,
    );
  }
  return resolve(generatedDirectory, match[1]);
};

const verifyVercelCaching = async () => {
  const config = JSON.parse(await readFile(resolve("vercel.json"), "utf8"));
  const headers = config.headers;
  if (!Array.isArray(headers)) throw new Error("vercel.json must define cache headers.");
  const immutableIndex = headers.findIndex(
    (entry) => entry.source === "/data/generated/(.*)\\.[a-f0-9]{12}\\.json",
  );
  const manifestIndex = headers.findIndex(
    (entry) => entry.source === "/data/generated/manifest.json",
  );
  if (immutableIndex < 0 || manifestIndex < 0 || immutableIndex >= manifestIndex) {
    throw new Error("Vercel cache headers must scope immutable assets before the manifest rule.");
  }
  const immutableValue = headers[immutableIndex].headers?.find(
    (header) => header.key.toLowerCase() === "cache-control",
  )?.value;
  const manifestValue = headers[manifestIndex].headers?.find(
    (header) => header.key.toLowerCase() === "cache-control",
  )?.value;
  if (immutableValue !== "public, max-age=31536000, immutable") {
    throw new Error("Content-addressed generated assets must have immutable caching.");
  }
  if (manifestValue !== "public, max-age=300, must-revalidate") {
    throw new Error("The generated-data manifest must have short, revalidating caching.");
  }
};

for (const file of requiredFiles) await access(resolve(file));

const [indexHtml, manifestContents] = await Promise.all([
  readFile(resolve("dist/index.html"), "utf8"),
  readFile(resolve("dist/data/generated/manifest.json"), "utf8"),
]);
if (indexHtml.includes("__SITE_URL__")) {
  throw new Error("Release output contains an unresolved site URL placeholder.");
}

const canonical = httpsUrl(
  requiredHtmlValue(indexHtml, /<link rel="canonical" href="([^"]+)" \/>/, "canonical link"),
  "Canonical link",
);
const ogUrl = httpsUrl(
  requiredHtmlValue(indexHtml, /<meta property="og:url" content="([^"]+)" \/>/, "og:url"),
  "og:url",
);
const ogImage = httpsUrl(
  requiredHtmlValue(indexHtml, /<meta property="og:image" content="([^"]+)" \/>/, "og:image"),
  "og:image",
);
const twitterImage = httpsUrl(
  requiredHtmlValue(indexHtml, /<meta name="twitter:image" content="([^"]+)" \/>/, "twitter:image"),
  "twitter:image",
);
if (
  canonical.pathname !== "/" ||
  canonical.search ||
  canonical.hash ||
  canonical.href !== ogUrl.href
) {
  throw new Error("Canonical and og:url metadata must be the same canonical origin URL.");
}
for (const [label, url] of [
  ["og:image", ogImage],
  ["twitter:image", twitterImage],
]) {
  if (
    url.origin !== canonical.origin ||
    url.pathname !== "/social-preview.png" ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${label} must use the canonical origin and social-preview.png.`);
  }
}

const manifest = JSON.parse(manifestContents);
if (!Array.isArray(manifest.elections) || typeof manifest.geometryUrl !== "string") {
  throw new Error("Generated manifest does not have the expected election-data structure.");
}
const referencedFiles = [manifestFileFor(manifest.geometryUrl)];
for (const election of manifest.elections) {
  if (typeof election?.dataUrl !== "string") {
    throw new Error("Each generated manifest election must provide a dataUrl.");
  }
  referencedFiles.push(manifestFileFor(election.dataUrl));
}
for (const file of referencedFiles) await access(file);

for (const entry of await readdir(generatedDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || entry.name === "manifest.json") continue;
  if (!generatedAssetName.test(entry.name)) {
    throw new Error(
      `Generated immutable asset ${entry.name} must use a content-addressed filename.`,
    );
  }
}

await Promise.all([
  verifyPng("dist/social-preview.png", 1200, 630),
  verifyPng("dist/apple-touch-icon.png", 180, 180),
  verifyVercelCaching(),
]);

console.log(
  "Release checks passed: canonical metadata, PNG social assets, cache policy, and generated data are valid.",
);
