import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import process from "node:process";
import console from "node:console";

const server = createServer(async (request, response) => {
  if (request.method === "POST" && request.url === "/api/booking") {
    let email;
    let slot;
    try {
      let body = "";
      for await (const chunk of request) body += chunk;
      ({ email, slot } = JSON.parse(body));
    } catch {
      response.writeHead(400).end();
      return;
    }
    const validEmail =
      typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const status =
      !validEmail || !["saturday-10", "saturday-11"].includes(slot)
        ? 400
        : slot === "saturday-11"
          ? 503
          : 201;
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: status === 201 }));
    return;
  }
  const assets = {
    "/": ["index.html", "text/html; charset=utf-8"],
    "/index.html": ["index.html", "text/html; charset=utf-8"],
    "/styles.css": ["styles.css", "text/css; charset=utf-8"],
    "/style.css": ["style.css", "text/css; charset=utf-8"],
    "/app.js": ["app.js", "text/javascript; charset=utf-8"],
    "/script.js": ["script.js", "text/javascript; charset=utf-8"],
  };
  const asset = Object.hasOwn(assets, request.url)
    ? assets[request.url]
    : undefined;
  if (request.method !== "GET" || !asset) {
    response.writeHead(404).end();
    return;
  }
  try {
    const bytes = await readFile(new URL(asset[0], import.meta.url));
    response.writeHead(200, { "Content-Type": asset[1] }).end(bytes);
  } catch {
    response.writeHead(404).end();
  }
});
server.listen(Number(process.env.LANDING_TEST_PORT || 0), "127.0.0.1", () => {
  console.log(`http://127.0.0.1:${server.address().port}`);
});
