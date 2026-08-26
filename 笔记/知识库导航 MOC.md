---
created: 2026-08-26
type: moc
tags:
  - 导航
  - MOC
---

# 知识库导航

> [!tip] 这是知识库的导航中心，从这里可以快速到达各个区域。

## 核心区域

- [[日记/]] - 每日笔记
- [[项目/]] - 项目管理
- [[笔记/]] - 日常笔记
- [[资源/]] - 参考资料
- [[Templates/]] - 笔记模板

## 快捷入口

- [[每日笔记模板]] - 创建每日笔记
- [[项目模板]] - 创建项目
- [[会议笔记模板]] - 记录会议
- [[读书笔记模板]] - 读书笔记

## 常用 Dataview 查询

### 最近编辑的笔记

```dataview
TABLE created, modified AS "修改时间"
FROM ""
WHERE type != null
SORT modified DESC
LIMIT 10
```

### 进行中的项目

```dataview
TABLE status AS "状态"
FROM "项目"
WHERE type = "project" AND status = "进行中"
SORT created DESC
```

### 未完成任务

```dataview
TASK
FROM ""
WHERE !completed
GROUP BY file.link
LIMIT 20
```
