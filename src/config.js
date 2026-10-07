const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'border-config.json');

const DEFAULT_CONFIG = {
  borderStyle: 'solid',
  borderWidth: 20,
  borderColor: '#ffffff',
  borderRadius: 0,
  outputPath: '',
  suffix: '_bordered',
};

function loadConfig() {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ ...DEFAULT_CONFIG, ...config }, null, 2), 'utf8');
  } catch {}
}

module.exports = { CONFIG_PATH, DEFAULT_CONFIG, loadConfig, saveConfig };
