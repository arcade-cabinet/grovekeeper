const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// expo-sqlite web support: treat .wasm as an asset (not source)
// Game assets: .glb (3D models), .hdr (HDR skybox)
config.resolver.assetExts = [...(config.resolver.assetExts || []), 'wasm', 'glb', 'hdr'];
// Remove wasm from sourceExts if present (default config may add it)
config.resolver.sourceExts = (config.resolver.sourceExts || []).filter(ext => ext !== 'wasm');

// Apply NativeWind FIRST so its resolveRequest wrapper is set, then wrap it.
// Fix: Tone.js ESM build imports tslib via 'tslib' package which Metro resolves
// to tslib/modules/index.js (an ESM wrapper). Metro's CJS runner can't destructure
// tslib.default from that wrapper. Redirect all tslib resolution to the CJS build.
const finalConfig = withNativeWind(config, { input: './global.css', inlineRem: 16 });

const tslibCJS = path.resolve(__dirname, 'node_modules/tslib/tslib.js');
const _nativeWindResolveRequest = finalConfig.resolver.resolveRequest;
finalConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') {
    return { filePath: tslibCJS, type: 'sourceFile' };
  }
  if (_nativeWindResolveRequest) {
    return _nativeWindResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = finalConfig;
