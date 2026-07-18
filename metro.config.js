// Keep Metro from watching non-app directories (screenshot artifacts, the
// Express server, docs) — prevents needless fast-refresh churn during
// Playwright runs and keeps server-only code out of the client watcher.
const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = exclusionList([
  /\/\.artifacts\/.*/,
  /\/server\/.*/,
  /\/docs\/.*/,
  /\/scripts\/.*/,
]);

module.exports = config;
