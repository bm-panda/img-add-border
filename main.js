#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');
const { render } = require('./src/renderer');
const { loadConfig } = require('./src/config');
const { resolveOutputPath } = require('./src/output');

function readPayload() {
  const payloadPath = process.argv[2];
  if (!payloadPath) return null;
  try {
    return JSON.parse(fs.readFileSync(payloadPath, 'utf-8'));
  } catch (err) {
    console.error('参数文件解析失败:', err.message);
    return {};
  }
}

function notify(env, message, type) {
  const apiBase = (env && env.api_base) || 'http://127.0.0.1:9527';
  let url;
  try {
    url = new URL('/api/notify', apiBase);
  } catch {
    return;
  }
  const body = JSON.stringify({ message, notify_type: type || 'success', duration: 3000 });
  try {
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => res.resume()
    );
    req.on('error', () => {});
    req.write(body);
    req.end();
  } catch {}
}

async function processHeadless(files, env, isNode) {
  const config = loadConfig();
  const results = [];

  for (const input of files) {
    try {
      const buffer = fs.readFileSync(input);
      const out = await render(buffer, config);
      const target = resolveOutputPath(input, path.basename(input), config);
      if (target.error) throw new Error(target.error);
      fs.mkdirSync(path.dirname(target.output), { recursive: true });
      fs.writeFileSync(target.output, out);
      results.push({ input, output: target.output, status: 'ok' });
    } catch (e) {
      results.push({ input, status: 'error', error: e.message });
    }
  }

  const ok = results.filter((r) => r.status === 'ok').length;
  const allOk = ok === results.length;

  if (isNode) {
    if (env.output_json) {
      try {
        fs.writeFileSync(
          env.output_json,
          JSON.stringify(
            {
              code: allOk ? 0 : 1,
              msg: allOk ? 'ok' : (files.length === 0 ? '未提供图片' : `部分失败: ${results.length - ok} 个`),
              files: results.filter((r) => r.status === 'ok').map((r) => r.output),
              count: ok,
            },
            null,
            2
          ),
          'utf-8'
        );
      } catch (e) {
        console.error('信封写入失败:', e.message);
      }
    }
  } else {
    notify(env, files.length === 0 ? '未提供图片' : `边框处理完成: ${ok}/${results.length} 个文件成功`, allOk ? 'success' : 'error');
  }

  process.exit(allOk ? 0 : 1);
}

function main() {
  const payload = readPayload();
  const env = (payload && payload.environment) || {};
  const data = (payload && payload.data) || {};
  const mode = env.invoke_mode;
  const files = Array.isArray(data.target_paths) ? data.target_paths.filter(Boolean) : [];

  if (mode === 'node') {
    processHeadless(files, env, true);
    return;
  }
  if (mode === 'scheduled') {
    processHeadless(files, env, false);
    return;
  }

  require('./src/server').start(files);
}

if (require.main === module) {
  main();
}
