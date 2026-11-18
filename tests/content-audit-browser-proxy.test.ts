import http from "node:http";
import net from "node:net";
import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { createBrowserProxy } from "../scripts/enterprise-browser/proxy.mjs";

const policy = {
  allowedOrigins: ["http://public.example", "https://public.example"],
  timeoutMs: 1000,
  maxBytes: 4096,
};
const lookup = async () => [{ address: "93.184.216.34", family: 4 }];
const auth = (p) =>
  "Basic " + Buffer.from(p.username + ":" + p.password).toString("base64");
async function request(p, url, method = "GET", headers = {}) {
  return new Promise<{ status: number; body: string; headers: unknown }>(
    (resolve, reject) => {
      const endpoint = new URL(p.server);
      const r = http.request(
        {
          host: endpoint.hostname,
          port: endpoint.port,
          path: url,
          method,
          headers: { "proxy-authorization": auth(p), ...headers },
        },
        (response) => {
          let body = "";
          response.on("data", (chunk) => (body += chunk));
          response.on("end", () =>
            resolve({
              status: response.statusCode!,
              body,
              headers: response.headers,
            }),
          );
        },
      );
      r.on("error", reject);
      r.end();
    },
  );
}
async function backend() {
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push({ url: req.url, headers: req.headers, method: req.method });
    if (req.url === "/redirect") {
      res.writeHead(302, { location: "http://127.0.0.1/private" }).end();
      return;
    }
    res.setHeader("content-type", "text/plain");
    res.setHeader("set-cookie", "synthetic=1");
    res.end("fixture");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  return {
    requests,
    port,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
it("pins HTTP lookup, preserves browser response cookies and strips proxy credentials", async () => {
  const b = await backend();
  const pinned = [];
  const p = await createBrowserProxy(policy, async () => true, {
    lookup,
    httpRequest: (url, options, callback) => {
      options.lookup(url.hostname, {}, (_error, address, family) =>
        pinned.push({ address, family }),
      );
      return http.request(
        {
          ...options,
          host: "127.0.0.1",
          port: b.port,
          path: url.pathname,
          lookup: undefined,
        },
        callback,
      );
    },
  });
  try {
    const r = await request(p, "http://public.example/page");
    expect(r.status).toBe(200);
    expect(r.body).toBe("fixture");
    expect(r.headers["set-cookie"]).toEqual(["synthetic=1"]);
    expect(pinned).toEqual([{ address: "93.184.216.34", family: 4 }]);
    expect(b.requests[0].headers["proxy-authorization"]).toBeUndefined();
    expect(b.requests[0].headers.host).toBe("public.example");
  } finally {
    await p.close();
    await b.close();
  }
});
it("rejects unknown origins, private DNS, forged credentials, POST and GET bodies before transport", async () => {
  let calls = 0;
  const p = await createBrowserProxy(policy, async () => true, {
    lookup,
    httpRequest: () => {
      calls++;
      throw Error("Unexpected network");
    },
  });
  try {
    expect((await request(p, "http://other.example/")).status).toBe(403);
    expect((await request(p, "http://public.example/", "POST")).status).toBe(
      403,
    );
    expect(
      (
        await request(p, "http://public.example/", "GET", {
          "content-length": "2",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(p, "http://public.example/", "GET", {
          "proxy-authorization": "wrong",
        })
      ).status,
    ).toBe(407);
    expect(calls).toBe(0);
  } finally {
    await p.close();
  }
  const privateProxy = await createBrowserProxy(policy, async () => true, {
    lookup: async () => [{ address: "127.0.0.1", family: 4 }],
    httpRequest: () => {
      calls++;
    },
  });
  try {
    expect((await request(privateProxy, "http://public.example/")).status).toBe(
      403,
    );
    expect(calls).toBe(0);
  } finally {
    await privateProxy.close();
  }
});
it("does not follow redirects inside a previously authorized connection", async () => {
  const b = await backend();
  const p = await createBrowserProxy(policy, async () => true, {
    lookup,
    httpRequest: (url, options, callback) =>
      http.request(
        {
          ...options,
          host: "127.0.0.1",
          port: b.port,
          path: url.pathname,
          lookup: undefined,
        },
        callback,
      ),
  });
  try {
    const r = await request(p, "http://public.example/redirect");
    expect(r.status).toBe(302);
    expect((await request(p, r.headers.location)).status).toBe(403);
    expect(b.requests).toHaveLength(1);
  } finally {
    await p.close();
    await b.close();
  }
});
it("rechecks authorization for every HTTP request and fails closed during pending DNS shutdown", async () => {
  let allowed = false,
    calls = 0;
  const p = await createBrowserProxy(policy, async () => allowed, {
    lookup,
    httpRequest: () => {
      calls++;
      throw Error("Unreachable");
    },
  });
  try {
    expect((await request(p, "http://public.example/")).status).toBe(403);
    expect(calls).toBe(0);
    allowed = true;
    expect((await request(p, "http://public.example/")).status).toBe(403);
    expect(calls).toBe(1);
  } finally {
    await p.close();
  }
  let resolveLookup;
  const waiting = await createBrowserProxy(policy, async () => true, {
    lookup: () =>
      new Promise((resolve) => {
        resolveLookup = resolve;
      }),
    httpRequest: () => {
      calls++;
    },
  });
  const pending = request(waiting, "http://public.example/").catch(() => null);
  while (!resolveLookup) await new Promise((resolve) => setTimeout(resolve, 1));
  await waiting.close();
  resolveLookup([{ address: "93.184.216.34", family: 4 }]);
  await pending;
  expect(calls).toBe(1);
});
it("pins CONNECT to the checked address and rejects malformed/unauthorized tunnels", async () => {
  const echo = net.createServer((socket) =>
    socket.on("data", (chunk) => socket.write(chunk)),
  );
  await new Promise<void>((resolve) => echo.listen(0, "127.0.0.1", resolve));
  const pins = [];
  const p = await createBrowserProxy(policy, async () => true, {
    lookup,
    connect: (options) => {
      pins.push(options);
      return net.connect({ host: "127.0.0.1", port: echo.address().port });
    },
  });
  async function tunnel(authority) {
    return new Promise<string>((resolve, reject) => {
      const endpoint = new URL(p.server);
      const socket = net.connect(
        { host: endpoint.hostname, port: Number(endpoint.port) },
        () => {
          socket.write(
            "CONNECT " +
              authority +
              " HTTP/1.1\r\nHost: " +
              authority +
              "\r\nProxy-Authorization: " +
              auth(p) +
              "\r\n\r\n",
          );
        },
      );
      let data = "";
      socket.on("data", (chunk) => {
        data += chunk;
        if (data.includes("\r\n\r\n")) {
          socket.destroy();
          resolve(data);
        }
      });
      socket.on("error", reject);
      socket.setTimeout(2000, () => {
        socket.destroy();
        reject(Error("Tunnel timeout"));
      });
    });
  }
  try {
    expect(await tunnel("public.example:443")).toContain(
      "200 Connection Established",
    );
    expect(pins).toEqual([{ host: "93.184.216.34", port: 443, family: 4 }]);
    expect(await tunnel("private.example:443")).toContain("403");
    expect(await tunnel("public.example:443/path")).toContain("403");
    expect(pins).toHaveLength(1);
  } finally {
    await p.close();
    await new Promise<void>((resolve) => echo.close(() => resolve()));
  }
});

it("does not open HTTP transport after a pending authorization outlives client timeout", async () => {
  let release,
    calls = 0;
  const p = await createBrowserProxy(
    { ...policy, timeoutMs: 30 },
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
    {
      lookup,
      httpRequest: () => {
        calls++;
        throw Error("late transport");
      },
    },
  );
  try {
    const pending = request(p, "http://public.example/").catch(() => null);
    while (!release) await new Promise((resolve) => setTimeout(resolve, 1));
    await new Promise((resolve) => setTimeout(resolve, 80));
    release(true);
    await pending;
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(calls).toBe(0);
  } finally {
    await p.close();
  }
});
it("bounds denied request admission and retained telemetry", async () => {
  const p = await createBrowserProxy(policy, async () => true, { lookup });
  try {
    for (let i = 0; i < 1005; i++) {
      const r = await request(p, "http://public.example/", "POST");
      expect(r.status).toBe(i < 1000 ? 403 : 429);
    }
    expect(p.events).toHaveLength(1000);
    expect(p.telemetry).toEqual({ admissionAttempts: 1005, droppedEvents: 5 });
  } finally {
    await p.close();
  }
});
