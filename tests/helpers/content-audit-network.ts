import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
type Reply = {
  error?: string;
  status?: number;
  headers?: Record<string, string>;
  body?: string | Buffer;
};
export function networkFixture(routes: Record<string, Reply | Reply[]>) {
  const calls: string[] = [];
  let now = 0;
  const request = (
    url: URL,
    _options: unknown,
    callback: (
      response: Readable & {
        statusCode: number;
        headers: Record<string, string>;
      },
    ) => void,
  ) => {
    const req = Object.assign(new EventEmitter(), {
      destroy() {
        return this;
      },
      end() {
        queueMicrotask(() => {
          calls.push(url.href);
          const route = routes[url.href];
          const reply = Array.isArray(route) ? route.shift() : route;
          if (!reply) {
            req.emit("error", new Error("Unexpected fixture URL"));
            return;
          }
          if (reply.error) {
            req.emit(
              "error",
              Object.assign(new Error("Fixture connection error"), {
                code: reply.error,
              }),
            );
            return;
          }
          const response = Object.assign(
            Readable.from([Buffer.from(reply.body ?? "")]),
            {
              statusCode: reply.status ?? 200,
              headers: reply.headers ?? {
                "content-type": "text/plain; charset=utf-8",
              },
            },
          );
          callback(response);
        });
      },
    });
    return req;
  };
  const adapters = {
    request,
    lookup: async () => [{ address: "8.8.8.8", family: 4 }],
    scheduler: {
      run: (_url: string, operation: () => unknown) => operation(),
      setDelay: () => {},
    },
    now: () => now,
    sleep: async (ms: number) => {
      now += ms;
    },
  };
  return { calls, adapters };
}
