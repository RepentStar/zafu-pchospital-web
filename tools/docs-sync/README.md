# docs-sync：站内文档自动同步

把 `ZAFU-PCHospital/ZAFU-PCHospital-Doc` 已经构建好的 **gh-pages 产物**定时同步到生产站点的
`public/handbook`。文档仓库自己已有 mdbook → gh-pages 的构建流水线（`.github/workflows/mdbook.yml`），
所以这里**不重新构建**，只做「取产物 + 原子替换」。

- 不重建站点、不重启服务、不动数据库、不动 `.docs-source`；
- 只轮询 `git ls-remote`（几 KB），哈希变了才下载产物（约 10MB）；
- 替换前做两道校验：产物完整性（`index.html` / `searchindex` / 主题 CSS）与
  **主题一致性**（与 `pnpm lint` 同一份 `tools/check-theme-palette.mjs`）；
- 旧目录留在 `public/handbook.prev`，回滚就是两次 `mv`。

## 组件

| 文件                | 服务器位置                              | 说明                               |
| ------------------- | --------------------------------------- | ---------------------------------- |
| `sync-handbook.sh`  | `/usr/local/bin/docs-sync`（755）       | 同步脚本本体                       |
| `docs-sync.service` | `/etc/systemd/system/docs-sync.service` | `Type=oneshot`，以 `zafu-web` 运行 |
| `docs-sync.timer`   | `/etc/systemd/system/docs-sync.timer`   | 每 30 分钟（带 ≤2 分钟随机延迟）   |

## 安装 / 重新安装（服务器上以 root 执行）

```bash
mkdir -p /tmp/docs-sync-install            # 把三个文件传到这个目录
install -m 755 /tmp/docs-sync-install/sync-handbook.sh /usr/local/bin/docs-sync
mkdir -p /var/lib/docs-sync && chown zafu-web:zafu-web /var/lib/docs-sync
install -m 644 /tmp/docs-sync-install/docs-sync.service /etc/systemd/system/
install -m 644 /tmp/docs-sync-install/docs-sync.timer   /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now docs-sync.timer
systemctl start docs-sync.service          # 立即跑一次
```

## 日常查看

```bash
systemctl list-timers docs-sync.timer      # 下次触发时间
journalctl -u docs-sync -n 50 --no-pager   # 最近日志
cat /var/lib/docs-sync/deployed-sha        # 当前部署的文档提交
systemctl start docs-sync.service          # 手工补跑（幂等）
```

## 回滚

```bash
cd /opt/zafu-pchospital-web/public
mv handbook handbook.bad && mv handbook.prev handbook
```

（回滚后 `/var/lib/docs-sync/deployed-sha` 与实际内容不一致，下次定时会把新版再拉回来；
要长期停在旧版就 `systemctl disable --now docs-sync.timer`。）

## 演练（不碰线上）

脚本支持两个环境变量覆盖路径，可在临时目录完整走一遍流程：

```bash
mkdir -p /tmp/rehearsal/public/handbook && echo old > /tmp/rehearsal/public/handbook/index.html
sudo -u zafu-web DOCS_SYNC_APP_DIR=/tmp/rehearsal DOCS_SYNC_STATE_DIR=/tmp/rehearsal-state \
  bash /usr/local/bin/docs-sync
```

## 已知边界

- **`/docs` 页的目录清单会滞后**：`src/data/doc-manifest.json` 是 `next build` 时静态 import 的，
  文档**增删页**后要等下一次整站部署才会刷新（正文本身分钟级更新）。这是刻意接受的取舍。
- 服务器到 GitHub 时通时断（实测过 fetch 挂起），脚本失败只记日志、等下一次定时；
  连续多天失败说明出口有问题，用 `journalctl -u docs-sync` 看原因。
- 只同步 `gh-pages` 分支；文档仓库若改了发布分支或改回 Pages 默认配置，这里要跟着改。
