#!/usr/bin/env bash
#
# 站内文档同步：ZAFU-PCHospital-Doc 的 gh-pages 产物 → 生产的 public/handbook。
#
# 由 docs-sync.timer 每 30 分钟调用（也可手工执行，幂等）：
#   1. 读文档仓库 gh-pages 的 HEAD sha，与上次部署的 sha 比对，相同即退出；
#   2. 有变化才下载 tarball，校验产物完整性 + 主题与官网令牌一致；
#   3. 原子替换 public/handbook，上一版留在 public/handbook.prev 供回滚。
#
# 只碰 public/handbook：不重建站点、不重启服务、不动数据库、不动 .docs-source。
# 以 zafu-web 身份运行（服务账号），staging 在 /tmp，与 /opt 同盘，mv 是原子的。
#
# 回滚：mv public/handbook public/handbook.bad && mv public/handbook.prev public/handbook
# 手工补跑：systemctl start docs-sync.service && journalctl -u docs-sync -n 50 --no-pager
#
set -euo pipefail

DOCS_REPO="ZAFU-PCHospital/ZAFU-PCHospital-Doc"
DOCS_BRANCH="gh-pages"
DOCS_SOURCE_REF="main" # 一致性校验比对的是文档仓库 main 的源码
# 生产路径；演练时可用 DOCS_SYNC_APP_DIR / DOCS_SYNC_STATE_DIR 指向临时目录，
# 行为与生产完全一致而不碰线上文件。
APP_DIR="${DOCS_SYNC_APP_DIR:-/opt/zafu-pchospital-web}"
TOOLS_DIR="${DOCS_SYNC_TOOLS_DIR:-${APP_DIR}}"
DEST="${APP_DIR}/public/handbook"
PREV="${APP_DIR}/public/handbook.prev"
STAGE="${APP_DIR}/public/.handbook.stage"
STATE_DIR="${DOCS_SYNC_STATE_DIR:-/var/lib/docs-sync}"
SHA_FILE="${STATE_DIR}/deployed-sha"

log() { echo "[docs-sync] $*"; }
warn() { echo "[docs-sync] $*" >&2; }
die() {
  echo "[docs-sync] 失败：$*" >&2
  exit 1
}

mkdir -p "$STATE_DIR"

# 单实例：手工执行与 timer 撞车时直接退出，不排队
exec 9>"${STATE_DIR}/.lock"
flock -n 9 || {
  log "已有实例在运行，退出"
  exit 0
}

# 服务器到 GitHub 的连通性时好时坏（实测过挂起与超时），所以取 sha 要重试；
# 内部日志走 stderr，别把 stdout 的 sha 污染了。
fetch_remote_sha() {
  local attempt sha
  for attempt in 1 2 3 4 5; do
    sha="$(timeout 45 git ls-remote "https://github.com/${DOCS_REPO}.git" "refs/heads/${DOCS_BRANCH}" 2>/dev/null | cut -f1)"
    if [ -n "$sha" ]; then
      echo "$sha"
      return 0
    fi
    warn "第 ${attempt}/5 次取 ${DOCS_BRANCH} 的 sha 失败（外网抖动），10 秒后重试"
    sleep 10
  done
  return 1
}

remote_sha="$(fetch_remote_sha)" || die "连续 5 次取不到 ${DOCS_BRANCH} 的 sha，等下一次定时再试"

deployed_sha="$(cat "$SHA_FILE" 2>/dev/null || true)"
if [ "${remote_sha}" = "${deployed_sha}" ]; then
  log "无变化（${remote_sha:0:12}），退出"
  exit 0
fi
log "检测到更新：${deployed_sha:0:12} → ${remote_sha:0:12}"

work="$(mktemp -d /tmp/docs-sync.XXXXXX)"
trap 'rm -rf "${work}"' EXIT

curl -fsSL --connect-timeout 15 --max-time 600 --retry 3 --retry-delay 5 --retry-connrefused \
  "https://codeload.github.com/${DOCS_REPO}/tar.gz/refs/heads/${DOCS_BRANCH}" \
  -o "${work}/book.tar.gz" || die "下载失败（外网不稳，等下次定时再试）"

mkdir -p "${work}/unpack"
tar -xzf "${work}/book.tar.gz" -C "${work}/unpack" || die "解包失败"
src="$(find "${work}/unpack" -mindepth 1 -maxdepth 1 -type d | head -1)"
[ -n "${src}" ] || die "tarball 里没有目录"

# 产物完整性：缺一即中止，线上一个字节都不动
[ -f "${src}/index.html" ] || die "产物缺少 index.html"
find "${src}" -maxdepth 1 -name 'searchindex*.js' -print -quit | grep -q . || die "产物缺少 searchindex"
find "${src}/theme" -name 'pc-hospital*.css' -print -quit | grep -q . || die "产物缺少文档主题 CSS"

# 主题与 mdBook 配置闸门：与 pnpm lint 用同一份校验器，比对文档仓库 main 的源码
# （theme/pc-hospital.css + book.toml）是否与官网令牌/模式映射一致。
# 注意：raw.githubusercontent.com 在国内常被墙，这里统一走 codeload（实测可达且很快）。
curl -fsSL --connect-timeout 15 --max-time 300 --retry 3 --retry-delay 5 --retry-connrefused \
  "https://codeload.github.com/${DOCS_REPO}/tar.gz/refs/heads/${DOCS_SOURCE_REF}" \
  -o "${work}/source.tar.gz" || die "下载文档源码失败，无法校验一致性（宁可不同步，也不上线没校验的内容）"
mkdir -p "${work}/source"
tar -xzf "${work}/source.tar.gz" -C "${work}/source" || die "文档源码解包失败"
docs_src="$(find "${work}/source" -mindepth 1 -maxdepth 1 -type d | head -1)"
[ -f "${docs_src}/book.toml" ] || die "文档源码缺少 book.toml"
[ -f "${docs_src}/theme/pc-hospital.css" ] || die "文档源码缺少主题 CSS"
checker="${TOOLS_DIR}/tools/check-theme-palette.mjs"
[ -f "${checker}" ] || die "找不到校验器 ${checker}（演练时请把 DOCS_SYNC_TOOLS_DIR 指向站点目录）"
DOCS_SOURCE_DIR="${docs_src}" node "${checker}" ||
  die "主题或 mdBook 配置与官网不一致，拒绝替换（文档仓库改了配色但没同步官网？）"
log "主题与配置校验通过"

# gh-pages 是给 GitHub Pages 用的，这两个文件不属于站内文档
rm -f "${src}/CNAME" "${src}/.nojekyll"

# 原子替换（/tmp 与 /opt 同一文件系统，mv 是 rename）
rm -rf "$STAGE"
mv "$src" "$STAGE"
rm -rf "$PREV"
if [ -d "$DEST" ]; then mv "$DEST" "$PREV"; fi
mv "$STAGE" "$DEST"

echo "$remote_sha" >"$SHA_FILE"
log "已部署 ${remote_sha:0:12}，上一版保留在 ${PREV}"
