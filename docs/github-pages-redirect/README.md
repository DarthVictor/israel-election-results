# GitHub Pages redirect release artifact

This folder is deliberately **not** the active GitHub Pages source. It is a safe, reviewable redirect template for the final release only.

The template redirects to the canonical origin `https://israel-election-results.darthvictor.xyz`, preserving paths, query strings, and hashes. After a successful production deployment, verify that behaviour in a browser, then publish a copy of `index.html.template` to the GitHub Pages deployment path. Do not replace the existing site before the production release is accepted. The redirect validates the configured origin before navigation and shows an on-page failure message if it is invalid.
