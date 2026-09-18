import assert from "node:assert/strict";
import test from "node:test";

import { buildUpcomingEntries } from "../../src/components/member/MemberUpcoming";
import { memberCopy } from "../../src/config/member";
import type { DeferredModule } from "../../src/types/contracts";

/**
 * 回归：`MemberUpcoming` 的列表 key 必须唯一。
 *
 * 真实故障（浏览器 Console 报错）：
 *   Encountered two children with the same key, `M4`.
 * 原因：key 取了 `item.module.module`，而通知与收藏的 module **都是 `"M4"`**。
 * 因此这里断言 key 集合无重复 —— 只要有人把 key 改回 `module`，本用例立刻失败。
 */

const deferredM4: DeferredModule = { available: false, module: "M4" };
const deferredM5: DeferredModule = { available: false, module: "M5" };

test("M3 接入位条目的 key 唯一（M4 同时提供两项，不可用 module 当 key）", () => {
  const entries = buildUpcomingEntries({
    notifications: deferredM4,
    favorites: deferredM4,
    ranking: deferredM5,
  });

  const keys = entries.map((entry) => entry.key);
  assert.equal(keys.length, 3);
  assert.equal(new Set(keys).size, keys.length, `key 出现重复：${JSON.stringify(keys)}`);

  // 明确锁死「module 值本身是重复的」这一前提 ——
  // 若将来 M4 拆成两个模块号，本用例会提醒重新审视该假设。
  const moduleIds = entries.map((entry) => entry.module.module);
  assert.deepEqual(moduleIds, ["M4", "M4", "M5"]);
});

test("M3 接入位条目顺序与文案固定，且不泄漏里程碑编号", () => {
  const entries = buildUpcomingEntries({
    notifications: deferredM4,
    favorites: deferredM4,
    ranking: deferredM5,
  });

  assert.deepEqual(
    entries.map((entry) => entry.key),
    ["notifications", "favorites", "ranking"],
  );
  assert.deepEqual(
    entries.map((entry) => entry.name),
    [
      memberCopy.dashboard.upcomingNotifications,
      memberCopy.dashboard.upcomingFavorites,
      memberCopy.dashboard.upcomingRanking,
    ],
  );

  // 面向用户的文案里不得出现 M4/M5 这类内部编号
  for (const entry of entries) {
    assert.doesNotMatch(entry.name, /M[0-9]/);
  }
  assert.doesNotMatch(memberCopy.dashboard.upcomingNote, /M[0-9]/);
});
