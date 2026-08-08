/**
 * Canonical public origin. Every build advertises this URL in its canonical link,
 * Open Graph metadata, and exported images, so it is a constant rather than an
 * environment variable.
 */
export const SITE_URL = "https://israel-election-results.darthvictor.xyz";

/** Host without the scheme, for display in exported artwork. */
export const SITE_HOST = new URL(SITE_URL).host;
