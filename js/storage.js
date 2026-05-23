// ===== 数据存储模块 =====
const Storage = {
  STORAGE_KEY: 'novel_agent_project',

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
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  },

  save(project) {
    project.updatedAt = Date.now();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(project, null, 2));
  },

  load() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Failed to load project:', e);
        return this.defaultProject();
      }
    }
    return this.defaultProject();
  },

  exportJSON() {
    const project = this.load();
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (project.title || 'novel-project') + '.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const project = JSON.parse(e.target.result);
          // 验证基本结构
          if (!Array.isArray(project.characters) || !Array.isArray(project.chapters)) {
            reject(new Error('无效的项目文件格式'));
            return;
          }
          this.save(project);
          resolve(project);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  }
};
