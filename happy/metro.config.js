const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname, {
  // Enable CSS support for web
  isCSSEnabled: true,
});

// Add support for .wasm files (required by Skia for all platforms)
// Source: https://shopify.github.io/react-native-skia/docs/getting-started/installation/
config.resolver.assetExts.push('wasm');

// Exclude screenshots directory from Metro's file watcher to reduce memory usage
// blockList is a RegExp in Metro, so we combine existing pattern with our new one
const screenshotsPattern = path.resolve(__dirname, 'screenshots').replace(/[/\\]/g, '[/\\\\]');
const existingBlockList = config.resolver.blockList?.source || '';
config.resolver.blockList = new RegExp(
  existingBlockList ? `${existingBlockList}|${screenshotsPattern}` : screenshotsPattern
);

// Enable inlineRequires for proper Skia and Reanimated loading
// Source: https://shopify.github.io/react-native-skia/docs/getting-started/web/
// Without this, Skia throws "react-native-reanimated is not installed" error
// This is cross-platform compatible (iOS, Android, web)
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true, // Critical for @shopify/react-native-skia
  },
});

module.exports = config;
