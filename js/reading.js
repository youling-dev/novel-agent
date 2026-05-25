// ===== 阅读模式模块 =====
const Reading = {
  currentIndex: 0,
  fontSize: 18,
  warmTheme: false,

  init() {
    // 工具栏阅读按钮
    document.getElementById('btn-read-mode').addEventListener('click', () => {
      this.open();
    });

    // 翻页
    document.getElementById('btn-read-prev').addEventListener('click', () => {
      this.navigate(-1);
    });
    document.getElementById('btn-read-next').addEventListener('click', () => {
      this.navigate(1);
    });

    // 字体大小
    document.getElementById('btn-read-fontdown').addEventListener('click', () => {
      this.changeFontSize(-1);
    });
    document.getElementById('btn-read-fontup').addEventListener('click', () => {
      this.changeFontSize(1);
    });

    // 暖色主题
    document.getElementById('btn-read-theme').addEventListener('click', () => {
      this.toggleWarmTheme();
    });

    // 键盘翻页
    document.addEventListener('keydown', (e) => {
      const tab = document.getElementById('tab-reading');
      if (!tab || !tab.classList.contains('active')) return;
      if (e.key === 'ArrowLeft') this.navigate(-1);
      if (e.key === 'ArrowRight') this.navigate(1);
    });

    // 恢复上次阅读状态
    const saved = localStorage.getItem('reading-fontSize');
    if (saved) this.fontSize = parseInt(saved) || 18;
    this.warmTheme = localStorage.getItem('reading-warm') === 'true';
  },

  // 打开阅读模式，默认读取当前选中的章节
  open() {
    const select = document.getElementById('writing-chapter-select');
    this.currentIndex = parseInt(select.value) || 0;
    this.render();
    this.switchTab('reading');
  },

  // 渲染当前章节
  render() {
    const project = Storage.load();
    const chapters = project.chapters || [];

    if (!chapters.length) {
      document.getElementById('reading-title').textContent = '暂无章节';
      document.getElementById('reading-content').innerHTML = '<div class="reading-content empty">还没有章节，去写第一章吧 ✍️</div>';
      document.getElementById('reading-words').textContent = '';
      return;
    }

    // 边界保护
    this.currentIndex = Math.max(0, Math.min(this.currentIndex, chapters.length - 1));

    const chapter = chapters[this.currentIndex];
    const title = chapter.title || `第 ${this.currentIndex + 1} 章`;

    document.getElementById('reading-title').textContent = title;

    // 格式化正文：段落渲染
    const content = this.formatText(chapter.content || '');
    const contentEl = document.getElementById('reading-content');
    contentEl.innerHTML = content || '<div class="reading-content empty">这一章还是空的，去写点东西吧 ✍️</div>';

    // 应用字体大小
    contentEl.style.fontSize = this.fontSize + 'px';

    // 应用暖色主题
    if (this.warmTheme) {
      document.getElementById('tab-reading').classList.add('reading-warm');
    } else {
      document.getElementById('tab-reading').classList.remove('reading-warm');
    }

    // 字数
    const wordCount = (chapter.content || '').replace(/\s/g, '').length;
    document.getElementById('reading-words').textContent = `第 ${this.currentIndex + 1} / ${chapters.length} 章 · ${wordCount.toLocaleString()} 字`;

    // 翻页按钮状态
    document.getElementById('btn-read-prev').style.opacity = this.currentIndex === 0 ? '0.4' : '1';
    document.getElementById('btn-read-next').style.opacity = this.currentIndex === chapters.length - 1 ? '0.4' : '1';
  },

  // 格式化文本：按空行分段，首行缩进
  formatText(text) {
    if (!text.trim()) return '';
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    if (paragraphs.length === 0) {
      // 没有空行分段，按单行分
      return text.split('\n').filter(l => l.trim())
        .map(l => `<p style="text-indent:2em;">${this.escapeHtml(l.trim())}</p>`)
        .join('');
    }
    return paragraphs.map(p => {
      const lines = p.trim().split('\n').map(l => this.escapeHtml(l.trim()));
      return `<p style="text-indent:2em;">${lines.join('')}</p>`;
    }).join('');
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // 翻页
  navigate(direction) {
    const project = Storage.load();
    const len = project.chapters?.length || 0;
    const next = this.currentIndex + direction;
    if (next >= 0 && next < len) {
      this.currentIndex = next;
      this.render();
      // 滚动到顶部
      document.getElementById('reading-content').scrollTo({ top: 0, behavior: 'smooth' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  // 字体大小
  changeFontSize(delta) {
    this.fontSize = Math.max(14, Math.min(28, this.fontSize + delta));
    localStorage.setItem('reading-fontSize', this.fontSize);
    document.getElementById('reading-content').style.fontSize = this.fontSize + 'px';
  },

  // 暖色主题
  toggleWarmTheme() {
    this.warmTheme = !this.warmTheme;
    localStorage.setItem('reading-warm', this.warmTheme);
    const tab = document.getElementById('tab-reading');
    if (this.warmTheme) {
      tab.classList.add('reading-warm');
    } else {
      tab.classList.remove('reading-warm');
    }
  },

  // 切换 Tab（借用 app.js 中的 UI 逻辑）
  switchTab(name) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.nav-btn[data-tab="${name}"]`);
    if (btn) btn.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    const tab = document.getElementById(`tab-${name}`);
    if (tab) tab.classList.add('active');
  }
};
