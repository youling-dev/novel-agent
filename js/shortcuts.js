// ===== 键盘快捷键模块 =====
const Shortcuts = {
  // 快捷键配置
  shortcuts: {
    'mod+s': { action: 'save', label: '保存' },
    'mod+enter': { action: 'focus', label: '专注模式' },
    'mod+1': { action: 'tab', target: 'project', label: '项目' },
    'mod+2': { action: 'tab', target: 'characters', label: '角色' },
    'mod+3': { action: 'tab', target: 'outline', label: '大纲' },
    'mod+4': { action: 'tab', target: 'chapters', label: '章节' },
    'mod+5': { action: 'tab', target: 'writing', label: '写作' },
    'mod+6': { action: 'tab', target: 'snippets', label: '片段库' },
    'mod+7': { action: 'tab', target: 'stats', label: '统计' },
    'mod+e': { action: 'export', label: '导出' },
    'mod+f': { action: 'search', label: '搜索' },
    'esc': { action: 'unfocus', label: '退出专注模式' },
  },

  init() {
    document.addEventListener('keydown', (e) => {
      // 不在输入框/文本域时处理快捷键
      const tag = e.target.tagName.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';

      // 全局快捷键（Esc 总是处理）
      if (e.key === 'Escape') {
        this.handle('esc', e);
        return;
      }

      // 带修饰键的快捷键在任何时候都处理
      const key = this.parseKey(e);
      if (!key) return;

      const config = this.shortcuts[key];
      if (!config) return;

      // 保存和专注模式在输入状态下也要处理
      if (isInput && !['save', 'focus', 'export'].includes(config.action)) {
        return;
      }

      e.preventDefault();
      this.handle(key, e);
    });
  },

  parseKey(e) {
    const mod = e.metaKey || e.ctrlKey ? 'mod' : '';
    const shift = e.shiftKey ? '+shift' : '';

    let key = e.key.toLowerCase();
    if (key === ' ') key = 'space';
    if (key.startsWith('arrow')) return null; // 不拦截方向键

    if (mod) return `${mod}+${key}`;
    return null; // 不带修饰键的单键不处理（除了 Esc，上面已处理）
  },

  handle(key, e) {
    const config = this.shortcuts[key];
    if (!config) return;

    switch (config.action) {
      case 'save':
        this.save();
        break;
      case 'focus':
        this.toggleFocus();
        break;
      case 'unfocus':
        this.exitFocus();
        break;
      case 'tab':
        this.switchTab(config.target);
        break;
      case 'export':
        this.showExport();
        break;
      case 'search':
        this.focusSearch();
        break;
    }

    // 显示快捷键提示
    this.showTooltip(config.label);
  },

  save() {
    const editor = document.getElementById('chapter-editor');
    if (editor) {
      Writing.saveCurrent();
    }
  },

  toggleFocus() {
    if (typeof Writing !== 'undefined' && Writing.toggleFocusMode) {
      Writing.toggleFocusMode();
    }
  },

  exitFocus() {
    if (typeof Writing !== 'undefined' && Writing.exitFocusMode) {
      Writing.exitFocusMode();
    }
    // 也关闭模态框
    if (typeof UI !== 'undefined' && UI.closeModal) {
      UI.closeModal();
    }
  },

  switchTab(tabId) {
    const btn = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
    if (btn) btn.click();
  },

  showExport() {
    // 切换到写作标签，然后触发导出
    this.switchTab('writing');
    setTimeout(() => {
      const exportBtn = document.getElementById('btn-export');
      if (exportBtn) exportBtn.click();
    }, 100);
  },

  focusSearch() {
    // 如果在写作标签，聚焦当前编辑器
    const editor = document.getElementById('chapter-editor');
    if (editor) {
      editor.focus();
      // 选中当前光标位置的词或全选
      if (!editor.selectionStart && !editor.selectionEnd) {
        editor.select();
      }
      return;
    }

    // 否则聚焦搜索框
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      this.switchTab('search');
      setTimeout(() => searchInput.focus(), 100);
    }
  },

  showTooltip(text) {
    // 移除旧提示
    const old = document.querySelector('.shortcut-tooltip');
    if (old) old.remove();

    // 创建提示
    const tooltip = document.createElement('div');
    tooltip.className = 'shortcut-tooltip';
    tooltip.textContent = `⌨️ ${text}`;
    tooltip.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10000;
      pointer-events: none;
      animation: tooltipFade 1s ease forwards;
    `;

    // 注入动画样式（如果还没有）
    if (!document.getElementById('shortcut-tooltip-style')) {
      const style = document.createElement('style');
      style.id = 'shortcut-tooltip-style';
      style.textContent = `
        @keyframes tooltipFade {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
          20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(tooltip);
    setTimeout(() => tooltip.remove(), 1100);
  },

  // 显示快捷键帮助弹窗
  showHelp() {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const mod = isMac ? '⌘' : 'Ctrl';

    const rows = [
      ['项目', `${mod}+1`],
      ['角色', `${mod}+2`],
      ['大纲', `${mod}+3`],
      ['章节', `${mod}+4`],
      ['写作', `${mod}+5`],
      ['片段库', `${mod}+6`],
      ['统计', `${mod}+7`],
      ['保存', `${mod}+S`],
      ['专注模式', `${mod}+Enter`],
      ['搜索/聚焦编辑器', `${mod}+F`],
      ['导出', `${mod}+E`],
      ['退出专注/关闭弹窗', 'Esc'],
    ];

    const tableHTML = rows.map(([label, key]) =>
      `<tr><td>${label}</td><td><kbd>${key}</kbd></td></tr>`
    ).join('');

    document.getElementById('modal').innerHTML = `
      <h3>⌨️ 键盘快捷键</h3>
      <table class="shortcuts-table">
        ${tableHTML}
      </table>
      <div class="modal-actions">
        <button class="btn-primary" onclick="UI.closeModal()">知道了</button>
      </div>
    `;
    UI.openModal();
  }
};

// 全局暴露
window.Shortcuts = Shortcuts;
