const { withProjectBuildGradle } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

/**
 * Expo config plugin to fix the Windows 260-character path limit in Android
 * CMake/ninja builds.
 *
 * Problem: Node.js autolinking resolves the C:\h junction to the real ~120
 * char project path. Ninja encodes absolute source paths into build directory
 * structures, causing paths to exceed Windows MAX_PATH (260 chars).
 *
 * The Groovy fix is stored in withWindowsPathFix.gradle.txt and injected
 * into android/build.gradle during prebuild.
 */
const withWindowsPathFix = (config) => {
  if (process.platform !== 'win32') {
    return config;
  }

  return withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Don't apply twice
    if (contents.includes('WIN_REAL_PREFIX')) {
      return config;
    }

    // Read the Groovy template (exact Groovy code, no JS escaping needed)
    const templatePath = path.join(__dirname, 'withWindowsPathFix.gradle.txt');
    const gradleFix = fs.readFileSync(templatePath, 'utf8');

    // Insert before the apply plugins at the end
    contents = contents.replace(
      'apply plugin: "expo-root-project"',
      gradleFix + '\napply plugin: "expo-root-project"'
    );

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withWindowsPathFix;
