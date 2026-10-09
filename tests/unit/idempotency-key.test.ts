import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";

import { createIdempotencyKey } from "../../src/lib/idempotency-key";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function withCrypto(value: unknown, run: () => void) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto")!;
  Object.defineProperty(globalThis, "crypto", { configurable: true, value });
  try {
    run();
  } finally {
    Object.defineProperty(globalThis, "crypto", original);
  }
}

test("安全上下文保留原生 UUID，调用时保留 Crypto receiver", () => {
  const crypto = {
    randomUUID() {
      assert.equal(this, crypto);
      return "12345678-1234-4abc-8abc-123456789abc";
    },
  };
  withCrypto(crypto, () => {
    assert.equal(createIdempotencyKey(), "12345678-1234-4abc-8abc-123456789abc");
  });
});

test("HTTP 无 randomUUID 时生成 UUID v4，保持单条和批量审核键长度约束", () => {
  withCrypto({ getRandomValues: webcrypto.getRandomValues.bind(webcrypto) }, () => {
    const keys = Array.from({ length: 512 }, createIdempotencyKey);
    assert.equal(new Set(keys).size, keys.length);
    for (const key of keys) {
      assert.match(key, UUID_V4);
      assert.equal(key.length, 36);
      assert.ok(`${key}:12345678-1234-4abc-8abc-123456789abc`.length <= 128);
    }
  });
});

test("回退 UUID 正确处理零字节、版本位与 variant 位", () => {
  for (const [byte, expected] of [
    [0, "00000000-0000-4000-8000-000000000000"],
    [255, "ffffffff-ffff-4fff-bfff-ffffffffffff"],
  ] as const) {
    withCrypto({ getRandomValues: (bytes: Uint8Array) => bytes.fill(byte) }, () => {
      assert.equal(createIdempotencyKey(), expected);
    });
  }
});
