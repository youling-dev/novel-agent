# 有灵 · 小说写作 Agent

✨ 一款本地运行的小说写作辅助工具，支持角色管理、大纲规划、章节写作、AI 辅助生成、全文搜索、备份管理、写作统计、EPUB 导出和时间线追踪。

## 功能

- 📖 **项目管理** — 标题、类型、世界观设定
- 🎭 **角色管理** — 角色卡（外貌、性格、背景、目标、关系）
- 📋 **大纲管理** — 章节大纲规划
- 📝 **章节写作** — 逐章编辑、字数统计、字数目标（进度条 + 三色状态）
- ✍️ **写作区** — 实时字数显示、Ctrl+S/Cmd+S 快捷键保存
- 🤖 **AI 辅助** — 一键生成 AI 写作提示词，支持动态字数目标
- 🔍 **全文搜索** — 搜索章节、角色、大纲、世界观，实时防抖、相关度排序
- 📊 **写作统计** — 总字数、章节完成率、每日目标、7日趋势图、连续写作天数
- 💾 **备份管理** — 手动/自动备份、恢复、导出/导入、最多保留 20 个
- 🧩 **片段库** — 可复用的描写/对话/场景片段，分类管理、一键插入写作区
- 📤 **导出** — 支持 TXT / Markdown / JSON / HTML 整书导出 / EPUB 电子书
- 📚 **EPUB 3 导出** — 标准 EPUB 电子书，兼容 Apple Books / 微信读书 / Kindle / Kobo
- ⏱️ **时间线** — 事件追踪、类型筛选、时间阶段、关联角色与章节
- 🎯 **专注模式** — 隐藏侧边栏和工具栏，沉浸式全屏写作
- 🌓 **深浅主题** — 自动跟随系统偏好，一键切换

## 使用

1. 双击 `index.html` 在浏览器中打开
2. 在左侧填写项目信息和世界观
3. 添加角色 → 规划大纲 → 新建章节 → 开始写作
4. 点击 AI 辅助生成提示词，发给有灵帮你写
5. 在统计面板设定每日写作目标，追踪进度

## 目录结构

```
novel-agent/
├── index.html          # 主页面
├── server.js           # 轻量 API 服务器（文件系统 API）
├── cli/
│   └── novel.js        # 命令行工具
├── css/
│   └── style.css       # 样式
├── js/
│   ├── app.js          # 主应用（路由、初始化）
│   ├── datastore.js    # 数据存储（JSON 文件 + localStorage 缓存）
│   ├── storage.js      # 本地存储（兼容层）
│   ├── characters.js   # 角色管理
│   ├── chapters.js     # 章节管理
│   ├── outline.js      # 大纲管理
│   ├── writing.js      # 写作区
│   ├── agents.js       # AI 辅助 + 子 Agent
│   ├── search.js       # 全文搜索
│   ├── findreplace.js  # 查找替换
│   ├── statistics.js   # 写作统计
│   ├── backups.js      # 备份管理
│   ├── snippets.js     # 片段库
│   ├── export.js       # 导出功能（TXT/MD/JSON/HTML）
│   ├── epub.js         # EPUB 3 电子书导出
│   ├── timeline.js     # 时间线（剧情事件追踪）
│   ├── versions.js     # 章节版本历史
│   ├── reading.js      # 阅读模式
│   ├── shortcuts.js    # 键盘快捷键
│   └── cloudsync.js    # 云同步
└── README.md
```


## 💖 支持项目

如果你觉得这个工具对你有帮助，欢迎打赏支持开源：

<p align="center">
  <img src="assets/alipay_qrcode.jpg" alt="支付宝收款码" width="220" />
  <br />
  <sub>扫码支持有灵 ✨</sub>
</p>

## 数据

所有数据存储在浏览器 `localStorage`，不会上传到任何服务器。

---

由有灵 ✨ 打造
