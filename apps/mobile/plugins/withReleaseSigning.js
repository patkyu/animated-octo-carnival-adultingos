/**
 * Signs release builds with the Play *upload* key when it is provided, and
 * falls back to the debug key otherwise (local/internal APKs). The keystore
 * and passwords are never in the repo; pass them as environment variables:
 *   ADULTINGOS_UPLOAD_STORE_FILE      absolute path to the .keystore/.jks
 *   ADULTINGOS_UPLOAD_STORE_PASSWORD
 *   ADULTINGOS_UPLOAD_KEY_ALIAS       (default: upload)
 *   ADULTINGOS_UPLOAD_KEY_PASSWORD    (default: store password)
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// adultingos-release-signing';

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (g.includes(MARKER)) return cfg;
    g = g.replace(
      /signingConfigs\s*\{/,
      `signingConfigs {
        ${MARKER}
        release {
            def f = System.getenv('ADULTINGOS_UPLOAD_STORE_FILE')
            if (f) {
                storeFile file(f)
                storePassword System.getenv('ADULTINGOS_UPLOAD_STORE_PASSWORD')
                keyAlias System.getenv('ADULTINGOS_UPLOAD_KEY_ALIAS') ?: 'upload'
                keyPassword System.getenv('ADULTINGOS_UPLOAD_KEY_PASSWORD') ?: System.getenv('ADULTINGOS_UPLOAD_STORE_PASSWORD')
            }
        }`,
    );
    // In buildTypes.release, use the upload key when configured.
    g = g.replace(
      /(release\s*\{[^{}]*?)signingConfig signingConfigs\.debug/,
      `$1signingConfig System.getenv('ADULTINGOS_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`,
    );
    cfg.modResults.contents = g;
    return cfg;
  });
};
