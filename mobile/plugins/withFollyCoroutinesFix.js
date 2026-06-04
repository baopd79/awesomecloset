const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Folly's Expected.h does `#include <folly/coro/Coroutine.h>` whenever
// FOLLY_HAS_COROUTINES is truthy. The folly subset vendored by React Native does
// not ship the coro/ headers, and third-party pods (e.g. react-native-reanimated)
// compile folly translation units WITHOUT the `-DFOLLY_CFG_NO_COROUTINES=1` flag
// that RN applies to its own folly sources. Under Xcode 16+/clang the compiler
// then auto-detects coroutine support and the build fails with:
//   'folly/coro/Coroutine.h' file not found
//
// Force FOLLY_CFG_NO_COROUTINES=1 on every pod target so all folly TUs agree
// coroutines are disabled — matching how the prebuilt RN dependencies were built.
const SNIPPET = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        defs = build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
        defs = [defs] unless defs.is_a?(Array)
        defs << 'FOLLY_CFG_NO_COROUTINES=1' unless defs.include?('FOLLY_CFG_NO_COROUTINES=1')
        build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
      end
    end
`;

module.exports = function withFollyCoroutinesFix(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');
      if (!contents.includes('FOLLY_CFG_NO_COROUTINES=1')) {
        contents = contents.replace(
          /post_install do \|installer\|\n/,
          (match) => match + SNIPPET,
        );
        fs.writeFileSync(podfile, contents);
      }
      return cfg;
    },
  ]);
};
