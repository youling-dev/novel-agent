// ===== 写作区模块 =====
const Writing = {
  saveTimeout: null,

  init() {
    const editor = document.getElementById('chapter-editor');
    const keypoints = document.getElementById('chapter-keypoints');
    const style = document.getElementById('chapter-style');

    editor.addEventListener('input', () => {
      this.updateWordCount();
      this.debouncedSave();
    });

    keypoints.addEventListener('input', () => this.debouncedSave());
    style.addEventListener('input', () => this.debouncedSave());

    document.getElementById('btn-save-chapter').addEventListener('click', () => {
      this.saveNow();
    });

    document.getElementById('writing-chapter-select').addEventListener('change', (e) => {
      if (e.target.value !== '') {
        Chapters.select(parseInt(e.target.value));
      }
    });

    document.getElementById('btn-ai-assist').addEventListener('click', () => {
      this.aiAssist();
    });

    // Ctrl+S / Cmd+S 快捷键保存
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveNow();
      }
    });

    // 专注模式按钮
    document.getElementById('btn-focus-mode').addEventListener('click', () => {
      this.toggleFocusMode();
    });

    // ESC 退出专注模式
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('focus-mode')) {
        this.exitFocusMode();
      }
    });
  },

  // 专注模式切换
  toggleFocusMode() {
    if (document.body.classList.contains('focus-mode')) {
      this.exitFocusMode();
    } else {
      this.enterFocusMode();
    }
  },

  enterFocusMode() {
    document.body.classList.add('focus-mode');
    document.getElementById('chapter-editor').focus();
    this.showToast('🎯 专注模式已开启（ESC 退出）');
  },

  exitFocusMode() {
    document.body.classList.remove('focus-mode');
    this.showToast('专注模式已退出');
  },

  // 防抖保存（停止输入 2 秒后自动保存）
  debouncedSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveNow(true);
    }, 2000);
  },

  // 立即保存
  saveNow(silent = false) {
    const index = parseInt(document.getElementById('writing-chapter-select').value);
    if (isNaN(index)) {
      if (!silent) {
        this.showToast('请先选择章节');
      }
      return;
    }
    const project = Storage.load();
    project.chapters[index].content = document.getElementById('chapter-editor').value;
    project.chapters[index].keypoints = document.getElementById('chapter-keypoints').value;
    project.chapters[index].style = document.getElementById('chapter-style').value;
    Storage.save(project);
    // 版本快照（去重保护：内容相同则跳过）
    if (typeof Versions !== 'undefined') {
      Versions.snapshot(index);
    }
    if (silent) {
      console.log('💾 自动保存完成');
    }
  },

  updateWordCount() {
    const text = document.getElementById('chapter-editor').value;
    const count = text.replace(/\s/g, '').length;

    const select = document.getElementById('writing-chapter-select');
    const project = Storage.load();
    const idx = parseInt(select.value);
    const chapter = (idx >= 0 && project.chapters[idx]) ? project.chapters[idx] : null;
    const goal = chapter ? (chapter.wordGoal || 0) : 0;

    let html = `<span id="word-count">字数：${count.toLocaleString()}</span>`;
    if (goal > 0) {
      const pct = Math.min(Math.round(count / goal * 100), 100);
      const remaining = Math.max(goal - count, 0);
      const barColor = pct >= 100 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b';
      html += `<span class="writing-goal" style="margin-left:16px;">
        🎯 目标 ${goal.toLocaleString()}（${pct}%）
        <span class="writing-goal-bar" style="display:inline-block;width:80px;height:6px;background:#e5e7eb;border-radius:3px;vertical-align:middle;margin-left:6px;overflow:hidden;">
          <span style="display:block;width:${pct}%;height:100%;background:${barColor};border-radius:3px;"></span>
        </span>`;
      if (remaining > 0) {
        html += `<span style="margin-left:4px;color:#6b7280;">还差 ${remaining.toLocaleString()} 字</span>`;
      } else {
        html += `<span style="margin-left:4px;color:#10b981;">✅ 达标</span>`;
      }
      html += `</span>`;
    }
    document.getElementById('word-count').parentElement.innerHTML = html;
    // Re-apply id for reference
    const wc = document.getElementById('word-count').parentElement.querySelector('#word-count') || document.getElementById('word-count');
  },

  aiAssist() {
    const index = parseInt(document.getElementById('writing-chapter-select').value);
    if (isNaN(index)) {
      this.showToast('⚠️ 请先选择章节');
      return;
    }

    const project = Storage.load();
    const chapter = project.chapters[index];
    const keypoints = document.getElementById('chapter-keypoints').value;
    const style = document.getElementById('chapter-style').value;

    // 构建提示，供 Agent 使用
    const prompt = this.buildPrompt(project, chapter, keypoints, style, index);

    // 显示提示框，让 Agent 知道要做什么
    document.getElementById('modal').innerHTML = `
      <h3>🤖 AI 辅助写作</h3>
      <p style="font-size:0.85em;color:var(--text-secondary);margin-bottom:16px;">
        请将以下内容发给有灵，让它帮你写：
      </p>
      <div class="form-group">
        <textarea id="ai-prompt-text" rows="10" style="font-size:0.85em;white-space:pre-wrap;">${prompt}</textarea>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="UI.closeModal()">关闭</button>
        <button class="btn-primary" onclick="navigator.clipboard.writeText(document.getElementById('ai-prompt-text').value); alert('已复制！');">📋 复制提示词</button>
      </div>`;

    UI.openModal();
  },

  // Toast 提示
  showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; bottom: 20px; right: 20px;
      background: var(--primary-color, #667eea); color: white;
      padding: 12px 20px; border-radius: 8px; z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  buildPrompt(project, chapter, keypoints, style, index) {
    let prompt = `请帮我写小说《${project.title || '未命名'}》的第${index + 1}章。\n\n`;

    prompt += `【小说信息】\n`;
    prompt += `类型：${project.genre || '未设定'}\n`;
    prompt += `简介：${project.summary || '未设定'}\n`;
    if (project.world) prompt += `世界观：${project.world}\n`;
    prompt += `\n`;

    if (project.characters && project.characters.length > 0) {
      prompt += `【角色】\n`;
      project.characters.forEach(c => {
        prompt += `- ${c.name}${c.role ? '（' + c.role + '）' : ''}\n`;
        if (c.personality) prompt += `  性格：${c.personality}\n`;
        if (c.appearance) prompt += `  外貌：${c.appearance}\n`;
        if (c.background) prompt += `  背景：${c.background}\n`;
        if (c.goal) prompt += `  目标：${c.goal}\n`;
      });
      prompt += `\n`;
    }

    if (project.outline && project.outline[index]) {
      const outline = project.outline[index];
      prompt += `【本章大纲】\n`;
      prompt += `标题：${outline.title}\n`;
      if (outline.summary) prompt += `概要：${outline.summary}\n`;
      prompt += `\n`;
    }

    prompt += `【写作要求】\n`;
    prompt += `章节标题：${chapter.title}\n`;
    if (keypoints) prompt += `本章要点：${keypoints}\n`;
    if (style) prompt += `写作风格：${style}\n`;
    const goal = chapter.wordGoal || 2500;
    prompt += `目标字数：${goal}字（${Math.round(goal * 0.8)}-${Math.round(goal * 1.2)}字）\n\n`;

    prompt += `【写作原则】\n`;
    prompt += `1. 对话自然，不同角色说话节奏不同\n`;
    prompt += `2. 情绪用生理细节代替，不要用"他很高兴"这种\n`;
    prompt += `3. 动作描写要有画面感，不要像清单\n`;
    prompt += `4. 结尾用动作/悬念代替感慨\n`;
    prompt += `5. 消灭模板化表达\n`;

    return prompt;
  }
};
