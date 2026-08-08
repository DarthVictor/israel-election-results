import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";
import { SITE_URL } from "./src/site.ts";

export default defineConfig({
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
              `    <link rel="canonical" href="${SITE_URL}/" />\n    <meta property="og:url" content="${SITE_URL}/" />\n  </head>`,
            );
        },
      },
    },
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
