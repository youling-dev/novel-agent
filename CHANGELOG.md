# Changelog

## v0.1.1 — 2026-05-23

### 🔧 Bug Fixes

- **agents.js**: `pipeline` 对象后缺失逗号导致整个 Agent 管理功能不可用，已修复。

### 🛡️ Security

- **server.js**: 修复 `/api/load/` 和 `/api/delete/` 路径遍历漏洞（`../../../etc/passwd`），添加文件名白名单过滤 + `startsWith(DATA_DIR)` 路径校验。

### ✨ Features

- **写作区实时保存**: 编辑器、要点、风格输入框添加防抖自动保存（停止输入 2 秒后触发），页面刷新不再丢失内容。
- **保存失败提示**: 服务器保存失败后 Toast 提示用户，并自动 fallback 到 localStorage。

### 🎨 UI/UX

- **Toast 提示系统**: 全局 Toast 组件替代原生 `alert()`，从右侧滑入滑出，3 秒自动消失。
- **保存反馈**: 自动保存时控制台输出 `💾 自动保存完成`，手动保存无打扰。

---

## v0.1.0 — 2026-05-23 (Initial)

- 纯前端小说写作工具，支持项目管理、角色卡、大纲规划、章节写作、AI 辅助提示词生成、导出（TXT/MD/JSON）。
