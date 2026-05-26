// ===== 云端同步模块（GitHub Gist）=====
const CloudSync = {
  TOKEN_KEY: 'novel_agent_github_token',
  GIST_MAP_KEY: 'novel_agent_gist_map',
  GIST_API: 'https://api.github.com/gists',

  // 获取/设置 GitHub Token
  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  setToken(token) {
    localStorage.setItem(this.TOKEN_KEY, token.trim());
  },

  clearToken() {
    localStorage.removeItem(this.TOKEN_KEY);
  },

  hasToken() {
    return !!this.getToken();
  },

  // Gist 映射：projectTitle -> gistId
  getGistMap() {
    try {
      return JSON.parse(localStorage.getItem(this.GIST_MAP_KEY)) || {};
    } catch { return {}; }
  },

  saveGistMap(map) {
    localStorage.setItem(this.GIST_MAP_KEY, JSON.stringify(map));
  },

  // 打开 Token 设置弹窗
  showTokenModal() {
    const modal = document.getElementById('cloudsync-modal');
    if (!modal) return;

    const tokenInput = document.getElementById('github-token-input');
    const statusEl = document.getElementById('cloudsync-status');
    const currentToken = this.getToken();

    tokenInput.value = currentToken || '';

    if (currentToken) {
      this._verifyToken(currentToken, statusEl);
    } else {
      statusEl.textContent = '';
      statusEl.className = 'cloudsync-status';
    }

    modal.style.display = 'flex';
  },

  closeTokenModal() {
    const modal = document.getElementById('cloudsync-modal');
    if (modal) modal.style.display = 'none';
  },

  // 验证 Token
  async _verifyToken(token, statusEl) {
    statusEl.textContent = '正在验证...';
    statusEl.className = 'cloudsync-status cloudsync-loading';

    try {
      const res = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
      });

      if (res.ok) {
        const user = await res.json();
        statusEl.textContent = `✅ 已连接: ${user.login}`;
        statusEl.className = 'cloudsync-status cloudsync-ok';
      } else {
        statusEl.textContent = '❌ Token 无效或已过期';
        statusEl.className = 'cloudsync-status cloudsync-error';
      }
    } catch (e) {
      statusEl.textContent = '❌ 网络错误，无法验证';
      statusEl.className = 'cloudsync-status cloudsync-error';
    }
  },

  // 保存项目到云端
  async push(project) {
    const token = this.getToken();
    if (!token) {
      this.showTokenModal();
      return { success: false, error: '请先设置 GitHub Token' };
    }

    const title = project.title || '未命名项目';
    const gistMap = this.getGistMap();
    const gistId = gistMap[title];

    const filename = `${this._slugify(title)}.json`;
    const files = {
      [filename]: {
        filename: filename,
        content: JSON.stringify({
          version: 'novel-agent-cloud-v1',
          syncedAt: Date.now(),
          project: project
        }, null, 2)
      },
      '_cloudsync.json': {
        filename: '_cloudsync.json',
        content: JSON.stringify({
          projectName: title,
          syncedAt: new Date().toISOString(),
          chapters: (project.chapters || []).length,
          characters: (project.characters || []).length,
          totalWords: (project.chapters || []).reduce((s, ch) => s + (ch.content || '').replace(/\s/g, '').length, 0)
        }, null, 2)
      }
    };

    try {
      let res;
      if (gistId) {
        // 更新已有 Gist
        res = await fetch(`${this.GIST_API}/${gistId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ files })
        });
      } else {
        // 创建新 Gist
        res = await fetch(this.GIST_API, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            description: `novel-agent: ${title}`,
            public: false,
            files
          })
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      const gist = await res.json();
      const newGistId = gist.id || gistId;

      // 更新映射
      gistMap[title] = newGistId;
      this.saveGistMap(gistMap);

      return {
        success: true,
        gistId: newGistId,
        gistUrl: gist.html_url,
        message: gistId ? '更新成功' : '创建成功'
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  // 从云端拉取项目
  async pull(projectTitle) {
    const token = this.getToken();
    if (!token) {
      this.showTokenModal();
      return { success: false, error: '请先设置 GitHub Token' };
    }

    const gistMap = this.getGistMap();
    const gistId = gistMap[projectTitle];

    if (!gistId) {
      return { success: false, error: '未找到该项目的云端版本' };
    }

    try {
      const res = await fetch(`${this.GIST_API}/${gistId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const gist = await res.json();
      const files = gist.files || {};

      // 找到项目数据文件
      let projectFile = null;
      for (const key of Object.keys(files)) {
        if (key !== '_cloudsync.json') {
          projectFile = files[key];
          break;
        }
      }

      if (!projectFile) {
        return { success: false, error: 'Gist 中未找到项目数据' };
      }

      const data = JSON.parse(projectFile.content);
      if (!data.project) {
        return { success: false, error: '数据格式不正确' };
      }

      return {
        success: true,
        project: data.project,
        syncedAt: data.syncedAt,
        gistUrl: gist.html_url
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  // 列出所有云端项目
  async listGists() {
    const token = this.getToken();
    if (!token) return [];

    try {
      const res = await fetch(`${this.GIST_API}?per_page=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const gists = await res.json();
      return gists
        .filter(g => g.description && g.description.startsWith('novel-agent:'))
        .map(g => {
          const name = g.description.replace('novel-agent:', '');
          const meta = g.files && g.files['_cloudsync.json']
            ? JSON.parse(g.files['_cloudsync.json'].content)
            : null;

          return {
            id: g.id,
            name,
            description: name,
            updatedAt: g.updated_at,
            chapters: meta?.chapters || '?',
            totalWords: meta?.totalWords || '?',
            url: g.html_url
          };
        });
    } catch { return []; }
  },

  // 从指定 Gist 拉取
  async pullByGistId(gistId) {
    const token = this.getToken();
    if (!token) return { success: false, error: '请先设置 GitHub Token' };

    try {
      const res = await fetch(`${this.GIST_API}/${gistId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const gist = await res.json();
      const files = gist.files || {};
      const meta = files['_cloudsync.json'] ? JSON.parse(files['_cloudsync.json'].content) : null;

      let projectFile = null;
      for (const key of Object.keys(files)) {
        if (key !== '_cloudsync.json') {
          projectFile = files[key];
          break;
        }
      }

      if (!projectFile) {
        return { success: false, error: '未找到项目数据' };
      }

      const data = JSON.parse(projectFile.content);
      const project = data.project;

      // 更新映射
      const gistMap = this.getGistMap();
      gistMap[project.title || meta?.projectName || '未命名'] = gistId;
      this.saveGistMap(gistMap);

      return {
        success: true,
        project,
        gistId,
        gistUrl: gist.html_url
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  // 删除云端 Gist
  async deleteGist(projectTitle) {
    const token = this.getToken();
    if (!token) return { success: false, error: '请先设置 GitHub Token' };

    const gistMap = this.getGistMap();
    const gistId = gistMap[projectTitle];
    if (!gistId) return { success: false, error: '未找到该项目的云端版本' };

    try {
      const res = await fetch(`${this.GIST_API}/${gistId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      delete gistMap[projectTitle];
      this.saveGistMap(gistMap);
      return { success: true, message: '已删除云端版本' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  // 渲染云端同步面板
  async render() {
    const container = document.getElementById('cloudsync-panel');
    if (!container) return;

    const hasToken = this.hasToken();
    const project = Storage.load();
    const title = project.title || '未命名项目';
    const gistMap = this.getGistMap();
    const synced = !!gistMap[title];

    let gistsHtml = '';
    if (hasToken) {
      gistsHtml = `<div class="cloudsync-gists" id="cloudsync-gists-list">
        <div class="cloudsync-gists-loading">正在加载云端项目...</div>
      </div>`;
    }

    container.innerHTML = `
      <div class="cloudsync-header">
        <h3>☁️ 云端同步</h3>
        <p class="cloudsync-desc">通过 GitHub Gist 在项目之间同步数据，随时随地继续写作</p>
      </div>

      <div class="cloudsync-status-bar">
        ${hasToken
          ? `<span class="cloudsync-badge cloudsync-connected">🔗 已连接 GitHub</span>
             ${synced ? `<span class="cloudsync-badge cloudsync-synced">✅ 当前项目已同步</span>` : `<span class="cloudsync-badge cloudsync-not-synced">⚪ 当前项目未同步</span>`}`
          : `<span class="cloudsync-badge cloudsync-disconnected">⚠️ 未连接 GitHub</span>`}
      </div>

      <div class="cloudsync-actions">
        ${hasToken ? `
          <button class="btn-primary cloudsync-btn" id="btn-cloud-push" title="上传到云端">
            📤 上传到云端
          </button>
          ${synced ? `
          <button class="btn-secondary cloudsync-btn" id="btn-cloud-pull" title="从云端拉取">
            📥 从云端拉取
          </button>
          <button class="btn-danger cloudsync-btn cloudsync-btn-sm" id="btn-cloud-delete" title="删除云端版本">
            🗑️ 删除云端
          </button>` : ''}
          <button class="btn-secondary cloudsync-btn cloudsync-btn-sm" id="btn-cloud-token" title="修改 Token">
            ⚙️ Token 设置
          </button>
        ` : `
          <button class="btn-primary cloudsync-btn" id="btn-cloud-setup" title="设置 GitHub Token">
            🔑 设置 GitHub Token
          </button>
        `}
      </div>

      ${gistsHtml}

      ${hasToken ? `
      <div class="cloudsync-help">
        <h4>如何获取 GitHub Token？</h4>
        <ol>
          <li>访问 <a href="https://github.com/settings/tokens" target="_blank">GitHub Settings → Developer Settings → Personal access tokens</a></li>
          <li>点击 "Generate new token (classic)"</li>
          <li>勾选 <code>gist</code> 权限</li>
          <li>点击 "Generate token" 并复制</li>
        </ol>
        <p class="cloudsync-note">🔒 Token 仅保存在你的浏览器本地，不会发送到除 GitHub 以外的任何地方</p>
      </div>` : ''}
    `;

    // 绑定事件
    if (hasToken) {
      document.getElementById('btn-cloud-push')?.addEventListener('click', () => this._handlePush());
      document.getElementById('btn-cloud-pull')?.addEventListener('click', () => this._handlePull(title));
      document.getElementById('btn-cloud-delete')?.addEventListener('click', () => this._handleDelete(title));
      document.getElementById('btn-cloud-token')?.addEventListener('click', () => this.showTokenModal());
      this._loadGists();
    } else {
      document.getElementById('btn-cloud-setup')?.addEventListener('click', () => this.showTokenModal());
    }
  },

  // 处理上传
  async _handlePush() {
    const btn = document.getElementById('btn-cloud-push');
    const orig = btn.innerHTML;
    btn.innerHTML = '⏳ 同步中...';
    btn.disabled = true;

    const project = Storage.load();
    const result = await this.push(project);

    btn.innerHTML = orig;
    btn.disabled = false;

    if (result.success) {
      this._toast(`✅ ${result.message}${result.gistUrl ? ` · <a href="${result.gistUrl}" target="_blank">查看 Gist</a>` : ''}`);
      this.render();
    } else {
      alert(`❌ 同步失败：${result.error}`);
    }
  },

  // 处理拉取
  async _handlePull(title) {
    if (!confirm(`确定要从云端拉取 "${title}" 吗？当前数据将被覆盖。\n\n建议先本地备份。`)) return;

    const btn = document.getElementById('btn-cloud-pull');
    const orig = btn.innerHTML;
    btn.innerHTML = '⏳ 拉取中...';
    btn.disabled = true;

    const result = await this.pull(title);

    btn.innerHTML = orig;
    btn.disabled = false;

    if (result.success) {
      Storage.save(result.project);
      Backups._reloadAll();
      this._toast(`✅ 已从云端恢复 (${(new Date(result.syncedAt)).toLocaleString('zh-CN')})`);
      this.render();
    } else {
      alert(`❌ 拉取失败：${result.error}`);
    }
  },

  // 处理删除
  async _handleDelete(title) {
    if (!confirm(`确定要删除 "${title}" 的云端版本吗？此操作不可撤销。`)) return;

    const result = await this.deleteGist(title);

    if (result.success) {
      this._toast('✅ 已删除云端版本');
      this.render();
    } else {
      alert(`❌ 删除失败：${result.error}`);
    }
  },

  // 加载 Gist 列表
  async _loadGists() {
    const container = document.getElementById('cloudsync-gists-list');
    if (!container) return;

    const gists = await this.listGists();

    if (gists.length === 0) {
      container.innerHTML = '<div class="cloudsync-empty">☁️ 云端暂无项目</div>';
      return;
    }

    container.innerHTML = gists.map(g => `
      <div class="cloudsync-gist-card">
        <div class="cloudsync-gist-info">
          <div class="cloudsync-gist-name">${g.name}</div>
          <div class="cloudsync-gist-meta">
            ${g.chapters} 章 · ${typeof g.totalWords === 'number' ? g.totalWords.toLocaleString() + ' 字' : ''} ·
            更新于 ${new Date(g.updatedAt).toLocaleDateString('zh-CN')}
          </div>
        </div>
        <div class="cloudsync-gist-actions">
          <button class="btn-sm btn-primary" onclick="CloudSync._loadGist('${g.id}')">📥 加载</button>
          <a href="${g.url}" target="_blank" class="btn-sm btn-secondary">🔗 查看</a>
        </div>
      </div>
    `).join('');
  },

  // 从 Gist 加载
  async _loadGist(gistId) {
    if (!confirm('确定要加载这个云端项目吗？当前数据将被覆盖。\n\n建议先本地备份。')) return;

    const result = await this.pullByGistId(gistId);

    if (result.success) {
      Storage.save(result.project);
      Backups._reloadAll();
      this._toast(`✅ 已加载: ${result.project.title || '未命名'}`);
      this.render();
    } else {
      alert(`❌ 加载失败：${result.error}`);
    }
  },

  // 初始化
  init() {
    // Token 弹窗事件
    const modal = document.getElementById('cloudsync-modal');
    if (!modal) return;

    const btnSave = document.getElementById('btn-save-token');
    const btnCancel = document.getElementById('btn-cancel-token');

    btnCancel?.addEventListener('click', () => this.closeTokenModal());

    btnSave?.addEventListener('click', async () => {
      const input = document.getElementById('github-token-input');
      const token = input.value.trim();
      const statusEl = document.getElementById('cloudsync-status');

      if (!token) {
        statusEl.textContent = '请输入 Token';
        statusEl.className = 'cloudsync-status cloudsync-error';
        return;
      }

      this.setToken(token);
      await this._verifyToken(token, statusEl);
    });

    // 关闭弹窗（点击遮罩层）
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) this.closeTokenModal();
    });

    // ESC 关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal) this.closeTokenModal();
    });

    // 渲染云端同步面板
    this.render();

    // 监听项目恢复事件重新渲染
    window.addEventListener('project-restored', () => this.render());
  },

  // 工具
  _slugify(text) {
    return text
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 40);
  },

  _toast(html) {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = html;
    toast.style.textAlign = 'center';
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('toast-show'), 10);
    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};
