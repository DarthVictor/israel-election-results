import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import solid from "vite-plugin-solid";

const siteUrlFor = (rawValue: string | undefined, requireValue: boolean): string | undefined => {
  if (!rawValue) {
    if (requireValue) {
      throw new Error(
        "VITE_SITE_URL must be a canonical HTTPS origin for a production build (for example, https://example.vercel.app).",
      );
    }
    return undefined;
  }

  let parsed: URL;
  try {
    parsed = new URL(rawValue);
  } catch {
    throw new Error(
      "VITE_SITE_URL must be a valid HTTPS origin without a path, query, or fragment.",
    );
  }

  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      "VITE_SITE_URL must be a valid HTTPS origin without a path, query, or fragment.",
    );
  }

  return parsed.origin;
};

export default defineConfig(({ command, mode }) => {
  const productionBuild = command === "build" && mode === "production";
  // `.env` is not visible on `process.env` during config resolution, so read it
  // explicitly. An ambient VITE_SITE_URL still wins, which is how CI overrides it.
  const fileEnv = loadEnv(mode, process.cwd(), "VITE_");
  const siteUrl = siteUrlFor(process.env.VITE_SITE_URL ?? fileEnv.VITE_SITE_URL, productionBuild);

  return {
    plugins: [
      solid(),
      {
        name: "canonical-site-metadata",
        transformIndexHtml: {
          order: "post",
          handler(html: string) {
            if (!siteUrl) return html;

            return html
              .replace(
                '<meta property="og:image" content="/social-preview.png" />',
                `<meta property="og:image" content="${siteUrl}/social-preview.png" />`,
              )
              .replace(
                '<meta name="twitter:image" content="/social-preview.png" />',
                `<meta name="twitter:image" content="${siteUrl}/social-preview.png" />`,
              )
              .replace(
                "</head>",
                `    <link rel="canonical" href="${siteUrl}/" />\n    <meta property="og:url" content="${siteUrl}/" />\n  </head>`,
              );
          },
        },
      },
    ],
    test: {
      environment: "node",
      include: ["src/**/*.test.ts"],
    },
  };
});
