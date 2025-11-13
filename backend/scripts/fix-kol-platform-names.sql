-- 修复 kol_list 表中的 platform 字段，将拼音转换为中文
-- 安全处理方式：先识别冲突，再处理

-- 1. 首先统计需要修复的记录数量
SELECT 'wechat_official' as platform, COUNT(*) as count FROM kol_list WHERE platform = 'wechat_official'
UNION ALL
SELECT 'xiaohongshu' as platform, COUNT(*) as count FROM kol_list WHERE platform = 'xiaohongshu'
UNION ALL
SELECT 'kuaishou' as platform, COUNT(*) as count FROM kol_list WHERE platform = 'kuaishou'
UNION ALL
SELECT 'wechat_video' as platform, COUNT(*) as count FROM kol_list WHERE platform = 'wechat_video'
UNION ALL
SELECT 'bilibili' as platform, COUNT(*) as count FROM kol_list WHERE platform = 'bilibili'
UNION ALL
SELECT 'weibo' as platform, COUNT(*) as count FROM kol_list WHERE platform = 'weibo';

-- 2. 识别转换后会产生冲突的记录
WITH conflict_check AS (
  SELECT 
    t1.id as old_id,
    t1.platform as old_platform,
    t1.account_id,
    CASE t1.platform
      WHEN 'wechat_official' THEN '微信公众号'
      WHEN 'xiaohongshu' THEN '小红书'
      WHEN 'kuaishou' THEN '快手'
      WHEN 'wechat_video' THEN '微信视频号'
      WHEN 'bilibili' THEN 'B站'
      WHEN 'weibo' THEN '微博'
    END AS new_platform
  FROM kol_list t1
  WHERE t1.platform IN ('wechat_official', 'xiaohongshu', 'kuaishou', 'wechat_video', 'bilibili', 'weibo')
  AND EXISTS (
    SELECT 1 FROM kol_list t2 
    WHERE t2.platform IN ('微信公众号', '小红书', '快手', '微信视频号', 'B站', '微博')
    AND t1.account_id = t2.account_id
  )
)
SELECT COUNT(*) as conflict_count FROM conflict_check;

-- 3. 删除会产生冲突的拼音记录（保留中文记录）
WITH conflict_check AS (
  SELECT 
    t1.id as old_id,
    t1.platform as old_platform,
    t1.account_id,
    CASE t1.platform
      WHEN 'wechat_official' THEN '微信公众号'
      WHEN 'xiaohongshu' THEN '小红书'
      WHEN 'kuaishou' THEN '快手'
      WHEN 'wechat_video' THEN '微信视频号'
      WHEN 'bilibili' THEN 'B站'
      WHEN 'weibo' THEN '微博'
    END AS new_platform
  FROM kol_list t1
  WHERE t1.platform IN ('wechat_official', 'xiaohongshu', 'kuaishou', 'wechat_video', 'bilibili', 'weibo')
  AND EXISTS (
    SELECT 1 FROM kol_list t2 
    WHERE t2.platform IN ('微信公众号', '小红书', '快手', '微信视频号', 'B站', '微博')
    AND t1.account_id = t2.account_id
  )
)
DELETE FROM kol_list WHERE id IN (SELECT old_id FROM conflict_check);

-- 4. 安全地更新剩余的拼音平台记录
UPDATE kol_list SET platform = '微信公众号' WHERE platform = 'wechat_official';
UPDATE kol_list SET platform = '小红书' WHERE platform = 'xiaohongshu';
UPDATE kol_list SET platform = '快手' WHERE platform = 'kuaishou';
UPDATE kol_list SET platform = '微信视频号' WHERE platform = 'wechat_video';
UPDATE kol_list SET platform = 'B站' WHERE platform = 'bilibili';
UPDATE kol_list SET platform = '微博' WHERE platform = 'weibo';

-- 5. 验证修复结果
SELECT platform, COUNT(*) as count 
FROM kol_list 
WHERE platform IN ('微信公众号', '小红书', '快手', '微信视频号', 'B站', '微博')
GROUP BY platform
ORDER BY platform;

-- 6. 检查是否还有未修复的拼音记录
SELECT platform, COUNT(*) as count 
FROM kol_list 
WHERE platform IN ('wechat_official', 'xiaohongshu', 'kuaishou', 'wechat_video', 'bilibili', 'weibo')
GROUP BY platform
ORDER BY platform;