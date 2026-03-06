// Jest setup for Grovekeeper

// Polyfill globals that expo's winter runtime tries to install lazily.
// Without these, the lazy install triggers require() calls that fail in
// Jest's sandbox with "import outside the scope of test code".
// biome-ignore lint/suspicious/noExplicitAny: polyfilling globals requires any
const g = globalThis as any;

if (typeof g.__ExpoImportMetaRegistry === "undefined") {
  g.__ExpoImportMetaRegistry = { url: null };
}
if (typeof g.structuredClone === "undefined") {
  g.structuredClone = (obj: unknown) => JSON.parse(JSON.stringify(obj));
}
