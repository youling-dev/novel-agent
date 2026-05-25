// ===== 片段库模块 =====
const Snippets = {
  // 分类配置
  categories: {
    description: { label: '🖊️ 描写', color: '#6366f1' },
    dialogue:    { label: '💬 对话', color: '#ec4899' },
    scene:       { label: '🏙️ 场景', color: '#14b8a6' },
    other:       { label: '📌 其他', color: '#f59e0b' }
  },

  // 渲染片段库页面
  render() {
    const project = Storage.load();
    const container = document.getElementById('snippets-list');
    if (!container) return;

    if (!Array.isArray(project.snippets)) project.snippets = [];

    const totalWords = project.snippets.reduce((sum, s) => sum + (s.content || '').length, 0);
    const categoryCounts = this._categoryCounts(project.snippets);

    container.innerHTML = `
      <div class="snippets-header">
        <div class="snippets-stats">
          <span class="stat-chip">${project.snippets.length} 个片段</span>
          <span class="stat-chip">${totalWords} 字</span>
          ${Object.entries(categoryCounts).map(([key, count]) => {
            const cat = this.categories[key];
            return cat ? `<span class="stat-chip" style="color:${cat.color}">${cat.label} ${count}</span>` : '';
          }).join('')}
        </div>
        <div class="snippets-actions">
          <input type="text" id="snippet-search" class="search-input snippet-search" placeholder="搜索片段…">
          <button id="btn-add-snippet" class="btn-primary">+ 新建片段</button>
        </div>
      </div>
      <div id="snippets-grid" class="snippets-grid">
        ${project.snippets.length === 0 ? this._emptyState() : this._renderList(project.snippets)}
      </div>
    `;

    // 绑定事件
    document.getElementById('btn-add-snippet').addEventListener('click', () => this.addSnippet());
    const searchInput = document.getElementById('snippet-search');
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      const filtered = query ? project.snippets.filter(s =>
        (s.title || '').toLowerCase().includes(query) ||
        (s.content || '').toLowerCase().includes(query) ||
        (s.tags || []).some(t => t.toLowerCase().includes(query))
      ) : project.snippets;
      document.getElementById('snippets-grid').innerHTML =
        filtered.length === 0 ? this._emptyState('未找到匹配的片段') : this._renderList(filtered);
    });
  },

  // 渲染片段列表
  _renderList(snippets) {
    if (!snippets.length) return this._emptyState();
    return snippets.map((s, i) => {
      const cat = this.categories[s.category] || this.categories.other;
      const wordCount = (s.content || '').length;
      const tags = (s.tags || []).map(t => `<span class="snippet-tag">${t}</span>`).join('');
      return `
        <div class="snippet-card" data-id="${s.id}">
          <div class="snippet-card-header">
            <span class="snippet-category" style="background:${cat.color}20;color:${cat.color};border:1px solid ${cat.color}40;">
              ${cat.label}
            </span>
            <div class="snippet-card-actions">
              <button class="btn-icon" title="插入到写作区" onclick="Snippets.insertSnippet('${s.id}')">📋</button>
              <button class="btn-icon" title="复制内容" onclick="Snippets.copySnippet('${s.id}')">📄</button>
              <button class="btn-icon" title="编辑" onclick="Snippets.editSnippet('${s.id}')">✏️</button>
              <button class="btn-icon" title="删除" onclick="Snippets.deleteSnippet('${s.id}')">🗑️</button>
            </div>
          </div>
          <h4 class="snippet-title">${this._esc(s.title || '无标题')}</h4>
          <p class="snippet-preview">${this._esc((s.content || '').substring(0, 120))}${(s.content || '').length > 120 ? '…' : ''}</p>
          <div class="snippet-footer">
            <div class="snippet-tags">${tags}</div>
            <span class="snippet-word-count">${wordCount} 字</span>
          </div>
        </div>
      `;
    }).join('');
  },

  // 空状态
  _emptyState(msg) {
    const text = msg || '还没有片段，点击"新建片段"开始积累你的写作素材库';
    return `<div class="empty-state"><p>${text}</p></div>`;
  },

  // 分类统计
  _categoryCounts(snippets) {
    const counts = {};
    snippets.forEach(s => {
      const cat = s.category || 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  },

  // HTML 转义
  _esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // 新建片段
  addSnippet() {
    this._showSnippetModal();
  },

  // 编辑片段
  editSnippet(id) {
    const project = Storage.load();
    const snippet = project.snippets.find(s => s.id === id);
    if (!snippet) return;
    this._showSnippetModal(snippet);
  },

  // 显示片段编辑弹窗
  _showSnippetModal(snippet) {
    const isEdit = !!snippet;
    const categoryOptions = Object.entries(this.categories).map(([key, val]) =>
      `<option value="${key}" ${snippet && snippet.category === key ? 'selected' : ''}>${val.label}</option>`
    ).join('');

    document.getElementById('modal').innerHTML = `
      <h3>${isEdit ? '✏️ 编辑片段' : '✨ 新建片段'}</h3>
      <div class="form-group">
        <label>片段标题</label>
        <input type="text" id="snippet-title" placeholder="如：雨夜描写、主角登场对话…" value="${this._esc(snippet?.title || '')}">
      </div>
      <div class="form-group">
        <label>内容</label>
        <textarea id="snippet-content" rows="8" placeholder="在这里写下可复用的描写、对话、场景片段…">${this._esc(snippet?.content || '')}</textarea>
      </div>
      <div class="form-group">
        <label>分类</label>
        <select id="snippet-category">${categoryOptions}</select>
      </div>
      <div class="form-group">
        <label>标签（逗号分隔）</label>
        <input type="text" id="snippet-tags" placeholder="如：环境、紧张、主角" value="${this._esc((snippet?.tags || []).join('、'))}">
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="UI.closeModal()">取消</button>
        <button class="btn-primary" onclick="Snippets._saveSnippet('${snippet?.id || ''}')">${isEdit ? '保存修改' : '创建片段'}</button>
      </div>
    `;
    UI.openModal();
    document.getElementById('snippet-title').focus();
  },

  // 保存片段
  _saveSnippet(id) {
    const title = document.getElementById('snippet-title').value.trim();
    const content = document.getElementById('snippet-content').value.trim();
    const category = document.getElementById('snippet-category').value;
    const tagsRaw = document.getElementById('snippet-tags').value.trim();
    const tags = tagsRaw ? tagsRaw.split(/[、,，]/).map(t => t.trim()).filter(Boolean) : [];

    if (!title) { alert('请输入片段标题'); return; }
    if (!content) { alert('请输入片段内容'); return; }

    const project = Storage.load();
    if (!Array.isArray(project.snippets)) project.snippets = [];

    if (id) {
      // 编辑
      const idx = project.snippets.findIndex(s => s.id === id);
      if (idx !== -1) {
        project.snippets[idx] = { ...project.snippets[idx], title, content, category, tags, updatedAt: Date.now() };
      }
    } else {
      // 新建
      project.snippets.push({
        id: 'sn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
        title,
        content,
        category,
        tags,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    Storage.save(project);
    UI.closeModal();
    this.render();
    showToast(isEdit ? '✅ 片段已更新' : '✅ 片段已创建');
  },

  // 删除片段
  deleteSnippet(id) {
    if (!confirm('确定删除这个片段？')) return;
    const project = Storage.load();
    project.snippets = project.snippets.filter(s => s.id !== id);
    Storage.save(project);
    this.render();
    showToast('🗑️ 片段已删除');
  },

  // 插入片段到写作区
  insertSnippet(id) {
    const project = Storage.load();
    const snippet = project.snippets.find(s => s.id === id);
    if (!snippet) return;

    const editor = document.getElementById('chapter-editor');
    if (!editor) {
      showToast('⚠️ 请先切换到写作 Tab');
      return;
    }

    const pos = editor.selectionStart;
    const text = editor.value;
    const insertText = '\n\n' + snippet.content + '\n';
    editor.value = text.substring(0, pos) + insertText + text.substring(pos);
    editor.focus();
    editor.selectionStart = editor.selectionEnd = pos + insertText.length;

    // 更新字数统计
    if (typeof updateWordCount === 'function') updateWordCount();
    showToast(`📋 已插入「${snippet.title}」`);
  },

  // 复制片段内容
  copySnippet(id) {
    const project = Storage.load();
    const snippet = project.snippets.find(s => s.id === id);
    if (!snippet) return;

    navigator.clipboard.writeText(snippet.content).then(() => {
      showToast('📄 已复制到剪贴板');
    }).catch(() => {
      // 降级方案
      const ta = document.createElement('textarea');
      ta.value = snippet.content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('📄 已复制到剪贴板');
    });
  }
};
