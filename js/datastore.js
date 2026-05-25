// ===== 统一数据存储（JSON 文件） =====
// HTML 版和 CLI 版共用 data/projects/ 目录

const DataStore = {
  DATA_DIR: '../data/projects',

  // 默认项目结构
  defaultProject() {
    return {
      title: '',
      genre: '',
      summary: '',
      world: '',
      characters: [],
      outline: [],
      chapters: [],
      customAgents: [], // 自定义子 Agent
      snippets: [],      // 片段库
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  },

  // 获取项目路径
  projectPath(name) {
    return `${this.DATA_DIR}/${name}.json`;
  },

  // 加载项目
  async load(name = 'default') {
    try {
      const resp = await fetch(this.projectPath(name));
      if (!resp.ok) {
        return this.defaultProject();
      }
      const project = await resp.json();
      // 确保有所有必要字段
      const defaults = this.defaultProject();
      for (const key of Object.keys(defaults)) {
        if (!(key in project)) {
          project[key] = defaults[key];
        }
      }
      return project;
    } catch (e) {
      console.error('Load failed:', e);
      return this.defaultProject();
    }
  },

  // 保存项目
  async save(project) {
    project.updatedAt = Date.now();
    try {
      const resp = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      });

      if (!resp.ok) {
        throw new Error(`保存失败: ${resp.status}`);
      }
    } catch (e) {
      console.warn('⚠️ 服务器保存失败，已保存到本地:', e.message);
      // 提示用户（不阻塞）
      this.showSaveWarning();
      // 确保本地存储
      localStorage.setItem('novel_project', JSON.stringify(project));
    }
  },

  // 保存失败提示
  showSaveWarning() {
    if (typeof window === 'undefined') return;
    const toast = document.createElement('div');
    toast.textContent = '⚠️ 服务器连接失败，内容已保存到本地';
    toast.style.cssText = `
      position: fixed; bottom: 20px; right: 20px;
      background: #ff9800; color: white; padding: 12px 20px;
      border-radius: 8px; z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // 导出 JSON
  exportJSON(project) {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (project.title || 'novel-project') + '.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  // 导入 JSON（兼容旧版本导出）
  importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const raw = JSON.parse(e.target.result);
          // 兼容旧版本：只要是一个对象就可以导入，缺失字段用默认值补齐
          if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
            reject(new Error('无效的项目文件格式：期望 JSON 对象'));
            return;
          }
          const defaults = this.defaultProject();
          const project = { ...defaults };
          for (const key of Object.keys(defaults)) {
            project[key] = key in raw ? raw[key] : defaults[key];
          }
          // 确保关键数组类型
          if (!Array.isArray(project.characters)) project.characters = [];
          if (!Array.isArray(project.outline)) project.outline = [];
          if (!Array.isArray(project.chapters)) project.chapters = [];
          if (!Array.isArray(project.customAgents)) project.customAgents = [];
          // 保留旧版本可能有的额外字段
          for (const key of Object.keys(raw)) {
            if (!(key in project)) project[key] = raw[key];
          }
          this.save(project).then(() => resolve(project));
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  }
};

// ===== 兼容层：Storage API 映射到 DataStore =====
// 旧模块（characters.js, outline.js 等）使用 Storage 接口
// 这里保证向后兼容，底层统一走 JSON 文件

const Storage = {
  STORAGE_KEY: 'novel_project',

  defaultProject: DataStore.defaultProject,

  // 同步包装：把 async load 转为同步（首次用 localStorage 兜底）
  load() {
    // 先用 localStorage 缓存，避免闪烁
    const cached = localStorage.getItem(this.STORAGE_KEY);
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    // 否则返回默认结构，异步刷新由 app.js 负责
    return this.defaultProject();
  },

  save(project) {
    // 同时写 localStorage 缓存 + 异步写 JSON 文件
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(project));
    DataStore.save(project); // 异步写文件
  },

  exportJSON: DataStore.exportJSON,
  importJSON: DataStore.importJSON
};
