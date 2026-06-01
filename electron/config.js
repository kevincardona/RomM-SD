import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'emudeck-romm-connector');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const LOG_FILE = path.join(CONFIG_DIR, 'app.log');

export async function ensureConfigDir() {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
}

export function getConfigPath() { return CONFIG_FILE; }
export function getLogPath() { return LOG_FILE; }

export async function readConfig() {
  try { return JSON.parse(await fs.readFile(CONFIG_FILE, 'utf-8')); }
  catch { return {}; }
}

export async function writeConfig(config) {
  await ensureConfigDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function makeLogger() {
  const write = (level, message) => {
    const line = `[${level}] ${new Date().toISOString()} - ${message}\n`;
    fs.appendFile(LOG_FILE, line).catch(() => {});
    (level === 'ERROR' ? console.error : console.log)(line.trim());
  };
  const info = (m) => write('INFO', m);
  const error = (m) => write('ERROR', m);
  return { info, error, logInfo: info, logError: error };
}
