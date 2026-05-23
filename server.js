#!/usr/bin/env node
// ===== 有灵 · 小说 Agent 轻量 API 服务器 =====
// 用法: node server.js [端口]
// 功能：提供文件系统 API，让 HTML 版能读写 JSON 项目文件

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.argv[2] || 8765;
const DATA_DIR = path.join(__dirname, 'data', 'projects');
const STATIC_DIR = __dirname;

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API 路由
  if (req.url === '/api/save' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const project = JSON.parse(body);
        const name = (project.title || 'default').replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_');
        const filePath = path.join(DATA_DIR, `${name}.json`);
        project.updatedAt = Date.now();
        fs.writeFileSync(filePath, JSON.stringify(project, null, 2), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: filePath }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  if (req.url.startsWith('/api/load/') && req.method === 'GET') {
    const name = decodeURIComponent(req.url.replace('/api/load/', ''));
    const safeName = name.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, '_');
    const filePath = path.join(DATA_DIR, `${safeName}.json`);
    if (!filePath.startsWith(DATA_DIR)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(fs.readFileSync(filePath, 'utf8'));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Project not found' }));
    }
    return;
  }

  if (req.url === '/api/projects' && req.method === 'GET') {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    const projects = files.map(f => {
      const filePath = path.join(DATA_DIR, f);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return {
        name: path.basename(f, '.json'),
        title: data.title || '未命名',
        genre: data.genre || '',
        chapters: data.chapters?.length || 0,
        updatedAt: data.updatedAt
      };
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(projects));
    return;
  }

  if (req.url.startsWith('/api/delete/') && req.method === 'POST') {
    const name = decodeURIComponent(req.url.replace('/api/delete/', ''));
    const safeName = name.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, '_');
    const filePath = path.join(DATA_DIR, `${safeName}.json`);
    if (!filePath.startsWith(DATA_DIR)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Project not found' }));
    }
    return;
  }

  // 静态文件服务
  let filePath = path.join(STATIC_DIR, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
      res.end(data);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n📖 有灵 · 小说 Agent 服务器`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🌐 浏览器访问: http://localhost:${PORT}`);
  console.log(`📁 数据目录: ${DATA_DIR}`);
  console.log(`🔌 API: http://localhost:${PORT}/api/`);
  console.log(`\n按 Ctrl+C 停止\n`);
});
