// ===== 全文搜索模块 =====
// 搜索范围：章节正文、角色描述、大纲、项目设定

const Search = {
  // 搜索所有章节、角色、大纲
  search(query) {
    if (!query || !query.trim()) return [];
    const project = Storage.load();
    const q = query.trim().toLowerCase();
    const results = [];

    // 1. 搜索章节内容
    project.chapters.forEach((ch, i) => {
      const inTitle = (ch.title || '').toLowerCase().includes(q);
      const inContent = (ch.content || '').toLowerCase().includes(q);
      const inKeypoints = (ch.keypoints || '').toLowerCase().includes(q);

      if (inContent || inTitle || inKeypoints) {
        const snippet = this.getSnippet(ch.content || '', q, 80);
        results.push({
          type: 'chapter',
          typeLabel: '章节',
          typeIcon: '📝',
          title: `第${i + 1}章 ${ch.title || '未命名'}`,
          snippet,
          source: 'content',
          index: i,
          score: (inTitle ? 10 : 0) + (inKeypoints ? 5 : 0) + (inContent ? 1 : 0)
        });
      }
    });

    // 2. 搜索角色
    project.characters.forEach((ch, i) => {
      const text = [
        ch.name, ch.appearance, ch.personality, ch.background,
        ch.goal, ch.relationships, ch.description
      ].filter(Boolean).join(' ');
      const lower = text.toLowerCase();
      if (lower.includes(q)) {
        const snippet = this.getSnippet(text, q, 80);
        results.push({
          type: 'character',
          typeLabel: '角色',
          typeIcon: '🎭',
          title: ch.name || '未命名角色',
          snippet,
          index: i,
          score: (lower.startsWith(q) ? 5 : 0) + 1
        });
      }
    });

    // 3. 搜索大纲
    project.outline.forEach((o, i) => {
      const text = [o.title, o.summary, o.notes].filter(Boolean).join(' ');
      if (text.toLowerCase().includes(q)) {
        const snippet = this.getSnippet(text, q, 80);
        results.push({
          type: 'outline',
          typeLabel: '大纲',
          typeIcon: '📋',
          title: o.title || `大纲 ${i + 1}`,
          snippet,
          index: i,
          score: 1
        });
      }
    });

    // 4. 搜索项目设定
    const worldText = project.world || '';
    if (worldText.toLowerCase().includes(q)) {
      const snippet = this.getSnippet(worldText, q, 80);
      results.push({
        type: 'world',
        typeLabel: '世界观',
        typeIcon: '🌍',
        title: '世界观设定',
        snippet,
        score: 3
      });
    }

    // 按分数排序
    results.sort((a, b) => b.score - a.score);
    return results;
  },

  // 获取包含关键词的文本片段
  getSnippet(text, query, maxLen) {
    const lower = text.toLowerCase();
    const idx = lower.indexOf(query.toLowerCase());
    if (idx === -1) {
      return text.substring(0, maxLen) + (text.length > maxLen ? '…' : '');
    }

    let start = Math.max(0, idx - Math.floor(maxLen / 2));
    let end = Math.min(text.length, idx + query.length + Math.floor(maxLen / 2));

    // 调整到字符边界（中文）
    let snippet = text.substring(start, end);
    if (start > 0) snippet = '…' + snippet;
    if (end < text.length) snippet = snippet + '…';
    return snippet;
  },

  // 渲染搜索结果
  renderResults(results) {
    const container = document.getElementById('search-results');

    if (results.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <p>没有找到匹配的结果</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="search-stats">找到 ${results.length} 个结果</div>
      ${results.map(r => `
        <div class="search-result-item ${r.type}" onclick="Search.goTo('${r.type}', ${r.index})">
          <div class="search-result-header">
            <span class="search-result-icon">${r.typeIcon}</span>
            <span class="search-result-title">${this.esc(r.title)}</span>
            <span class="search-result-badge">${r.typeLabel}</span>
          </div>
          <div class="search-result-snippet">${this.highlight(r.snippet)}</div>
        </div>
      `).join('')}
    `;
  },

  // 跳转到对应位置
  goTo(type, index) {
    const tabMap = {
      chapter: 'chapters',
      character: 'characters',
      outline: 'outline',
      world: 'chapters'
    };

    const tab = tabMap[type];
    if (!tab) return;

    // 切换到对应 tab
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.remove('active');
      if (b.dataset.tab === tab) b.classList.add('active');
    });
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');

    // 高亮对应章节/角色
    if (type === 'chapter' && index !== undefined) {
      Chapters.select(index);
    }
  },

  // 高亮关键词（简单 HTML 转义 + 标记）
  highlight(text) {
    return this.esc(text); // 暂时只转义，避免 XSS
  },

  esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // 初始化事件
  init() {
    const input = document.getElementById('search-input');
    const btn = document.getElementById('btn-search');

    if (!input || !btn) return;

    // 按钮点击
    btn.addEventListener('click', () => {
      const results = this.search(input.value);
      this.renderResults(results);
    });

    // 回车搜索
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const results = this.search(input.value);
        this.renderResults(results);
      }
    });

    // 实时搜索（防抖）
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (input.value.trim().length >= 1) {
          const results = this.search(input.value);
          this.renderResults(results);
        }
      }, 300);
    });
  }
};
