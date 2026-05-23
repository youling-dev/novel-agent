// ===== 章节大纲模块 =====
const Outline = {
  render() {
    const project = Storage.load();
    const container = document.getElementById('outline-list');

    if (project.outline.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <p>还没有大纲，点击"添加章节"规划你的故事</p>
        </div>`;
      return;
    }

    container.innerHTML = project.outline.map((item, i) => `
      <div class="outline-item" data-index="${i}">
        <span class="outline-num">${i + 1}</span>
        <div class="outline-content">
          <h4>${this.esc(item.title || '未命名章节')}</h4>
          ${item.summary ? `<p>${this.esc(item.summary)}</p>` : ''}
        </div>
        <div class="outline-actions">
          <button class="btn-secondary btn-sm" onclick="Outline.edit(${i})">✏️</button>
          <button class="btn-secondary btn-sm btn-danger" onclick="Outline.remove(${i})">🗑️</button>
        </div>
      </div>
    `).join('');
  },

  add() {
    const item = { title: '', summary: '' };
    this.showModal(item, (saved) => {
      const project = Storage.load();
      project.outline.push(saved);
      Storage.save(project);
      this.render();
    });
  },

  edit(index) {
    const project = Storage.load();
    const item = { ...project.outline[index] };
    this.showModal(item, (saved) => {
      const project = Storage.load();
      project.outline[index] = saved;
      Storage.save(project);
      this.render();
    });
  },

  remove(index) {
    if (!confirm('确定删除这章大纲？')) return;
    const project = Storage.load();
    project.outline.splice(index, 1);
    Storage.save(project);
    this.render();
  },

  showModal(item, onSave) {
    document.getElementById('modal').innerHTML = `
      <h3>${item.title ? '编辑大纲' : '添加章节大纲'}</h3>
      <div class="form-group">
        <label>章节标题</label>
        <input type="text" id="modal-title" value="${this.esc(item.title)}" placeholder="第X章 XXXX">
      </div>
      <div class="form-group">
        <label>本章概要</label>
        <textarea id="modal-summary" rows="4" placeholder="本章主要情节、关键事件…">${this.esc(item.summary || '')}</textarea>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="UI.closeModal()">取消</button>
        <button class="btn-primary" id="modal-save">保存</button>
      </div>`;

    document.getElementById('modal-save').onclick = () => {
      const saved = {
        title: document.getElementById('modal-title').value.trim(),
        summary: document.getElementById('modal-summary').value.trim()
      };
      UI.closeModal();
      onSave(saved);
    };

    UI.openModal();
  },

  esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // AI 生成大纲建议
  generateAI() {
    const project = Storage.load();
    const context = this.buildPrompt(project);

    document.getElementById('modal').innerHTML = `
      <h3>🤖 AI 生成大纲建议</h3>
      <p style="font-size:0.82em;color:var(--text-secondary);margin-bottom:12px;">
        根据项目设定和角色生成章节大纲建议。
      </p>
      <div class="form-group">
        <label>生成章节数</label>
        <input type="number" id="outline-count" value="10" min="1" max="50" style="width:80px;padding:6px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);">
      </div>
      <div class="form-group">
        <label>提示词（点击复制，发给有灵）</label>
        <textarea id="ai-prompt" rows="5" style="font-size:0.82em;">${context}</textarea>
        <button class="btn-secondary btn-sm" style="margin-top:6px;" onclick="navigator.clipboard.writeText(document.getElementById('ai-prompt').value);this.textContent='✅ 已复制';setTimeout(()=>this.textContent='📋 复制提示词',2000)">📋 复制提示词</button>
      </div>
      <div class="form-group">
        <label>有灵生成的结果（粘贴到这里）</label>
        <textarea id="ai-result" rows="6" placeholder="每行一个章节：标题 | 概要"></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="UI.closeModal()">取消</button>
        <button class="btn-primary" onclick="Outline.parseAndSaveAI()">✨ 解析并添加</button>
      </div>`;

    UI.openModal();
  },

  buildPrompt(project) {
    let prompt = `请帮我为小说生成详细的章节大纲。\n\n`;
    prompt += `【项目信息】\n`;
    prompt += `标题：${project.title || '未命名'}\n`;
    if (project.genre) prompt += `类型：${project.genre}\n`;
    if (project.summary) prompt += `简介：${project.summary}\n`;
    if (project.world) prompt += `世界观：${project.world}\n`;

    if (project.characters.length > 0) {
      prompt += `\n【角色】\n`;
      project.characters.forEach(c => prompt += `- ${c.name}${c.role ? '（' + c.role + '）' : ''}\n`);
    }

    if (project.outline.length > 0) {
      prompt += `\n【已有大纲】\n`;
      project.outline.forEach((o, i) => prompt += `${i + 1}. ${o.title}${o.summary ? ': ' + o.summary : ''}\n`);
      prompt += `请从下一章继续生成。\n`;
    }

    prompt += `\n请生成 10 章大纲，每行一章，格式：\n`;
    prompt += `第X章 标题 | 本章概要\n\n`;
    prompt += `要求：\n`;
    prompt += `1. 每章有明确的核心冲突\n`;
    prompt += `2. 节奏张弛有度\n`;
    prompt += `3. 章末留悬念\n`;
    prompt += `4. 整体构成完整故事弧\n`;
    return prompt;
  },

  parseAndSaveAI() {
    const result = document.getElementById('ai-result').value;
    const lines = result.split('\n').filter(l => l.trim());
    let added = 0;

    lines.forEach(line => {
      const sep = line.indexOf('|');
      if (sep > 0) {
        const title = line.substring(0, sep).trim();
        const summary = line.substring(sep + 1).trim();
        const project = Storage.load();
        project.outline.push({ title, summary });
        Storage.save(project);
        added++;
      } else if (line.trim()) {
        const project = Storage.load();
        project.outline.push({ title: line.trim(), summary: '' });
        Storage.save(project);
        added++;
      }
    });

    UI.closeModal();
    this.render();
    alert(`✅ 成功添加 ${added} 章大纲`);
  }
};
