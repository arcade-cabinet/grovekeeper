const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// expo-sqlite web support: treat .wasm as an asset (not source)
// Game assets: .glb (3D models), .hdr (HDR skybox)
config.resolver.assetExts = [...(config.resolver.assetExts || []), 'wasm', 'glb', 'hdr'];
// Remove wasm from sourceExts if present (default config may add it)
config.resolver.sourceExts = (config.resolver.sourceExts || []).filter(ext => ext !== 'wasm');

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
