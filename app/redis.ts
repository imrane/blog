import net from "node:net";

type RespValue = string | number | null | RespValue[];

class IncompleteRespError extends Error {
  constructor() {
    super("Incomplete RESP payload");
  }
}

const CRLF = "\r\n";

function serializeCommand(args: (string | number)[]) {
  const parts = args.map(arg => {
    const value = String(arg);
    return `$${Buffer.byteLength(value)}${CRLF}${value}${CRLF}`;
  });
  return `*${args.length}${CRLF}${parts.join("")}`;
}

function parseResp(buffer: Buffer, offset = 0): { value: RespValue; next: number } {
  if (offset >= buffer.length) {
    throw new IncompleteRespError();
  }

  const prefix = buffer[offset];
  let cursor = offset + 1;

  const readLine = () => {
    const end = buffer.indexOf(CRLF, cursor);
    if (end === -1) {
      throw new IncompleteRespError();
    }
    const line = buffer.toString("utf8", cursor, end);
    cursor = end + 2;
    return line;
  };

  switch (prefix) {
    case 43: {
      // +
      const line = readLine();
      return { value: line, next: cursor };
    }
    case 45: {
      // -
      const message = readLine();
      throw new Error(`Redis error: ${message}`);
    }
    case 58: {
      // :
      const line = readLine();
      return { value: Number.parseInt(line, 10), next: cursor };
    }
    case 36: {
      // $
      const lengthLine = readLine();
      const length = Number.parseInt(lengthLine, 10);
      if (Number.isNaN(length)) {
        throw new Error(`Invalid bulk string length: ${lengthLine}`);
      }
      if (length === -1) {
        return { value: null, next: cursor };
      }
      const end = cursor + length;
      if (end + 2 > buffer.length) {
        throw new IncompleteRespError();
      }
      const value = buffer.toString("utf8", cursor, end);
      cursor = end + 2;
      return { value, next: cursor };
    }
    case 42: {
      // *
      const lengthLine = readLine();
      const length = Number.parseInt(lengthLine, 10);
      if (Number.isNaN(length)) {
        throw new Error(`Invalid array length: ${lengthLine}`);
      }
      if (length === -1) {
        return { value: null, next: cursor };
      }
      const items: RespValue[] = [];
      for (let i = 0; i < length; i++) {
        const parsed = parseResp(buffer, cursor);
        items.push(parsed.value);
        cursor = parsed.next;
      }
      return { value: items, next: cursor };
    }
    default:
      throw new Error(`Unsupported RESP prefix: ${String.fromCharCode(prefix)}`);
  }
}

async function sendCommand(command: (string | number)[], host: string, port: number) {
  const payload = serializeCommand(command);

  return await new Promise<RespValue>((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    let settled = false;
    const settle = {
      resolve(value: RespValue) {
        if (settled) return;
        settled = true;
        resolve(value);
      },
      reject(error: unknown) {
        if (settled) return;
        settled = true;
        reject(error);
      },
    };
    const socket = net.createConnection({ host, port });

    socket.setTimeout(5_000, () => {
      socket.destroy(new Error("Redis command timed out"));
    });

    socket.on("connect", () => {
      socket.write(payload);
    });

    socket.on("data", chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      try {
        const { value } = parseResp(buffer);
        settle.resolve(value);
        socket.end();
      } catch (error) {
        if (error instanceof IncompleteRespError) {
          return;
        }
        settle.reject(error);
        socket.destroy();
      }
    });

    socket.on("error", settle.reject);

    socket.on("close", hadError => {
      if (hadError || settled) return;
      if (!buffer.length) {
        settle.reject(new Error("Redis connection closed before response was received"));
      }
    });
  });
}

class RedisClient {
  constructor(
    private readonly host: string,
    private readonly port: number
  ) {}

  private async command(args: (string | number)[]) {
    return await sendCommand(args, this.host, this.port);
  }

  async hgetall(key: string) {
    const result = await this.command(["HGETALL", key]);
    if (result === null) return null;
    if (!Array.isArray(result)) {
      throw new Error("Unexpected response type for HGETALL");
    }
    const entries: Record<string, string> = {};
    for (let i = 0; i < result.length; i += 2) {
      const field = result[i];
      const value = result[i + 1];
      if (typeof field === "string" && typeof value === "string") {
        entries[field] = value;
      }
    }
    return entries;
  }

  async hincrby(key: string, field: string, increment: number) {
    const result = await this.command(["HINCRBY", key, field, increment]);
    if (typeof result === "number") return result;
    const parsed = Number(result);
    if (Number.isNaN(parsed)) {
      throw new Error("Unexpected response type for HINCRBY");
    }
    return parsed;
  }

  async hget(key: string, field: string) {
    const result = await this.command(["HGET", key, field]);
    if (result === null) return null;
    return String(result);
  }

  async set(key: string, value: unknown) {
    const normalized =
      typeof value === "string" || typeof value === "number"
        ? String(value)
        : JSON.stringify(value);
    await this.command(["SET", key, normalized]);
  }

  async get(key: string) {
    const result = await this.command(["GET", key]);
    if (result === null) return null;
    const value = String(result);
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
}

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

const redis =
  process.env.SKIP_VIEWS === "1"
    ? null
    : (() => {
        const parsedUrl = new URL(redisUrl);
        const redisHost = parsedUrl.hostname;
        const redisPort = Number.parseInt(parsedUrl.port || "6379", 10);
        return new RedisClient(redisHost, redisPort);
      })();

export default redis;
