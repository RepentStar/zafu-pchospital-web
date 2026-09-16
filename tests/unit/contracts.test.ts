import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "../../src/lib/api/errors";
import { enforceRateLimit, resetRateLimitsForTests } from "../../src/lib/api/rate-limit";
import { maskPhone, maskQq, redactAuditSummary } from "../../src/lib/audit/redaction";
import { normalizePhone, normalizeQq } from "../../src/lib/security/normalization";
import { digestSessionToken } from "../../src/lib/security/secrets";
import { resetServerEnvForTests } from "../../src/lib/env";
import { assertSameOrigin, sessionCookie } from "../../src/lib/auth/request";
import { JoinApplicationStatus, Permission, RoleCode } from "../../src/types/contracts";

test("公共枚举不包含重复值", () => {
  for (const values of [JoinApplicationStatus, Permission, RoleCode]) {
    assert.equal(new Set(values).size, values.length);
  }
});

test("QQ 与手机号规范化只产生受控格式", () => {
  assert.equal(normalizeQq("123 456 789"), "123456789");
  assert.equal(normalizePhone("138-0000-0000"), "13800000000");
  assert.throws(() => normalizeQq("123"), AppError);
  assert.throws(() => normalizePhone("10000"), AppError);
});

test("审计摘要移除秘密并脱敏完整联系方式", () => {
  const redacted = redactAuditSummary({
    password: "do-not-log",
    inviteCode: "do-not-log",
    qq: "123456789",
    phoneNormalized: "13800000000",
    nested: { accessToken: "do-not-log", safe: "ok" },
  });
  assert.deepEqual(redacted, {
    qq: maskQq("123456789"),
    phoneNormalized: maskPhone("13800000000"),
    nested: { safe: "ok" },
  });
  assert.doesNotMatch(JSON.stringify(redacted), /do-not-log|13800000000|123456789/);
});

test("公开端点限流返回稳定错误码", () => {
  resetRateLimitsForTests();
  enforceRateLimit("test", 1, 60_000);
  assert.throws(
    () => enforceRateLimit("test", 1, 60_000),
    (error) => error instanceof AppError && error.code === "RATE_LIMITED",
  );
});

test("Session 摘要固定为 32 字节且不等于原令牌", () => {
  const previous = {
    AUTH_SECRET: process.env.AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    INVITE_CODE_PEPPER: process.env.INVITE_CODE_PEPPER,
    PII_AUDIT_PEPPER: process.env.PII_AUDIT_PEPPER,
  };
  process.env.AUTH_SECRET = "unit-test-auth-secret-at-least-32-bytes";
  process.env.DATABASE_URL = "mysql://unused";
  process.env.INVITE_CODE_PEPPER = "unit-test-invite-pepper-at-least-32-bytes";
  process.env.PII_AUDIT_PEPPER = "unit-test-audit-pepper-at-least-32-bytes";
  resetServerEnvForTests();
  const digest = digestSessionToken("a-private-random-session-token");
  assert.equal(digest.byteLength, 32);
  assert.notEqual(Buffer.from(digest).toString("utf8"), "a-private-random-session-token");
  for (const [name, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  resetServerEnvForTests();
});

test("Cookie 安全属性与写接口同源校验保持固定", () => {
  const cookie = sessionCookie("token", "2030-01-01T00:00:00.000Z");
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.sameSite, "lax");
  assert.equal(cookie.path, "/");
  assert.doesNotThrow(() =>
    assertSameOrigin(
      new Request("http://localhost/api", {
        headers: { origin: "http://localhost", host: "localhost" },
      }),
    ),
  );
  assert.throws(
    () =>
      assertSameOrigin(
        new Request("http://localhost/api", {
          headers: { origin: "https://example.com", host: "localhost" },
        }),
      ),
    AppError,
  );
});
