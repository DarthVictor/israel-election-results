# GitHub Pages redirect release artifact

This folder is deliberately **not** the active GitHub Pages source. It is a safe, reviewable redirect template for the final release only.

After a successful Vercel production deployment, set the confirmed canonical HTTPS origin (for example, `https://example.vercel.app`) in a copy of `index.html.template`, verify that query strings and hashes survive in a browser, then publish that copy to the GitHub Pages deployment path. Do not deploy this template while `__CANONICAL_VERCEL_URL__` is unresolved, and do not replace the existing site before the Vercel release is accepted. The redirect validates the configured value before navigation and shows an on-page failure message if it is invalid.
