// ===== 全局查找替换模块 =====
// 跨章节查找文本并批量替换，支持预览、撤销、正则

const FindReplace = {
  matches: [],
  currentMatch: -1,
  originalContent: null,

  // 查找所有匹配
  findAll(query, wholeWord, regexMode) {
    if (!query) return [];
    const project = Storage.load();
    const results = [];

    let pattern;
    try {
      if (regexMode) {
        pattern = new RegExp(query, 'g');
      } else if (wholeWord) {
        pattern = new RegExp(this.escapeRegex(query), 'g');
      } else {
        pattern = new RegExp(this.escapeRegex(query), 'gi');
      }
    } catch (e) {
      return [{ error: '正则表达式有误: ' + e.message }];
    }

    project.chapters.forEach((ch, ci) => {
      if (!ch || !ch.content) return;
      const content = ch.content;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const start = match.index;
        const len = match[0].length;
        const beforeLen = Math.max(0, start - 30);
        const afterLen = Math.min(content.length - start - len, 30);
        const before = start > 0 ? '…' + content.substring(start - beforeLen, start) : '';
        const after = start + len < content.length ? content.substring(start + len, start + len + afterLen) + '…' : '';

        results.push({
          chapterIndex: ci,
          chapterTitle: ch.title || `第${ci + 1}章`,
          position: start,
          length: len,
          matched: match[0],
          context: `${before}<mark>${this.esc(match[0])}</mark>${after}`,
          before,
          after,
        });
        if (match[0].length === 0) pattern.lastIndex++;
      }
    });

    return results;
  },

  // 执行替换
  replaceAll(query, replacement, wholeWord, regexMode) {
    const project = Storage.load();
    let totalReplaced = 0;

    // 保存原始内容用于撤销
    this.originalContent = project.chapters.map(ch => ({
      title: ch.title,
      content: ch.content,
    }));

    let pattern;
    try {
      if (regexMode) {
        pattern = new RegExp(query, 'g');
      } else if (wholeWord) {
        pattern = new RegExp(this.escapeRegex(query), 'g');
      } else {
        pattern = new RegExp(this.escapeRegex(query), 'gi');
      }
    } catch (e) {
      return { error: '正则表达式有误: ' + e.message };
    }

    project.chapters.forEach((ch) => {
      if (!ch || !ch.content) return;
      const newContent = ch.content.replace(pattern, replacement);
      if (newContent !== ch.content) {
        const count = (ch.content.match(pattern) || []).length;
        totalReplaced += count;
      }
      ch.content = newContent;
    });

    Storage.save(project);
    return { totalReplaced };
  },

  // 替换单个匹配
  replaceOne(matchIndex, replacement) {
    if (matchIndex < 0 || matchIndex >= this.matches.length) return { error: '无效的匹配索引' };
    const m = this.matches[matchIndex];
    const project = Storage.load();
    const ch = project.chapters[m.chapterIndex];
    if (!ch) return { error: '章节不存在' };

    if (!this.originalContent) {
      this.originalContent = project.chapters.map(c => ({
        title: c.title,
        content: c.content,
      }));
    }

    const before = ch.content.substring(0, m.position);
    const after = ch.content.substring(m.position + m.length);
    ch.content = before + replacement + after;
    Storage.save(project);

    // 更新后续匹配的 position
    const shift = replacement.length - m.length;
    for (let i = matchIndex + 1; i < this.matches.length; i++) {
      if (this.matches[i].chapterIndex === m.chapterIndex) {
        this.matches[i].position += shift;
      }
    }

    return { ok: true };
  },

  // 撤销上次替换
  undo() {
    if (!this.originalContent) return { error: '没有可撤销的操作' };
    const project = Storage.load();
    this.originalContent.forEach((orig, i) => {
      if (project.chapters[i]) {
        project.chapters[i].content = orig.content;
      }
    });
    this.originalContent = null;
    Storage.save(project);
    return { ok: true };
  },

  // 跳转到匹配
  goToMatch(index) {
    if (index < 0 || index >= this.matches.length) return;
    const m = this.matches[index];
    this.currentMatch = index;

    // 切换到写作 tab 并选择对应章节
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.remove('active');
      if (b.dataset.tab === 'chapters') b.classList.add('active');
    });
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    document.getElementById('tab-chapters').classList.add('active');

    Chapters.select(m.chapterIndex);

    // 高亮当前匹配计数
    const counter = document.getElementById('fr-current');
    if (counter) {
      counter.textContent = `${index + 1} / ${this.matches.length}`;
    }
  },

  // 渲染匹配列表
  renderMatches(matches) {
    const list = document.getElementById('fr-results');
    if (!list) return;

    if (matches.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <p>没有找到匹配项</p>
        </div>`;
      return;
    }

    if (matches[0] && matches[0].error) {
      list.innerHTML = `<div class="fr-error">${matches[0].error}</div>`;
      return;
    }

    // 按章节分组统计
    const chapterCounts = {};
    matches.forEach(m => {
      chapterCounts[m.chapterIndex] = (chapterCounts[m.chapterIndex] || 0) + 1;
    });

    list.innerHTML = `
      <div class="fr-summary">
        在 ${Object.keys(chapterCounts).length} 个章节中找到 <strong>${matches.length}</strong> 处匹配
      </div>
      <div class="fr-chapter-groups">
        ${Object.entries(chapterCounts).map(([ci, count]) => {
          const m = matches.find(x => x.chapterIndex == ci);
          return `<div class="fr-chapter-group">
            <div class="fr-chapter-title">📝 ${this.esc(m.chapterTitle)} <span class="fr-badge">${count} 处</span></div>
          </div>`;
        }).join('')}
      </div>
      <div class="fr-match-list">
        ${matches.map((m, i) => `
          <div class="fr-match-item ${i === this.currentMatch ? 'active' : ''}" onclick="FindReplace.goToMatch(${i})" data-index="${i}">
            <div class="fr-match-chapter">第${m.chapterIndex + 1}章 · ${this.esc(m.chapterTitle)}</div>
            <div class="fr-match-context">${m.context}</div>
            <div class="fr-match-actions">
              <button class="btn-sm fr-btn-replace" onclick="event.stopPropagation(); FindReplace.replaceCurrent(${i})">替换</button>
              <button class="btn-sm fr-btn-jump" onclick="event.stopPropagation(); FindReplace.goToMatch(${i})">跳转</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // 替换当前选中的匹配
  replaceCurrent(index) {
    const input = document.getElementById('fr-replace');
    if (!input) return;
    const replacement = input.value;
    const result = this.replaceOne(index, replacement);
    if (result.error) {
      alert(result.error);
      return;
    }
    this.currentMatch = index + 1;
    this.renderMatches(this.matches);
    App.refreshCurrentTab();
  },

  // UI 操作
  doFind() {
    const queryInput = document.getElementById('fr-query');
    const wholeWord = document.getElementById('fr-whole-word');
    const regexMode = document.getElementById('fr-regex');
    if (!queryInput) return;

    const query = queryInput.value;
    if (!query.trim()) return;

    this.matches = this.findAll(query, wholeWord?.checked, regexMode?.checked);
    this.currentMatch = -1;
    this.renderMatches(this.matches);

    const counter = document.getElementById('fr-current');
    if (counter) {
      counter.textContent = this.matches.length ? `0 / ${this.matches.length}` : '0';
    }
  },

  doReplaceAll() {
    const queryInput = document.getElementById('fr-query');
    const replaceInput = document.getElementById('fr-replace');
    const wholeWord = document.getElementById('fr-whole-word');
    const regexMode = document.getElementById('fr-regex');
    if (!queryInput || !replaceInput) return;

    const query = queryInput.value;
    const replacement = replaceInput.value;
    if (!query.trim()) return;

    const confirmMsg = `确定要替换所有匹配项吗？\n将在 ${new Set(this.matches.map(m => m.chapterIndex)).size} 个章节中替换 ${this.matches.length} 处。`;
    if (!confirm(confirmMsg)) return;

    const result = this.replaceAll(query, replacement, wholeWord?.checked, regexMode?.checked);
    if (result.error) {
      alert(result.error);
      return;
    }

    alert(`替换完成！共替换 ${result.totalReplaced} 处。`);
    this.matches = [];
    this.originalContent = null;
    this.renderMatches([]);
    App.refreshCurrentTab();
  },

  doUndo() {
    const result = this.undo();
    if (result.error) {
      alert(result.error);
      return;
    }
    alert('已撤销上次替换操作。');
    this.matches = [];
    App.refreshCurrentTab();
  },

  esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  },

  // 键盘导航
  initKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Shift + H 打开查找替换
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        this.openTab();
      }
      // 在查找替换 tab 中的导航
      const activeTab = document.querySelector('.tab-content.active');
      if (!activeTab || activeTab.id !== 'tab-findreplace') return;

      if (e.key === 'F3' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g')) {
        e.preventDefault();
        if (this.matches.length > 0) {
          this.currentMatch = (this.currentMatch + 1) % this.matches.length;
          this.goToMatch(this.currentMatch);
          this.renderMatches(this.matches);
        }
      }
    });
  },

  openTab() {
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.remove('active');
      if (b.dataset.tab === 'findreplace') b.classList.add('active');
    });
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    document.getElementById('tab-findreplace').classList.add('active');
    const queryInput = document.getElementById('fr-query');
    if (queryInput) queryInput.focus();
  },

  init() {
    this.initKeyboard();
  }
};
