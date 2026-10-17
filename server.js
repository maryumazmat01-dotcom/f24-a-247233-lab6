// CS301L Lab 06. Ali Hafeez.
// In this folder:  node "Lab 06 - server.js"
// Students copy this file as server.js and run:  node server.js
// Do not teach this file. The page asks it. They do not edit it.

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3016;
const ROOT = __dirname;
const WAIT_MS = 800;
const PRICES = { pen: 50, copy: 80, tea: 40 };
let nextId = 1;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function wait(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    req.on("data", function (chunk) {
      chunks.push(chunk);
    });
    req.on("end", function () {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

function safeFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const rel = (decoded === "/" ? "index.html" : decoded).replace(/^\/+/, "");
  const file = path.normalize(path.join(ROOT, rel));
  const rootWithSep = ROOT.endsWith(path.sep) ? ROOT : ROOT + path.sep;
  if (file !== ROOT && !file.startsWith(rootWithSep)) return null;
  return file;
}

async function handleApi(req, res, url) {
  let raw = "";
  if (req.method === "POST") raw = await readBody(req);
  await wait(WAIT_MS);
  if (url.pathname === "/api/price" && req.method === "GET") {
    const item = String(url.searchParams.get("item") || "").trim().toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(PRICES, item)) {
      console.log("GET", url.pathname + url.search, 404);
      sendJson(res, 404, { item: item, error: "not in the shop" });
      return;
    }
    console.log("GET", url.pathname + url.search, 200);
    sendJson(res, 200, { item: item, price: PRICES[item] });
    return;
  }
  if (url.pathname === "/api/orders" && req.method === "POST") {
    let body = {};
    try {
      body = JSON.parse(raw);
    } catch (err) {
      console.log("POST /api/orders 400");
      sendJson(res, 400, { error: "not json" });
      return;
    }
    const item = String(body.item || "").trim().toLowerCase();
    const qty = Number(body.qty);
    if (!Object.prototype.hasOwnProperty.call(PRICES, item)) {
      console.log("POST /api/orders", item, 404);
      sendJson(res, 404, { item: item, error: "not in the shop" });
      return;
    }
    if (!Number.isInteger(qty) || qty < 1) {
      console.log("POST /api/orders", item, 400);
      sendJson(res, 400, { error: "not a number" });
      return;
    }
    const order = { id: nextId, item: item, qty: qty, total: PRICES[item] * qty };
    nextId = nextId + 1;
    console.log("POST /api/orders", order.id, order.total, 201);
    sendJson(res, 201, order);
    return;
  }
  console.log(req.method, url.pathname, 404);
  sendJson(res, 404, { error: "no such path" });
}

const server = http.createServer(async function (req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }
  const url = new URL(req.url, "http://localhost:" + PORT);
  if (url.pathname.startsWith("/api/")) {
    await handleApi(req, res, url);
    return;
  }
  const file = safeFile(url.pathname);
  if (file === null || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, function () {
  console.log("Lab 06 server  http://localhost:" + PORT + "/");
});
