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
      this.renderTotalStats(project);
      return;
    }

    const totalWords = project.chapters.reduce((sum, ch) => sum + this.countWords(ch.content || ''), 0);
    const totalGoal = project.chapters.reduce((sum, ch) => sum + (ch.wordGoal || 0), 0);

    container.innerHTML = `
      <div class="chapters-summary">
        <span>📊 总计：${totalWords.toLocaleString()} 字</span>
        ${totalGoal > 0 ? `<span>🎯 目标：${totalGoal.toLocaleString()} 字（${Math.round(totalWords / totalGoal * 100)}%）</span>` : ''}
      </div>
    ` + project.chapters.map((ch, i) => {
      const words = this.countWords(ch.content || '');
      const goal = ch.wordGoal || 0;
      let progressHtml = '';
      if (goal > 0) {
        const pct = Math.min(Math.round(words / goal * 100), 100);
        const barColor = pct >= 100 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b';
        progressHtml = `
          <div class="chapter-progress">
            <div class="chapter-progress-bar" style="width:${pct}%;background:${barColor};"></div>
          </div>
          <span class="chapter-goal">${words.toLocaleString()}/${goal.toLocaleString()} 字</span>`;
      } else {
        progressHtml = `<span class="chapter-meta">${words.toLocaleString()} 字</span>`;
      }
      return `
      <div class="chapter-item ${i === this.currentChapterIndex ? 'active' : ''}" data-index="${i}" draggable="true"
        ondragstart="Chapters.onDragStart(event)" ondragover="Chapters.onDragOver(event)" ondrop="Chapters.onDrop(event, ${i})" ondragend="Chapters.onDragEnd(event)" onclick="Chapters.select(${i})">
        <div class="chapter-item-left">
          <span class="chapter-drag-handle" title="拖拽排序">⠿</span>
          <span class="chapter-num">${i + 1}</span>
          <div>
            <div class="chapter-title">${this.esc(ch.title || '未命名')}</div>
            <div class="chapter-meta-row">${progressHtml}</div>
          </div>
        </div>
        <div class="chapter-actions-inline">
          <button class="btn-secondary btn-sm" onclick="event.stopPropagation(); Chapters.edit(${i})">✏️</button>
          <button class="btn-secondary btn-sm btn-danger" onclick="event.stopPropagation(); Chapters.remove(${i})">🗑️</button>
        </div>
      </div>`;
    }).join('');

    // 更新写作区下拉框
    select.innerHTML = '<option value="">选择章节</option>' +
      project.chapters.map((ch, i) =>
        `<option value="${i}">第${i + 1}章 ${this.esc(ch.title || '未命名')}</option>`
      ).join('');
  },

  add() {
    const title = `第${Storage.load().chapters.length + 1}章`;
    const chapter = { title, content: '', keypoints: '', style: '', wordGoal: 2500 };
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
      // 如果当前正在编辑这一章，同步更新写作区
      if (this.currentChapterIndex === index) {
        Writing.updateWordCount();
      }
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
      <div class="form-group">
        <label>字数目标（留空不设定）</label>
        <input type="number" id="modal-wordgoal" value="${ch.wordGoal || ''}" placeholder="如：2500" min="0">
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="UI.closeModal()">取消</button>
        <button class="btn-primary" id="modal-save">保存</button>
      </div>`;

    document.getElementById('modal-save').onclick = () => {
      ch.title = document.getElementById('modal-title').value.trim();
      const goalVal = document.getElementById('modal-wordgoal').value;
      ch.wordGoal = goalVal ? parseInt(goalVal) : 0;
      UI.closeModal();
      onSave(ch);
    };
    UI.openModal();
  },

  countWords(text) {
    if (!text) return 0;
    return text.replace(/\s/g, '').length;
  },

  // 渲染总字数统计（放在章节列表顶部）
  renderTotalStats(project) {
    const container = document.getElementById('chapters-list');
    const totalWords = project.chapters.reduce((sum, ch) => sum + this.countWords(ch.content || ''), 0);
    const totalGoal = project.chapters.reduce((sum, ch) => sum + (ch.wordGoal || 0), 0);

    let summaryHtml = `<div class="chapters-summary"><span>📊 总计：${totalWords.toLocaleString()} 字</span>`;
    if (totalGoal > 0) {
      const pct = Math.round(totalWords / totalGoal * 100);
      summaryHtml += `<span>🎯 总目标：${totalGoal.toLocaleString()} 字（${pct}%）</span>`;
    }
    summaryHtml += `</div>`;
    // Prepend to existing content
    const first = container.querySelector('.chapter-item');
    if (first) {
      first.insertAdjacentHTML('beforebegin', summaryHtml);
    }
  },

  esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // ===== 拖拽排序 =====
  dragSourceIndex: null,

  onDragStart(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.dragSourceIndex = index;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  },

  onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const item = e.currentTarget;
    // 移除所有 drop-indicator
    document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
    // 在目标项上方插入指示线
    const indicator = document.createElement('div');
    indicator.className = 'drop-indicator';
    item.parentElement.insertBefore(indicator, item);
  },

  onDrop(e, targetIndex) {
    e.preventDefault();
    const sourceIndex = this.dragSourceIndex;
    if (sourceIndex === null || sourceIndex === targetIndex) return;

    const project = Storage.load();
    const [moved] = project.chapters.splice(sourceIndex, 1);
    project.chapters.splice(targetIndex, 0, moved);
    Storage.save(project);

    // 更新当前编辑的章节索引
    if (this.currentChapterIndex === sourceIndex) {
      this.currentChapterIndex = targetIndex;
    } else if (sourceIndex < this.currentChapterIndex && targetIndex >= this.currentChapterIndex) {
      this.currentChapterIndex--;
    } else if (sourceIndex > this.currentChapterIndex && targetIndex <= this.currentChapterIndex) {
      this.currentChapterIndex++;
    }

    this.render();
    // 如果正在编辑某章，重新加载
    if (this.currentChapterIndex >= 0) {
      const ch = project.chapters[this.currentChapterIndex];
      document.getElementById('chapter-editor').value = ch.content || '';
      document.getElementById('chapter-keypoints').value = ch.keypoints || '';
      document.getElementById('chapter-style').value = ch.style || '';
      document.getElementById('writing-chapter-select').value = this.currentChapterIndex;
      Writing.updateWordCount();
    }
  },

  onDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
    this.dragSourceIndex = null;
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
      project.chapters.push({ title, content: '', keypoints, style: '', wordGoal: 2500 });
      Storage.save(project);
      added++;
    });

    UI.closeModal();
    this.render();
    alert(`✅ 成功添加 ${added} 章`);
  }
};
