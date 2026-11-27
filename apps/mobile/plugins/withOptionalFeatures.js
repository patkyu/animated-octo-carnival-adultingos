/**
 * Widest device compatibility: hardware the app can live without is declared
 * required="false", so Google Play doesn't hide the app from phones/tablets/
 * Chromebooks that lack it (e.g. Wi-Fi is implied by ACCESS_WIFI_STATE,
 * portrait screen by the locked orientation).
 */
const { withAndroidManifest } = require('expo/config-plugins');
const OPTIONAL = ['android.hardware.wifi', 'android.hardware.screen.portrait', 'android.hardware.touchscreen', 'android.hardware.faketouch'];
module.exports = function withOptionalFeatures(config) {
  return withAndroidManifest(config, (cfg) => {
    const m = cfg.modResults.manifest;
    m['uses-feature'] = (m['uses-feature'] ?? []).filter((f) => !OPTIONAL.includes(f.$['android:name']));
    for (const name of OPTIONAL) m['uses-feature'].push({ $: { 'android:name': name, 'android:required': 'false' } });
    return cfg;
  });
};
