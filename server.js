const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const PRODUCTS_PATH = path.join(__dirname, 'public', 'data', 'products.json');

let productsCache = [];
let orders = [];

function loadProducts() {
  try {
    const raw = fs.readFileSync(PRODUCTS_PATH, 'utf-8');
    productsCache = JSON.parse(raw);
  } catch (error) {
    console.error('無法載入商品資料:', error);
    productsCache = [];
  }
}

loadProducts();
fs.watchFile(PRODUCTS_PATH, { interval: 2000 }, () => loadProducts());

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';

    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1e6) {
        reject(new Error('Payload too large'));
        req.connection.destroy();
      }
    });

    req.on('end', () => {
      try {
        const parsed = data ? JSON.parse(data) : {};
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

function handleApi(req, res, url) {
  const { pathname, searchParams } = url;

  if (req.method === 'GET' && pathname === '/api/products') {
    const keyword = (searchParams.get('q') || '').trim().toLowerCase();
    const items = keyword
      ? productsCache.filter(product =>
          product.name.toLowerCase().includes(keyword) ||
          product.description.toLowerCase().includes(keyword)
        )
      : productsCache;

    return sendJson(res, 200, { items });
  }

  if (req.method === 'GET' && pathname.startsWith('/api/products/')) {
    const id = pathname.split('/').pop();
    const product = productsCache.find(item => item.id === id);

    if (!product) {
      return sendJson(res, 404, { message: '查無此商品' });
    }

    return sendJson(res, 200, product);
  }

  if (req.method === 'POST' && pathname === '/api/orders') {
    parseRequestBody(req)
      .then(body => {
        const { cart, customer } = body;

        if (!Array.isArray(cart) || cart.length === 0) {
          return sendJson(res, 422, { message: '購物車為空' });
        }

        const invalidItem = cart.find(item => {
          if (!item || typeof item.id !== 'string' || typeof item.quantity !== 'number') {
            return true;
          }
          return !productsCache.some(product => product.id === item.id);
        });

        if (invalidItem) {
          return sendJson(res, 400, { message: '購物車內容有誤' });
        }

        const order = {
          id: `order_${Date.now()}`,
          cart,
          customer: customer || {},
          createdAt: new Date().toISOString()
        };

        orders.push(order);
        return sendJson(res, 201, { message: '已建立測試訂單', order });
      })
      .catch(error => {
        console.error('訂單建立失敗:', error);
        sendJson(res, 400, { message: '無法解析訂單資料' });
      });
    return;
  }

  sendJson(res, 404, { message: 'API 路徑不存在' });
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon'
};

function serveStatic(res, pathname) {
  let relativePath = pathname;

  if (relativePath === '/' || relativePath === '') {
    relativePath = 'index.html';
  } else {
    relativePath = relativePath.replace(/^\/+/, '');
  }

  const normalizedPath = path
    .normalize(relativePath)
    .replace(/^(\.\.[\\\/])+/, '');
  const filePath = path.join(PUBLIC_DIR, normalizedPath);

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('找不到頁面');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.createReadStream(filePath)
      .on('open', () => {
        res.writeHead(200, { 'Content-Type': contentType });
      })
      .on('error', error => {
        console.error('讀取檔案失敗:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('伺服器錯誤');
      })
      .pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (requestUrl.pathname.startsWith('/api/')) {
    handleApi(req, res, requestUrl);
    return;
  }

  serveStatic(res, requestUrl.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`POC 電商網站伺服器啟動於 http://${HOST}:${PORT}`);
});
