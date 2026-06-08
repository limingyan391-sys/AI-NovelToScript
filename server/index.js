const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Simple .env loader
(function loadEnv() {
  var envPath = require('path').join(__dirname, '..', '.env');
  try {
    if (require('fs').existsSync(envPath)) {
      var lines = require('fs').readFileSync(envPath, 'utf-8').split('\n');
      lines.forEach(function(line) {
        line = line.trim();
        if (!line || line.startsWith('#')) return;
        var eqIdx = line.indexOf('=');
        if (eqIdx < 1) return;
        var key = line.substring(0, eqIdx).trim();
        var val = line.substring(eqIdx + 1).trim();
        if (key && !process.env[key]) {
          process.env[key] = val;
        }
      });
      console.log('✦ Loaded .env configuration');
    }
  } catch(e) {
    // .env file is optional
  }
})();


const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.yaml': 'text/plain; charset=utf-8',
  '.yml': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/convert') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { novelText, title, author, format } = data;
        if (!novelText || novelText.trim().length < 50) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: '小说文本过短，请至少输入50个字符' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: '请求格式错误' }));
      }
    });
    return;
  }


  if (req.method === 'GET' && req.url === '/api/config') {
    var envConfig = {
      ai_provider: process.env.AI_PROVIDER || '',
      ai_endpoint: process.env.AI_ENDPOINT || '',
      ai_model: process.env.AI_MODEL || '',
      ai_api_key: process.env.AI_API_KEY || '',
      port: process.env.PORT || '3000',
    };
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(envConfig));
    return;
  }
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 Not Found</h1>');
      } else {
        res.writeHead(500);
        res.end('500 Internal Server Error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  var p = PORT;
  console.log('✦ NovelToScript Server running at http://localhost:' + p);
  console.log('✦ Open your browser and navigate to http://localhost:' + p);
});


