/** Reject ambiguous duplicate object members before JSON.parse discards evidence. */
export function parseCaptureJson(text) {
  let offset = 0,
    nodes = 0;
  const fail = () => {
    throw new Error("Invalid or ambiguous capture JSON");
  };
  const whitespace = () => {
    while (/[ \t\r\n]/.test(text[offset] ?? "!")) offset++;
  };
  function string() {
    if (text[offset] !== '"') fail();
    const start = offset++;
    while (offset < text.length) {
      const char = text[offset++];
      if (char === '"') return JSON.parse(text.slice(start, offset));
      if (char === "\\") offset++;
    }
    fail();
  }
  function value(depth) {
    if (++nodes > 10000 || depth > 32) fail();
    whitespace();
    if (text[offset] === '"') {
      string();
      return;
    }
    if (text[offset] === "{") {
      offset++;
      whitespace();
      const keys = new Set();
      if (text[offset] === "}") {
        offset++;
        return;
      }
      while (true) {
        whitespace();
        const key = string();
        if (keys.has(key)) fail();
        keys.add(key);
        whitespace();
        if (text[offset++] !== ":") fail();
        value(depth + 1);
        whitespace();
        const separator = text[offset++];
        if (separator === "}") return;
        if (separator !== ",") fail();
      }
    }
    if (text[offset] === "[") {
      offset++;
      whitespace();
      if (text[offset] === "]") {
        offset++;
        return;
      }
      while (true) {
        value(depth + 1);
        whitespace();
        const separator = text[offset++];
        if (separator === "]") return;
        if (separator !== ",") fail();
      }
    }
    const token =
      /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(
        text.slice(offset),
      );
    if (!token) fail();
    offset += token[0].length;
  }
  try {
    value(0);
    whitespace();
    if (offset !== text.length) fail();
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid or ambiguous capture JSON");
  }
}
