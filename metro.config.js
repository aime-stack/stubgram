const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Exclude backend directory from Metro watcher
const blockList = config.resolver.blockList || [];
config.resolver.blockList = Array.isArray(blockList) 
  ? [...blockList, /backend\/.*/]
  : [blockList, /backend\/.*/];

config.resolver.unstable_enablePackageExports = true;

module.exports = config;
