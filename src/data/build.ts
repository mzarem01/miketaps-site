// A short id that changes on every build. Script URLs carry it (?v=...) so browsers
// always fetch the scripts that match the page, even if something caches old copies.
export const BUILD = Date.now().toString(36);
