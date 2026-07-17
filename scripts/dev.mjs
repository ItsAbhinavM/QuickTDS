import 'dotenv/config';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const widgetRoot = path.join(root, 'src', 'widgets');
const mcpPort = Number(process.env.MCP_DEV_PORT || 3100);
const widgetPort = Number(process.env.WIDGET_DEV_PORT || 3101);
const host = process.env.HOST || '127.0.0.1';
const browserHost = host === '0.0.0.0' || host === '::' ? 'localhost' : host;
const appUrl = `http://${browserHost}:${widgetPort}`;
const children = [];
let shuttingDown = false;

function checkPort(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => reject(new Error(`Port ${port} is already in use`)));
    server.once('listening', () => server.close(resolve));
    server.listen(port, host);
  });
}

function start(label, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd || root,
    env: { ...process.env, ...options.env },
    stdio: 'inherit',
    shell: true
  });
  children.push(child);
  child.once('exit', (code, signal) => {
    if (!shuttingDown && code !== 0) {
      console.error(`\n[${label}] exited unexpectedly (${signal || `code ${code}`}).`);
      shutdown(1);
    }
  });
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGINT');
  }
  setTimeout(() => process.exit(code), 300).unref();
}

try {
  await Promise.all([checkPort(mcpPort), checkPort(widgetPort)]);

  console.log('Compiling Quick TDS server...');
  const compile = spawnSync('npx', ['tsc'], { cwd: root, stdio: 'inherit', shell: true });
  if (compile.status !== 0) process.exit(compile.status || 1);

  console.log('\nQuick TDS development services');
  console.log(`  Browser UI:   ${appUrl}`);
  console.log(`  MCP endpoint: http://${browserHost}:${mcpPort}/mcp`);
  console.log('  Stop all:     Ctrl+C\n');

  start('mcp', 'node', ['dist/index.js'], {
    env: {
      NODE_ENV: 'development',
      MCP_TRANSPORT_TYPE: 'http',
      PORT: String(mcpPort),
      HOST: host,
      RESOURCE_URI: `http://${browserHost}:${mcpPort}`,
      QUICK_TDS_UI_URL: appUrl,
      AUTH_SERVER_URL: process.env.AUTH_SERVER_URL || 'http://localhost:8080/auth'
    }
  });
  start('widgets', 'npm', ['run', 'dev', '--', '--hostname', host, '--port', String(widgetPort)], {
    cwd: widgetRoot
  });

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
} catch (error) {
  console.error(`Quick TDS could not start: ${error instanceof Error ? error.message : String(error)}`);
  console.error('Change or stop the process using that port, then retry.');
  process.exit(1);
}
