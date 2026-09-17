import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "@/lib/env";

function createClient(): PrismaClient {
  const url = new URL(getServerEnv().DATABASE_URL);
  if (url.protocol !== "mysql:") throw new Error("DATABASE_URL 必须使用 mysql:// 协议");

  // `allowPublicKeyRetrieval` **默认关闭**：开启后客户端会在非 TLS 连接上把服务端
  // 下发的 RSA 公钥用于加密口令，攻击者可在中间人位置替换公钥并解出明文口令。
  // 因此只有显式在 DATABASE_URL 写 `allowPublicKeyRetrieval=true` 时才开启，
  // 且仅限本地开发（MySQL 8+/9 默认 caching_sha2_password，非 TLS 首次认证需要
  // 该开关，否则报 SQLState 08S01 "RSA public key is not available client side"，
  // 在应用层表现为 `pool timeout: ... active=0 idle=0`，看着像连接池耗尽）。
  // 生产必须改用 TLS 连接，而不是打开此开关。
  const allowPublicKeyRetrieval = url.searchParams.get("allowPublicKeyRetrieval") === "true";

  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: Number(url.searchParams.get("connection_limit") ?? 10),
    allowPublicKeyRetrieval,
    timezone: "Z",
    charset: "utf8mb4",
  });

  return new PrismaClient({ adapter });
}

const globalForDb = globalThis as typeof globalThis & { __pcHospitalDb?: PrismaClient };
let productionDb: PrismaClient | undefined;

export function getDb(): PrismaClient {
  const client = globalForDb.__pcHospitalDb ?? productionDb ?? createClient();
  if (process.env.NODE_ENV !== "production") globalForDb.__pcHospitalDb = client;
  else productionDb = client;
  return client;
}

export async function disconnectDb(): Promise<void> {
  await (globalForDb.__pcHospitalDb ?? productionDb)?.$disconnect();
  globalForDb.__pcHospitalDb = undefined;
  productionDb = undefined;
}
