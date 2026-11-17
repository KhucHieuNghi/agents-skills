import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { expect, it, vi } from "vitest";
import {
  isPublicAddress,
  resolvePublicTarget,
  requestPublic,
} from "../skills/content-search-audit/scripts/lib/network.mjs";
type RequestOptions = {
  agent: boolean;
  rejectUnauthorized: boolean;
  headers: Record<string, string>;
  lookup: (
    hostname: string,
    options: { all?: boolean },
    callback: (...args: unknown[]) => void,
  ) => void;
};
type Response = Readable & {
  statusCode: number;
  headers: Record<string, string>;
};
class FixtureRequest extends EventEmitter {
  end: () => void = () => {};
  destroy(error?: Error) {
    queueMicrotask(() => this.emit("error", error));
    return this;
  }
}
const policy = {
  allowedOrigins: ["https://example.com", "https://www.example.com"],
};
const lookup = vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]);
function transport(
  responses: Array<{
    status?: number;
    headers?: Record<string, string>;
    body?: string;
  }>,
  inspected: RequestOptions[] = [],
) {
  return (
    _url: unknown,
    options: RequestOptions,
    callback: (response: Response) => void,
  ) => {
    inspected.push(options);
    const req = new FixtureRequest();
    req.destroy = (error) => queueMicrotask(() => req.emit("error", error));
    req.end = () =>
      queueMicrotask(() => {
        const result = responses.shift();
        if (!result) {
          req.emit("error", new Error("Unexpected request"));
          return;
        }
        const response = Readable.from([
          Buffer.from(result.body ?? "ok"),
        ]) as Response;
        response.statusCode = result.status ?? 200;
        response.headers = result.headers ?? {};
        callback(response);
      });
    return req;
  };
}
it("blocks nonpublic, mapped, transition and documentation addresses", () => {
  for (const ip of [
    "0.0.0.0",
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.31.255.255",
    "192.168.1.1",
    "192.0.2.1",
    "198.18.0.1",
    "198.51.100.1",
    "203.0.113.1",
    "224.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "::ffff:8.8.8.8",
    "64:ff9b::808:808",
    "2001:db8::1",
    "2001::1",
    "2002:808:808::1",
    "3fff::1",
    "fc00::1",
    "fe80::1",
    "ff02::1",
    "bad",
    "fe80::1%en0",
  ])
    expect(isPublicAddress(ip), ip).toBe(false);
  for (const ip of [
    "8.8.8.8",
    "1.1.1.1",
    "93.184.216.34",
    "172.32.0.1",
    "2606:4700:4700::1111",
    "2001:4860:4860::8888",
  ])
    expect(isPublicAddress(ip), ip).toBe(true);
});
it("requires exact authorized origins and rejects credentials and ambiguous URL input before DNS", async () => {
  const resolver = vi.fn(lookup);
  for (const url of [
    "https://example.com.evil.test/",
    "http://example.com/",
    "https://example.com:8443/",
    "https://" + "user:pass@example.com/",
    "file:///etc/passwd",
    "https://example.com\\@evil.test/",
    " https://example.com/",
    "https://example.com/\npath",
  ])
    await expect(
      resolvePublicTarget(url, policy, { lookup: resolver }),
    ).rejects.toThrow();
  expect(resolver).not.toHaveBeenCalled();
  const result = await resolvePublicTarget(
    "https://EXAMPLE.com/page?q=a#fragment",
    policy,
    { lookup },
  );
  expect(result.url.href).toBe("https://example.com/page?q=a");
  expect(result.address).toBe("93.184.216.34");
});
it("rejects an entire DNS answer containing any private address and rejects literal private targets", async () => {
  await expect(
    resolvePublicTarget("https://example.com", policy, {
      lookup: async () => [
        { address: "8.8.8.8", family: 4 },
        { address: "127.0.0.1", family: 4 },
      ],
    }),
  ).rejects.toThrow(/nonpublic/i);
  await expect(
    resolvePublicTarget(
      "http://2130706433",
      { allowedOrigins: ["http://127.0.0.1"] },
      { lookup },
    ),
  ).rejects.toThrow(/nonpublic/i);
  await expect(
    resolvePublicTarget("https://example.com", policy, {
      lookup: async () => [],
    }),
  ).rejects.toThrow(/DNS/i);
});
it("pins the connection lookup and uses fixed anonymous request headers", async () => {
  const inspected: RequestOptions[] = [];
  const result = await requestPublic("https://example.com/page", policy, {
    lookup,
    request: transport(
      [
        {
          headers: { "content-type": "text/html", "set-cookie": "secret=1" },
          body: "<h1>Hello</h1>",
        },
      ],
      inspected,
    ),
  });
  expect(result.body.toString()).toBe("<h1>Hello</h1>");
  expect(result.headers["set-cookie"]).toBeUndefined();
  expect(inspected[0].agent).toBe(false);
  expect(inspected[0].rejectUnauthorized).toBe(true);
  expect(inspected[0].headers.cookie).toBeUndefined();
  expect(inspected[0].headers.authorization).toBeUndefined();
  const callback = vi.fn();
  inspected[0].lookup("example.com", {}, callback);
  expect(callback).toHaveBeenCalledWith(null, "93.184.216.34", 4);
});
it("reauthorizes redirects, rejects private hops and caps loops", async () => {
  const calls: RequestOptions[] = [];
  await expect(
    requestPublic("https://example.com", policy, {
      lookup,
      request: transport(
        [{ status: 302, headers: { location: "http://127.0.0.1/private" } }],
        calls,
      ),
    }),
  ).rejects.toThrow(/origin/i);
  expect(calls).toHaveLength(1);
  const resolver = vi
    .fn()
    .mockResolvedValueOnce([{ address: "8.8.8.8", family: 4 }])
    .mockResolvedValueOnce([{ address: "127.0.0.1", family: 4 }]);
  await expect(
    requestPublic("https://example.com", policy, {
      lookup: resolver,
      request: transport([
        { status: 302, headers: { location: "https://www.example.com/" } },
      ]),
    }),
  ).rejects.toThrow(/nonpublic/i);
  await expect(
    requestPublic(
      "https://example.com",
      { ...policy, maxRedirects: 1 },
      {
        lookup,
        request: transport([
          { status: 302, headers: { location: "/a" } },
          { status: 302, headers: { location: "/b" } },
        ]),
      },
    ),
  ).rejects.toThrow(/redirect/i);
});
it("bounds response bytes and DNS/request duration", async () => {
  await expect(
    requestPublic(
      "https://example.com",
      { ...policy, maxBytes: 2 },
      { lookup, request: transport([{ body: "long" }]) },
    ),
  ).rejects.toThrow(/size/i);
  await expect(
    resolvePublicTarget(
      "https://example.com",
      { ...policy, timeoutMs: 10 },
      { lookup: () => new Promise(() => {}) },
    ),
  ).rejects.toThrow(/timeout/i);
  await expect(
    requestPublic(
      "https://example.com",
      { ...policy, timeoutMs: 10 },
      {
        lookup,
        request: () => {
          const req = new FixtureRequest();
          req.end = () => {};
          req.destroy = (error) =>
            queueMicrotask(() => req.emit("error", error));
          return req;
        },
      },
    ),
  ).rejects.toThrow(/timeout/i);
});

it("follows an authorized redirect with a fresh DNS check and no response cookies", async () => {
  const inspected: RequestOptions[] = [];
  const resolver = vi.fn(async () => [{ address: "8.8.8.8", family: 4 }]);
  const result = await requestPublic("https://example.com/", policy, {
    lookup: resolver,
    request: transport(
      [
        {
          status: 302,
          headers: {
            location: "https://www.example.com/final",
            "set-cookie": "token=secret",
          },
        },
        { body: "final" },
      ],
      inspected,
    ),
  });
  expect(result.url).toBe("https://www.example.com/final");
  expect(result.redirects).toEqual([
    { url: "https://example.com/", status: 302 },
  ]);
  expect(resolver).toHaveBeenCalledTimes(2);
  expect(inspected[1].headers.cookie).toBeUndefined();
});

it("expires stalled policy hooks and never starts a late request", async () => {
  let release: () => void = () => {};
  const request = vi.fn(transport([{ body: "late" }]));
  await expect(
    requestPublic(
      "https://example.com",
      { ...policy, timeoutMs: 10 },
      {
        lookup,
        request,
        beforeRequest: () =>
          new Promise<void>((resolve) => {
            release = resolve;
          }),
      },
    ),
  ).rejects.toThrow(/timeout/i);
  release();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(request).not.toHaveBeenCalled();
});

it("guards a queued operation invoked after its request deadline", async () => {
  let late: () => Promise<unknown> = async () => {};
  const request = vi.fn(transport([{ body: "late" }]));
  await expect(
    requestPublic(
      "https://example.com",
      { ...policy, timeoutMs: 10 },
      {
        lookup,
        request,
        aroundRequest: (_url: unknown, operation: () => Promise<unknown>) => {
          late = operation;
          return new Promise(() => {});
        },
      },
    ),
  ).rejects.toThrow(/timeout/i);
  await expect(late()).rejects.toThrow(/timeout/i);
  expect(request).not.toHaveBeenCalled();
});

it("destroys an active response and request on parent cancellation", async () => {
  const controller = new AbortController();
  const response = new Readable({ read() {} }) as Response;
  response.statusCode = 200;
  response.headers = {};
  const req = new FixtureRequest();
  const destroy = vi.spyOn(req, "destroy");
  const pending = requestPublic("https://example.com", policy, {
    lookup,
    signal: controller.signal,
    request: (
      _url: unknown,
      _options: unknown,
      callback: (r: Response) => void,
    ) => {
      req.end = () => {
        callback(response);
        controller.abort(new Error("stop fixture"));
      };
      return req;
    },
  });
  await expect(pending).rejects.toThrow("stop fixture");
  expect(destroy).toHaveBeenCalledOnce();
  expect(response.destroyed).toBe(true);
});
