-- 机主（客户）姓名 / 电话（issue #79 第 6 项）：
-- 接待落单生成草稿时自动带自报名；手工建单由成员填写。
-- 两列都可空：历史记录没有机主信息，不回填、也不用默认值伪造。

ALTER TABLE `repair_records`
  ADD COLUMN `owner_name` VARCHAR(40) NULL,
  ADD COLUMN `owner_phone` VARCHAR(11) NULL;
