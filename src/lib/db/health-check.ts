/**
 * GreatSQL 产品识别与基线校验（供 `tools/db-health.ts` 使用，也可单测）。
 *
 * 为什么需要它：`SELECT 1` 只能证明「连得上」。本地开发常用其它 MySQL 兼容实例
 * 替代 GreatSQL（见 `.env` 注释），若健康检查不识别产品，就会把这类实例误记为
 * 「GreatSQL 已通过验证」，掩盖真实环境差异。
 *
 * GreatSQL 的官方版本痕迹（实测/官方文档）：
 *   version         = `8.0.32-27`      ← 补丁号带 `-x`，Oracle MySQL 不带
 *   version_comment = `GreatSQL (GPL), Release 27, Revision db07cc5cb73`
 */

/** 固定基线（`docs/database.md` 第 1 节）。 */
export const GREATSQL_PRODUCT = "GreatSQL";
export const GREATSQL_BASE_VERSION = "8.0.32";
export const GREATSQL_REQUIRED_VERSION = "8.0.32-27";
export const GREATSQL_IMAGE_TAG = "greatsql/greatsql:8.0.32-27";
export const REQUIRED_TIME_ZONE = "+00:00";
export const REQUIRED_CHARACTER_SET = "utf8mb4";
export const REQUIRED_COLLATION = "utf8mb4_unicode_ci";

export type DatabaseSessionInfo = {
  databaseName: string | null;
  timeZone: string;
  characterSet: string;
  collation: string;
  version: string;
  versionComment: string;
};

export type HealthCheckResult =
  { ok: true; info: DatabaseSessionInfo } | { ok: false; reason: string };

/**
 * 识别数据库是否为 GreatSQL。
 *
 * 两项必须同时成立：
 * 1. `version_comment` 明确包含产品名 `GreatSQL`；
 * 2. `version` 严格属于固定镜像基线 `8.0.32-27`，仅允许其后的构建元数据后缀。
 *
 * 版本串只能说明协议兼容性，不能替代产品身份。任何其它 MySQL 兼容实例即使伪装成
 * `8.0.32-27`，只要产品注释不是 GreatSQL，就必须拒绝，避免健康检查假阳性。
 */
export function isGreatSql(version: string, versionComment: string): boolean {
  const normalizedVersion = version.trim();
  return (
    versionComment.includes(GREATSQL_PRODUCT) &&
    (normalizedVersion === GREATSQL_REQUIRED_VERSION ||
      normalizedVersion.startsWith(`${GREATSQL_REQUIRED_VERSION}-`) ||
      normalizedVersion.startsWith(`${GREATSQL_REQUIRED_VERSION}+`))
  );
}

/** 校验一次会话信息是否满足全部基线；返回首个失败原因。 */
export function checkDatabaseBaseline(info: DatabaseSessionInfo): HealthCheckResult {
  if (!info.versionComment.includes(GREATSQL_PRODUCT)) {
    return {
      ok: false,
      reason:
        `当前数据库不是 GreatSQL：version=${info.version}, ` +
        `version_comment=${info.versionComment}。` +
        `本地若用其它 MySQL 兼容实例替代，请勿将其记为 GreatSQL 验证通过。`,
    };
  }
  if (!isGreatSql(info.version, info.versionComment)) {
    return {
      ok: false,
      reason: `GreatSQL 版本必须匹配固定基线 ${GREATSQL_REQUIRED_VERSION}：${info.version}`,
    };
  }
  if (info.timeZone !== REQUIRED_TIME_ZONE) {
    return { ok: false, reason: `会话时区必须为 ${REQUIRED_TIME_ZONE}，实际为 ${info.timeZone}` };
  }
  if (info.characterSet !== REQUIRED_CHARACTER_SET || info.collation !== REQUIRED_COLLATION) {
    return {
      ok: false,
      reason:
        `字符集/排序规则必须为 ${REQUIRED_CHARACTER_SET} / ${REQUIRED_COLLATION}，` +
        `实际为 ${info.characterSet} / ${info.collation}`,
    };
  }
  return { ok: true, info };
}
