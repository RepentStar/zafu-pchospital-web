-- 历史修机数据导入的「待认领」暂存（issue #72 评审 1）：导入时姓名尚未在册的行先落在这里，
-- 等该姓名的新成员注册/建档后自动补录成 APPROVED 记录，保证一份历史数据「只导入一次」。
-- 与 audit_logs 同理，这张表**不建外键**：行的归属成员此刻还不存在；
-- claimed_by_profile_id / created_record_id 只是事后追溯用的记录值
-- （若建 FK，则「先导入、后注册」这一核心场景根本写不进去）。

CREATE TABLE `repair_history_pending` (
  `id` CHAR(36) NOT NULL, `fingerprint` VARCHAR(128) NOT NULL,
  `real_name` VARCHAR(64) NOT NULL, `repair_date` DATE NOT NULL,
  `duration_minutes` INTEGER NOT NULL, `category_id` CHAR(36) NOT NULL,
  `content` TEXT NOT NULL, `result` VARCHAR(32) NOT NULL,
  `remark` VARCHAR(2000) NULL, `source_file` VARCHAR(255) NULL,
  `source_line` INTEGER NULL, `imported_by_user_id` CHAR(36) NULL,
  `imported_at` DATETIME(3) NOT NULL, `claimed_at` DATETIME(3) NULL,
  `claimed_by_profile_id` CHAR(36) NULL, `created_record_id` CHAR(36) NULL,
  UNIQUE INDEX `repair_history_pending_fingerprint_uq`(`fingerprint`),
  INDEX `repair_history_pending_name_claimed_idx`(`real_name`, `claimed_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;
