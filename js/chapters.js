// ===== 章节管理模块 =====
const Chapters = {
  currentChapterIndex: -1,

  render() {
    const project = Storage.load();
    const container = document.getElementById('chapters-list');
    const select = document.getElementById('writing-chapter-select');

    if (project.chapters.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <p>还没有章节，点击"新建章节"开始</p>
        </div>`;
      select.innerHTML = '<option value="">选择章节</option>';
      return;
    }

    container.innerHTML = project.chapters.map((ch, i) => `
      <div class="chapter-item ${i === this.currentChapterIndex ? 'active' : ''}" data-index="${i}" onclick="Chapters.select(${i})">
        <div class="chapter-item-left">
          <span class="chapter-num">${i + 1}</span>
          <div>
            <div class="chapter-title">${this.esc(ch.title || '未命名')}</div>
            <div class="chapter-meta">${this.countWords(ch.content || '')} 字</div>
          </div>
        </div>
        <div class="chapter-actions-inline">
          <button class="btn-secondary btn-sm" onclick="event.stopPropagation(); Chapters.edit(${i})">✏️</button>
          <button class="btn-secondary btn-sm btn-danger" onclick="event.stopPropagation(); Chapters.remove(${i})">🗑️</button>
        </div>
      </div>
    `).join('');

    // 更新写作区下拉框
    select.innerHTML = '<option value="">选择章节</option>' +
      project.chapters.map((ch, i) =>
        `<option value="${i}">第${i + 1}章 ${this.esc(ch.title || '未命名')}</option>`
      ).join('');
  },

  add() {
    const title = `第${Storage.load().chapters.length + 1}章`;
    const chapter = { title, content: '', keypoints: '', style: '' };
    const project = Storage.load();
    project.chapters.push(chapter);
    Storage.save(project);
    this.render();
  },

  select(index) {
    this.currentChapterIndex = index;
    const project = Storage.load();
    const ch = project.chapters[index];

    document.getElementById('chapter-editor').value = ch.content || '';
    document.getElementById('chapter-keypoints').value = ch.keypoints || '';
    document.getElementById('chapter-style').value = ch.style || '';
    document.getElementById('writing-chapter-select').value = index;
    Writing.updateWordCount();
    this.render();
  },

  edit(index) {
    const project = Storage.load();
    const ch = { ...project.chapters[index] };
    this.showModal(ch, (saved) => {
      const project = Storage.load();
      project.chapters[index] = saved;
      Storage.save(project);
      this.render();
    });
  },

  remove(index) {
    if (!confirm('确定删除这一章？')) return;
    const project = Storage.load();
    project.chapters.splice(index, 1);
    Storage.save(project);
    if (this.currentChapterIndex >= project.chapters.length) {
      this.currentChapterIndex = -1;
    }
    this.render();
  },

  saveCurrent() {
    const index = parseInt(document.getElementById('writing-chapter-select').value);
    if (isNaN(index)) {
      alert('请先选择章节');
      return;
    }
    const project = Storage.load();
    project.chapters[index].content = document.getElementById('chapter-editor').value;
    project.chapters[index].keypoints = document.getElementById('chapter-keypoints').value;
    project.chapters[index].style = document.getElementById('chapter-style').value;
    Storage.save(project);
    this.render();
  },

  showModal(ch, onSave) {
    document.getElementById('modal').innerHTML = `
      <h3>编辑章节信息</h3>
      <div class="form-group">
        <label>章节标题</label>
        <input type="text" id="modal-title" value="${this.esc(ch.title)}">
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="UI.closeModal()">取消</button>
        <button class="btn-primary" id="modal-save">保存</button>
      </div>`;

    document.getElementById('modal-save').onclick = () => {
      ch.title = document.getElementById('modal-title').value.trim();
      UI.closeModal();
      onSave(ch);
    };
    UI.openModal();
  },

  countWords(text) {
    if (!text) return 0;
    return text.replace(/\s/g, '').length;
  },

  esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // AI 批量生成章节（根据大纲生成章节骨架）
  generateAI() {
    const project = Storage.load();
    const context = this.buildPrompt(project);

    document.getElementById('modal').innerHTML = `
      <h3>🤖 AI 批量生成章节</h3>
      <p style="font-size:0.82em;color:var(--text-secondary);margin-bottom:12px;">
        根据大纲批量生成章节骨架（标题 + 本章要点），后续可用 AI 辅助写正文。
      </p>
      <div class="form-group">
        <label>提示词（点击复制，发给有灵）</label>
        <textarea id="ai-prompt" rows="5" style="font-size:0.82em;">${context}</textarea>
        <button class="btn-secondary btn-sm" style="margin-top:6px;" onclick="navigator.clipboard.writeText(document.getElementById('ai-prompt').value);this.textContent='✅ 已复制';setTimeout(()=>this.textContent='📋 复制提示词',2000)">📋 复制提示词</button>
      </div>
      <div class="form-group">
        <label>有灵生成的结果（粘贴到这里）</label>
        <textarea id="ai-result" rows="6" placeholder="每行一个章节：标题 | 要点"></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="UI.closeModal()">取消</button>
        <button class="btn-primary" onclick="Chapters.parseAndSaveAI()">✨ 解析并添加</button>
      </div>`;

    UI.openModal();
  },

  buildPrompt(project) {
    let prompt = `请帮我为小说生成章节骨架（标题 + 本章要点）。\n\n`;
    prompt += `【项目信息】\n`;
    prompt += `标题：${project.title || '未命名'}\n`;
    if (project.genre) prompt += `类型：${project.genre}\n`;
    if (project.summary) prompt += `简介：${project.summary}\n`;

    if (project.outline.length > 0) {
      prompt += `\n【已有大纲】\n`;
      project.outline.forEach((o, i) => prompt += `${i + 1}. ${o.title}${o.summary ? '\n   ' + o.summary : ''}\n`);
      prompt += `\n请根据以上大纲生成对应的章节骨架。\n`;
    } else {
      prompt += `\n请生成 10 章章节骨架。\n`;
    }

    prompt += `\n输出格式（每行一章）：\n`;
    prompt += `第X章 标题 | 本章关键要点（一句话）\n`;
    return prompt;
  },

  parseAndSaveAI() {
    const result = document.getElementById('ai-result').value;
    const lines = result.split('\n').filter(l => l.trim());
    let added = 0;

    lines.forEach(line => {
      const sep = line.indexOf('|');
      let title, keypoints;
      if (sep > 0) {
        title = line.substring(0, sep).trim();
        keypoints = line.substring(sep + 1).trim();
      } else {
        title = line.trim();
        keypoints = '';
      }
      const project = Storage.load();
      project.chapters.push({ title, content: '', keypoints, style: '' });
      Storage.save(project);
      added++;
    });

    UI.closeModal();
    this.render();
    alert(`✅ 成功添加 ${added} 章`);
  }
};
