import assert from "node:assert/strict";
import { once } from "node:events";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  customizeHandbook,
  probeHandbookHttp,
  validateHandbook,
  verifyHandbookHttp,
} from "../../tools/handbook.mjs";

const require = createRequire(import.meta.url);
const { setupFsCheck } = require("next/dist/server/lib/router-utils/filesystem");
const { defaultConfig } = require("next/dist/server/config-shared");

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "handbook-sync-test-"));
  mkdirSync(path.join(root, "theme"));
  mkdirSync(path.join(root, "Manual"));
  writeFileSync(path.join(root, "theme/pc-hospital-new.css"), "/* custom css */");
  writeFileSync(path.join(root, "theme/pc-hospital-new.js"), "/* custom js */");
  writeFileSync(path.join(root, "searchindex-new.js"), "/* new search index */");
  const html = (prefix: string) =>
    `<html><head><!-- Custom HTML head --><link rel="stylesheet" href="${prefix}theme/pc-hospital-new.css"><script>window.path_to_searchindex_js="${prefix}searchindex-new.js";</script></head><body><div class="left-buttons"></div><script src="${prefix}theme/pc-hospital-new.js"></script></body></html>`;
  writeFileSync(path.join(root, "index.html"), html(""));
  writeFileSync(path.join(root, "Manual/Workflow.html"), html("../"));
  writeFileSync(path.join(root, "toc.html"), "<html><body>sidebar iframe</body></html>");
  return root;
}

test("同步与本地构建共用定制，嵌套页面正确且重复执行幂等", () => {
  const root = fixture();
  try {
    const result = customizeHandbook(root);
    assert.equal(result.themeCss, path.join(root, "theme/pc-hospital-new.css"));
    const html = readFileSync(path.join(root, "Manual/Workflow.html"), "utf8");
    assert.match(html, /data-pc-hospital-theme-bootstrap="true"/);
    assert.match(html, /data-pc-hospital-return="true"/);
    assert.match(html, /data-pc-hospital-font="true"/);
    assert.ok(
      html.indexOf("data-pc-hospital-theme-bootstrap") <
        html.indexOf('src="../theme/pc-hospital-new.js"'),
    );
    customizeHandbook(root);
    assert.equal(readFileSync(path.join(root, "Manual/Workflow.html"), "utf8"), html);
    assert.equal(
      readFileSync(path.join(root, "toc.html"), "utf8"),
      "<html><body>sidebar iframe</body></html>",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("拒绝只有孤立主题文件、HTML 引用缺失、越界与缺失搜索索引的产物", () => {
  const root = fixture();
  try {
    const index = path.join(root, "index.html");
    const original = readFileSync(index, "utf8");
    writeFileSync(index, original.replace("theme/pc-hospital-new.css", "theme/missing.css"));
    assert.throws(() => validateHandbook(root), /引用的资源不存在/);
    writeFileSync(index, original.replace("theme/pc-hospital-new.css", "../outside.css"));
    assert.throws(() => validateHandbook(root), /越界/);
    writeFileSync(index, original.replace(/<link[^>]+>/, ""));
    assert.throws(() => validateHandbook(root), /未引用自定义主题/);
    writeFileSync(index, original);
    rmSync(path.join(root, "searchindex-new.js"));
    writeFileSync(path.join(root, "searchindex-unrelated.js"), "orphan index");
    assert.throws(() => validateHandbook(root), /引用的资源不存在：searchindex-new.js/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("HTTP 闸门识别新增文件不可见、资源 404 和返回旧内容；探针总是清理", async () => {
  const root = fixture();
  customizeHandbook(root);
  // 当前安装的 Next.js 生产路由在初始化后不会识别新文件名。
  const app = mkdtempSync(path.join(tmpdir(), "handbook-next-test-"));
  const dist = path.join(app, ".next");
  mkdirSync(path.join(dist, "static"), { recursive: true });
  mkdirSync(path.join(dist, "server"));
  mkdirSync(path.join(app, "public/handbook"), { recursive: true });
  writeFileSync(path.join(app, "public/handbook/index.html"), "old html");
  writeFileSync(path.join(dist, "BUILD_ID"), "isolated-probe");
  writeFileSync(
    path.join(dist, "routes-manifest.json"),
    JSON.stringify({ dataRoutes: [], dynamicRoutes: [], redirects: [], rewrites: [], headers: [] }),
  );
  writeFileSync(
    path.join(dist, "prerender-manifest.json"),
    JSON.stringify({ version: 4, routes: {}, dynamicRoutes: {}, notFoundRoutes: [], preview: {} }),
  );
  writeFileSync(path.join(dist, "server/pages-manifest.json"), "{}");
  writeFileSync(path.join(dist, "server/functions-config-manifest.json"), '{"functions":{}}');
  const options = { dir: app, dev: false, config: defaultConfig };
  const snapshot = await setupFsCheck(options);
  writeFileSync(path.join(app, "public/handbook/new.css"), "new css");
  assert.equal(await snapshot.getItem("/handbook/new.css"), null);
  const restarted = await setupFsCheck(options);
  assert.equal((await restarted.getItem("/handbook/new.css")).type, "publicFolder");
  let mode = "snapshot";
  const server = createServer(async (request, response) => {
    const relative = decodeURIComponent(
      new URL(request.url!, "http://localhost").pathname.replace(/^\/handbook\//, ""),
    );
    const filename = path.join(root, relative);
    if (
      (mode === "snapshot" && !(await snapshot.getItem(`/handbook/${relative}`))) ||
      !existsSync(filename)
    ) {
      response.writeHead(404).end("missing");
    } else {
      const type = relative.endsWith(".css")
        ? "text/css"
        : relative.endsWith(".js")
          ? "application/javascript"
          : "text/html";
      response.setHeader("Content-Type", mode === "mime" ? "text/plain" : type);
      response.end(mode === "stale" ? "old version" : readFileSync(filename));
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/handbook/`;
  try {
    await assert.rejects(probeHandbookHttp(root, url), /404/);
    assert.ok(!readdirSync(root).some((name) => name.startsWith("docs-sync-probe-")));
    await assert.rejects(verifyHandbookHttp(root, url), /404/);
    mode = "static";
    await probeHandbookHttp(root, url);
    await verifyHandbookHttp(root, url);
    mode = "stale";
    await assert.rejects(verifyHandbookHttp(root, url), /内容与磁盘不一致/);
    mode = "mime";
    await assert.rejects(verifyHandbookHttp(root, url), /类型错误/);
    await assert.rejects(probeHandbookHttp(root, "http://localhost/other/"), /BASE_URL/);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(root, { recursive: true, force: true });
    rmSync(app, { recursive: true, force: true });
  }
});
