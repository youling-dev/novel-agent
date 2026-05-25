// ===== 章节版本历史模块 =====
// 自动记录章节修改历史，支持回溯恢复

const Versions = {
  maxPerChapter: 10,

  // 创建版本快照（chapterIndex 为章节在数组中的索引）
  snapshot(chapterIndex) {
    const project = Storage.load();
    const chapter = (project.chapters || [])[chapterIndex];
    if (!chapter) return;

    if (!project.versions) project.versions = {};
    const key = String(chapterIndex);
    if (!project.versions[key]) project.versions[key] = [];

    const versions = project.versions[key];
    const lastVersion = versions.length > 0 ? versions[versions.length - 1] : null;

    // 跳过内容相同的快照
    if (lastVersion && lastVersion.content === chapter.content) return;

    versions.push({
      content: chapter.content,
      outline: chapter.keypoints || '',
      style: chapter.style || '',
      timestamp: Date.now(),
      wordCount: (chapter.content || '').replace(/\s/g, '').length,
      label: this._generateLabel(versions.length)
    });

    // 保留最近 maxPerChapter 个版本
    if (versions.length > this.maxPerChapter) {
      project.versions[key] = versions.slice(-this.maxPerChapter);
    }

    DataStore.save();
    return versions;
  },

  // 获取章节所有版本
  get(chapterIndex) {
    const project = Storage.load();
    return (project.versions && project.versions[String(chapterIndex)]) || [];
  },

  // 恢复指定版本
  restore(chapterIndex, versionIndex) {
    const versions = this.get(chapterIndex);
    if (!versions[versionIndex]) return null;
    return {
      content: versions[versionIndex].content,
      outline: versions[versionIndex].outline || '',
      style: versions[versionIndex].style || ''
    };
  },

  // 删除指定版本
  delete(chapterIndex, versionIndex) {
    const project = Storage.load();
    const key = String(chapterIndex);
    if (!project.versions || !project.versions[key]) return;
    project.versions[key].splice(versionIndex, 1);
    DataStore.save();
  },

  // 生成版本标签
  _generateLabel(index) {
    return `v${index + 1}`;
  },

  // 格式化时间戳
  formatTime(ts) {
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  // 打开版本历史弹窗
  showModal(chapterId, chapterTitle) {
    const versions = this.get(chapterId);

    // 创建或获取弹窗容器
    let modal = document.getElementById('versions-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'versions-modal';
      modal.className = 'versions-modal-overlay';
      modal.innerHTML = `
        <div class="versions-modal">
          <div class="versions-modal-header">
            <div class="versions-modal-title">
              <span class="versions-modal-icon">🕓</span>
              <span class="versions-modal-label">版本历史</span>
              <span class="versions-chapter-name"></span>
            </div>
            <button class="versions-modal-close" onclick="Versions.closeModal()">✕</button>
          </div>
          <div class="versions-modal-body">
            <div class="versions-timeline" id="versions-timeline"></div>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }

    // 显示弹窗
    modal.style.display = 'flex';

    // 更新标题
    const nameEl = modal.querySelector('.versions-chapter-name');
    if (nameEl) nameEl.textContent = chapterTitle || `章节 #${chapterId}`;

    // 关闭事件
    modal.querySelector('.versions-modal-close').onclick = () => this.closeModal();
    modal.onclick = (e) => {
      if (e.target === modal) this.closeModal();
    };

    // 渲染版本列表
    const timeline = document.getElementById('versions-timeline');
    if (versions.length === 0) {
      timeline.innerHTML = `
        <div class="versions-empty">
          <p>暂无版本记录</p>
          <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">保存章节后将自动记录版本</p>
        </div>`;
      return;
    }

    timeline.innerHTML = versions
      .map((v, i) => `
        <div class="version-item" data-index="${i}">
          <div class="version-dot"></div>
          <div class="version-card">
            <div class="version-header">
              <span class="version-label">${v.label}</span>
              <span class="version-time">${this.formatTime(v.timestamp)}</span>
              <span class="version-words">${v.wordCount} 字</span>
            </div>
            <div class="version-preview">${(v.content || '').substring(0, 80).replace(/\n/g, ' ') || '(空)'}</div>
            <div class="version-actions">
              <button class="version-restore-btn" onclick="Versions._doRestore('${chapterId}', ${i})">恢复此版本</button>
              <button class="version-delete-btn" onclick="Versions._doDelete('${chapterId}', ${i})">删除</button>
            </div>
          </div>
        </div>
      `)
      .reverse() // 最新的在上面
      .join('');
  },

  // 关闭弹窗
  closeModal() {
    const modal = document.getElementById('versions-modal');
    if (modal) modal.style.display = 'none';
  },

  // 执行恢复
  _doRestore(chapterId, index) {
    if (!confirm('恢复此版本将替换当前内容，是否继续？')) return;

    const restored = this.restore(chapterId, index);
    if (!restored) return;

    const project = Storage.load();
    const chapter = (project.chapters || []).find(c => c.id === chapterId);
    if (chapter) {
      chapter.content = restored.content;
      chapter.outline = restored.outline;
      chapter.style = restored.style;
      DataStore.save();
    }

    this.closeModal();
    showToast('版本已恢复');

    // 刷新写作区
    if (window.Chapters && typeof window.Chapters.render === 'function') {
      window.Chapters.render();
    }
    if (window.Writing && typeof window.Writing.loadChapter === 'function') {
      window.Writing.loadChapter(chapterId);
    }
  },

  // 执行删除
  _doDelete(chapterId, index) {
    if (!confirm('确定删除此版本？')) return;
    this.delete(chapterId, index);

    // 刷新弹窗
    this.showModal(chapterId, document.querySelector('.versions-chapter-name')?.textContent || '');
  }
};
