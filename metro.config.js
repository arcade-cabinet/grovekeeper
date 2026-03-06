const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// expo-sqlite web support requires WASM file resolution
config.resolver.sourceExts.push('wasm');

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
