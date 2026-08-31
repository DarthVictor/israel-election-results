import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";
import { SITE_URL } from "./src/site.ts";

export default defineConfig(({ mode }) => {
  const umamiWebsiteId = loadEnv(mode, process.cwd(), "PUBLIC_").PUBLIC_UMAMI_WEBSITE_ID;
  const umamiScript =
    mode === "production" && umamiWebsiteId
      ? `    <script defer src="https://analytics.darthvictor.xyz/script.js" data-website-id="${umamiWebsiteId}" data-domains="israel-election-results.darthvictor.xyz"></script>\n`
      : "";

  return {
    plugins: [
      solid(),
      {
        name: "canonical-site-metadata",
        transformIndexHtml: {
          order: "post",
          handler(html: string) {
            return html
              .replace(
                '<meta property="og:image" content="/social-preview.png" />',
                `<meta property="og:image" content="${SITE_URL}/social-preview.png" />`,
              )
              .replace(
                '<meta name="twitter:image" content="/social-preview.png" />',
                `<meta name="twitter:image" content="${SITE_URL}/social-preview.png" />`,
              )
              .replace(
                "</head>",
                `${umamiScript}    <link rel="canonical" href="${SITE_URL}/" />\n    <meta property="og:url" content="${SITE_URL}/" />\n  </head>`,
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
