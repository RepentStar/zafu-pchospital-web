import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("缺少环境变量：DATABASE_URL");

const url = new URL(databaseUrl);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: url.port ? Number(url.port) : 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ""),
  timezone: "Z",
  charset: "utf8mb4",
});
async function main(): Promise<void> {
  const prisma = new PrismaClient({ adapter });
  const now = new Date();
  try {
    await prisma.role.upsert({
      where: { code: "MEMBER" },
      update: { name: "成员" },
      create: {
        id: "00000000-0000-4000-8000-000000000001",
        code: "MEMBER",
        name: "成员",
        createdAt: now,
      },
    });
    const categories = [
      ["10000000-0000-4000-8000-000000000001", "COOLING_CLEANING", "散热 / 清灰"],
      ["10000000-0000-4000-8000-000000000002", "HARDWARE", "硬件故障"],
      ["10000000-0000-4000-8000-000000000003", "SYSTEM", "系统问题"],
      ["10000000-0000-4000-8000-000000000004", "SOFTWARE", "软件问题"],
      ["10000000-0000-4000-8000-000000000005", "DRIVER", "驱动问题"],
      ["10000000-0000-4000-8000-000000000006", "NETWORK", "网络问题"],
      ["10000000-0000-4000-8000-000000000007", "STORAGE", "磁盘 / 存储"],
      ["10000000-0000-4000-8000-000000000008", "PERIPHERAL", "外设问题"],
      ["10000000-0000-4000-8000-000000000009", "OTHER", "其他"],
    ] as const;
    for (const [index, [id, code, name]] of categories.entries()) {
      await prisma.repairCategory.upsert({
        where: { code },
        update: { name, sortOrder: index + 1 },
        create: { id, code, name, sortOrder: index + 1, createdAt: now },
      });
    }
    await prisma.role.upsert({
      where: { code: "ADMIN" },
      update: { name: "管理员" },
      create: {
        id: "00000000-0000-4000-8000-000000000002",
        code: "ADMIN",
        name: "管理员",
        createdAt: now,
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

void main();
