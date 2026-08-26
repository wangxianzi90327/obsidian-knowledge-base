# 我的知识库

这是一个基于 Obsidian 的个人知识库，支持 Git 版本管理和 GitHub 同步。

## 目录结构

```
obsidian/
├── Templates/       # 笔记模板
├── 日记/            # 每日笔记
├── 项目/            # 项目管理
├── 笔记/            # 日常笔记
├── 资源/            # 参考资料、收藏
├── 附件/            # 图片等附件
└── .obsidian/       # Obsidian 配置（含插件）
```

## 已安装插件

| 插件 | 功能 |
|------|------|
| Obsidian Git | Git 版本控制，自动备份和 GitHub 同步 |
| Dataview | 数据查询，用代码块动态展示笔记内容 |
| Templater | 高级模板引擎，支持变量和脚本 |
| Calendar | 侧边栏日历，快速导航日记 |
| Tasks | 任务管理，支持截止日期和重复任务 |
| Kanban | 看板视图，项目管理利器 |
| Excalidraw | 手绘白板，可视化思维 |
| Mind Map | 思维导图，将笔记转为脑图 |
| Periodic Notes | 周期性笔记（日/周/月/季/年） |

## 使用指南

### 创建日记
按 `Ctrl+P` 打开命令面板，搜索 "Periodic Notes: Open Daily Note"

### 从模板创建笔记
按 `Ctrl+P`，搜索 "Templater: Create new note from template"

### Git 同步
- 自动提交：每隔 5 分钟自动提交变更
- 手动提交：`Ctrl+P` 搜索 "Obsidian Git: Create backup"
- 推送/拉取：`Ctrl+P` 搜索 "Obsidian Git: Push" / "Pull"
