// ===== 备份管理模块 =====
const Backups = {
  STORAGE_KEY: 'novel_agent_backups',
  MAX_BACKUPS: 20,

  // 获取所有备份列表
  list() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to list backups:', e);
      return [];
    }
  },

  // 创建备份
  create(label) {
    const project = Storage.load();
    const backups = this.list();
    const backup = {
      id: 'backup_' + Date.now(),
      createdAt: Date.now(),
      label: label || `备份 #${backups.length + 1}`,
      projectTitle: project.title || '未命名项目',
      chapterCount: (project.chapters || []).length,
      characterCount: (project.characters || []).length,
      totalWords: this._countWords(project),
      data: JSON.parse(JSON.stringify(project))
    };

    backups.unshift(backup);

    // 限制备份数量
    if (backups.length > this.MAX_BACKUPS) {
      backups.pop();
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(backups));
    return backup;
  },

  // 恢复指定备份
  restore(backupId) {
    const backups = this.list();
    const backup = backups.find(b => b.id === backupId);
    if (!backup) throw new Error('未找到该备份');

    Storage.save(backup.data);
    this._reloadAll();
    return backup;
  },

  // 删除指定备份
  delete(backupId) {
    let backups = this.list();
    backups = backups.filter(b => b.id !== backupId);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(backups));
  },

  // 自动备份（带防抖）
  autoCreate() {
    const project = Storage.load();
    if (!project.title) return; // 空项目不自动备份

    const backups = this.list();
    const lastAuto = backups.find(b => b.auto === true);

    // 30分钟内不重复自动备份
    if (lastAuto && (Date.now() - lastAuto.createdAt) < 30 * 60 * 1000) return;

    this.create('自动备份');
  },

  // 导出单个备份为文件
  exportToFile(backupId) {
    const backups = this.list();
    const backup = backups.find(b => b.id === backupId);
    if (!backup) throw new Error('未找到该备份');

    const exportData = {
      version: 'novel-agent-backup-v1',
      exportedAt: Date.now(),
      label: backup.label,
      originalCreatedAt: backup.createdAt,
      project: backup.data
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${backup.projectTitle || 'novel'}_${this._formatDate(backup.createdAt)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // 从文件导入备份
  importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importData = JSON.parse(e.target.result);
          if (!importData.project) {
            reject(new Error('不是有效的备份文件'));
            return;
          }

          const backup = {
            id: 'backup_' + Date.now(),
            createdAt: importData.exportedAt || Date.now(),
            label: importData.label || '从文件导入',
            projectTitle: importData.project.title || '未命名项目',
            chapterCount: (importData.project.chapters || []).length,
            characterCount: (importData.project.characters || []).length,
            totalWords: this._countWords(importData.project),
            data: importData.project
          };

          const backups = this.list();
          backups.unshift(backup);
          if (backups.length > this.MAX_BACKUPS) backups.pop();
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(backups));
          resolve(backup);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  },

  // 渲染备份列表 UI
  render() {
    const backups = this.list();
    const container = document.getElementById('backups-list');
    if (!container) return;

    if (backups.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>📭 暂无备份</p>
          <p style="font-size:0.85em;color:var(--text-secondary);">点击"手动备份"创建你的第一个备份</p>
        </div>`;
      return;
    }

    container.innerHTML = backups.map(b => {
      const time = this._formatDateTime(b.createdAt);
      const size = (JSON.stringify(b.data).length / 1024).toFixed(1);
      const autoTag = b.auto ? '<span class="backup-auto-tag">自动</span>' : '';

      return `
        <div class="backup-card">
          <div class="backup-info">
            <div class="backup-title">
              ${b.label} ${autoTag}
            </div>
            <div class="backup-meta">
              <span>${time}</span> · 
              <span>${b.chapterCount} 章</span> · 
              <span>${b.characterCount} 角色</span> · 
              <span>${b.totalWords.toLocaleString()} 字</span> · 
              <span>${size} KB</span>
            </div>
            ${b.projectTitle ? `<div class="backup-project">项目：${b.projectTitle}</div>` : ''}
          </div>
          <div class="backup-actions">
            <button class="btn-sm btn-secondary" onclick="Backups.exportToFile('${b.id}')">📥 导出</button>
            <button class="btn-sm btn-primary" onclick="Backups.confirmRestore('${b.id}')">🔄 恢复</button>
            <button class="btn-sm btn-danger" onclick="Backups.confirmDelete('${b.id}')">🗑️ 删除</button>
          </div>
        </div>`;
    }).join('');
  },

  // 恢复确认
  confirmRestore(backupId) {
    if (confirm('确定要恢复到这个备份吗？当前数据将被覆盖。')) {
      try {
        this.restore(backupId);
        this.render();
        alert('✅ 已恢复到该备份');
      } catch (e) {
        alert('恢复失败：' + e.message);
      }
    }
  },

  // 删除确认
  confirmDelete(backupId) {
    if (confirm('确定要删除这个备份吗？')) {
      this.delete(backupId);
      this.render();
    }
  },

  // 初始化
  init() {
    // 手动备份按钮
    const btnBackup = document.getElementById('btn-backup');
    if (btnBackup) {
      btnBackup.addEventListener('click', () => {
        this.create('手动备份');
        this.render();
        this._toast('✅ 备份已创建');
      });
    }

    // 自动备份按钮
    const btnAuto = document.getElementById('btn-auto-backup');
    if (btnAuto) {
      btnAuto.addEventListener('click', () => {
        this.autoCreate();
        this.render();
        this._toast('✅ 自动备份已检查');
      });
    }

    // 从文件导入按钮
    const btnImport = document.getElementById('btn-import-backup');
    if (btnImport) {
      btnImport.addEventListener('click', () => {
        document.getElementById('file-import-backup').click();
      });
    }

    const fileInput = document.getElementById('file-import-backup');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        this.importFromFile(file)
          .then(() => {
            this.render();
            alert('✅ 备份文件导入成功');
          })
          .catch(err => {
            alert('导入失败：' + err.message);
          });

        e.target.value = '';
      });
    }

    // 每5分钟自动备份
    setInterval(() => this.autoCreate(), 5 * 60 * 1000);

    this.render();
  },

  // 工具方法
  _countWords(project) {
    if (!project.chapters) return 0;
    return project.chapters.reduce((sum, ch) => sum + (ch.content || '').replace(/\s/g, '').length, 0);
  },

  _formatDate(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },

  _formatDateTime(ts) {
    const d = new Date(ts);
    return `${this._formatDate(d)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  },

  _reloadAll() {
    // 触发自定义事件通知其他模块刷新
    window.dispatchEvent(new CustomEvent('project-restored'));
    const project = Storage.load();
    document.getElementById('project-title').value = project.title || '';
    document.getElementById('project-genre').value = project.genre || '';
    document.getElementById('project-summary').value = project.summary || '';
    document.getElementById('project-world').value = project.world || '';
    if (window.Characters) Characters.render();
    if (window.Outline) Outline.render();
    if (window.Chapters) Chapters.render();
  },

  _toast(text) {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = text;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-show');
    }, 10);
    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
};
