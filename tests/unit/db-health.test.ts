import assert from "node:assert/strict";
import test from "node:test";

import {
  checkDatabaseBaseline,
  isGreatSql,
  type DatabaseSessionInfo,
  GREATSQL_REQUIRED_VERSION,
  REQUIRED_CHARACTER_SET,
  REQUIRED_COLLATION,
  REQUIRED_TIME_ZONE,
} from "../../src/lib/db/health-check";

// ---------------------------------------------------------------------------
// GreatSQL 产品识别
//
// 这些用例锁定的是一处真实缺陷：`db:health` 此前只 SELECT 会话参数，
// 不校验产品，于是本地用 MySQL 9.6 替代时也会输出 ok:true，
// 让「GreatSQL 已验证」这句话失去意义。
// ---------------------------------------------------------------------------

test("健康检查识别：GreatSQL 官方 version_comment 被接受", () => {
  assert.equal(isGreatSql("8.0.32-27", "GreatSQL (GPL), Release 27, Revision db07cc5cb73"), true);
});

test("健康检查识别：版本串不能替代 GreatSQL 产品注释，且补丁必须为固定基线", () => {
  assert.equal(isGreatSql("8.0.32-27", "Some other comment"), false);
  assert.equal(isGreatSql("8.0.32-24", "GreatSQL (GPL), Release 24"), false);
  assert.equal(isGreatSql("8.0.32-27-log", "GreatSQL (GPL), Release 27"), true);
  assert.equal(isGreatSql("8.0.32-27+build.1", "GreatSQL (GPL), Release 27"), true);
});

test("健康检查识别：Oracle MySQL 官方版本串被拒绝", () => {
  // Oracle MySQL 的 version 不带 `-补丁号`，version_comment 也不含 GreatSQL
  assert.equal(isGreatSql("8.0.32", "MySQL Community Server - GPL"), false);
  assert.equal(isGreatSql("9.6.0", "MySQL Community Server - GPL"), false);
  assert.equal(isGreatSql("8.4.0", ""), false);
});

test("健康检查识别：MariaDB 被拒绝", () => {
  assert.equal(isGreatSql("10.11.6-MariaDB", "mariadb.org binary distribution"), false);
});

// ---------------------------------------------------------------------------
// 基线校验
// ---------------------------------------------------------------------------

const greatSqlInfo: DatabaseSessionInfo = {
  databaseName: "zafu_pchospital",
  timeZone: REQUIRED_TIME_ZONE,
  characterSet: REQUIRED_CHARACTER_SET,
  collation: REQUIRED_COLLATION,
  version: "8.0.32-27",
  versionComment: "GreatSQL (GPL), Release 27, Revision db07cc5cb73",
};

test("健康检查通过：符合基线的 GreatSQL 会话", () => {
  const result = checkDatabaseBaseline(greatSqlInfo);
  assert.equal(result.ok, true);
});

test("健康检查拒绝：本地 MySQL 替代实例不得被记为 GreatSQL 通过", () => {
  const result = checkDatabaseBaseline({
    ...greatSqlInfo,
    version: "9.6.0",
    versionComment: "MySQL Community Server - GPL",
  });
  assert.equal(result.ok, false);
  assert.match(result.ok === false ? result.reason : "", /不是 GreatSQL/);
  // 报错必须带上实际版本痕迹，便于排查
  assert.match(result.ok === false ? result.reason : "", /9\.6\.0/);
});

test("健康检查拒绝：GreatSQL 但版本超出基线", () => {
  const result = checkDatabaseBaseline({
    ...greatSqlInfo,
    version: "8.4.6-1",
    versionComment: `GreatSQL (GPL), Release 1, Revision abc`,
  });
  assert.equal(result.ok, false);
  assert.match(result.ok === false ? result.reason : "", new RegExp(GREATSQL_REQUIRED_VERSION));
});

test("健康检查拒绝：正确版本串但产品注释不是 GreatSQL", () => {
  const result = checkDatabaseBaseline({
    ...greatSqlInfo,
    versionComment: "Some other comment",
  });
  assert.equal(result.ok, false);
  assert.match(result.ok === false ? result.reason : "", /不是 GreatSQL/);
});

test("健康检查拒绝：时区不是 UTC", () => {
  const result = checkDatabaseBaseline({ ...greatSqlInfo, timeZone: "+08:00" });
  assert.equal(result.ok, false);
  assert.match(result.ok === false ? result.reason : "", /时区/);
});

test("健康检查拒绝：字符集或排序规则不符", () => {
  for (const info of [
    { ...greatSqlInfo, characterSet: "utf8" },
    { ...greatSqlInfo, collation: "utf8mb4_general_ci" },
  ]) {
    const result = checkDatabaseBaseline(info);
    assert.equal(result.ok, false);
    assert.match(result.ok === false ? result.reason : "", /字符集/);
  }
});
