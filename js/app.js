// ===== AI 生成模块 =====
const AI = {
  generateProject() {
    const project = Storage.load();
    const prompt = this.buildProjectPrompt(project);

    document.getElementById('modal').innerHTML = `
      <h3>🤖 AI 生成项目设定</h3>
      <p style="font-size:0.82em;color:var(--text-secondary);margin-bottom:12px;">
        输入你的创意方向（题材、灵感、参考作品等），AI 帮你生成完整项目设定。
      </p>
      <div class="form-group">
        <label>你的创意方向</label>
        <textarea id="ai-idea" rows="3" placeholder="如：末日生存、废土风格、主角有特殊能力、带系统流…"></textarea>
      </div>
      <div class="form-group">
        <label>生成的提示词（点击复制，发给有灵）</label>
        <textarea id="ai-prompt" rows="6" style="font-size:0.82em;">${prompt}</textarea>
        <button class="btn-secondary btn-sm" style="margin-top:6px;" onclick="navigator.clipboard.writeText(document.getElementById('ai-prompt').value);this.textContent='✅ 已复制';setTimeout(()=>this.textContent='📋 复制提示词',2000)">📋 复制提示词</button>
      </div>
      <div class="form-group">
        <label>有灵生成的结果（粘贴到这里，格式：标题|类型|简介|世界观）</label>
        <textarea id="ai-result" rows="3" placeholder="全球冰封：我打造了末日安全屋 | 末日生存 | 全球冰封，只有我能活下去 | 气温骤降至零下100度…"></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="UI.closeModal()">取消</button>
        <button class="btn-primary" onclick="AI.parseProject()">✨ 解析并保存</button>
      </div>`;

    // 更新提示词当用户输入创意
    document.getElementById('ai-idea').addEventListener('input', (e) => {
      document.getElementById('ai-prompt').value = this.buildProjectPrompt(project, e.target.value);
    });

    UI.openModal();
  },

  buildProjectPrompt(project, idea) {
    let prompt = `请帮我为一部小说生成完整的项目设定。\n\n`;
    if (idea) prompt += `【我的创意方向】\n${idea}\n\n`;
    prompt += `请生成以下内容，用 | 分隔：\n`;
    prompt += `小说标题 | 类型/题材 | 一句话简介 | 世界观设定\n\n`;
    prompt += `要求：\n`;
    prompt += `1. 标题有吸引力，符合网文风格\n`;
    prompt += `2. 一句话简介能勾起读者好奇\n`;
    prompt += `3. 世界观清晰、有独特设定\n`;
    return prompt;
  },

  parseProject() {
    const result = document.getElementById('ai-result').value;
    const parts = result.split('|').map(s => s.trim());
    if (parts.length >= 2) {
      const project = Storage.load();
      project.title = parts[0] || project.title;
      project.genre = parts[1] || project.genre;
      project.summary = parts[2] || project.summary;
      project.world = parts[3] || project.world;
      Storage.save(project);
      UI.closeModal();
      loadProjectInfo();
      alert('✅ 项目设定已更新');
    } else {
      alert('格式不对，请用 | 分隔：标题|类型|简介|世界观');
    }
  }
};

// ===== 主应用模块 =====
const UI = {
  openModal() {
    document.getElementById('modal-overlay').classList.remove('hidden');
  },
  closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }
};

// 全局暴露
window.UI = UI;
window.Characters = Characters;
window.Outline = Outline;
window.Chapters = Chapters;
window.Writing = Writing;
window.Export = Export;
window.Search = Search;
window.Backups = Backups;

document.addEventListener('DOMContentLoaded', () => {
  // ===== 导航切换 =====
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;

      // 更新按钮状态
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // 更新内容区
      document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
      document.getElementById(`tab-${tab}`).classList.add('active');
    });
  });

  // ===== 项目信息自动保存 =====
  const fields = ['title', 'genre', 'summary', 'world'];
  fields.forEach(field => {
    const el = document.getElementById(`project-${field}`);
    el.addEventListener('input', () => {
      const project = Storage.load();
      project[field] = el.value;
      Storage.save(project);
    });
  });

  // ===== 加载项目信息 =====
  async function loadProjectInfo() {
    const project = await DataStore.load();
    document.getElementById('project-title').value = project.title || '';
    document.getElementById('project-genre').value = project.genre || '';
    document.getElementById('project-summary').value = project.summary || '';
    document.getElementById('project-world').value = project.world || '';
  }

  // ===== 按钮事件 =====
  document.getElementById('btn-add-character').addEventListener('click', () => Characters.add());
  document.getElementById('btn-add-outline').addEventListener('click', () => Outline.add());
  document.getElementById('btn-add-chapter').addEventListener('click', () => Chapters.add());
  document.getElementById('btn-add-agent').addEventListener('click', () => AgentsConfig.addCustom());

  // ===== AI 生成按钮 =====
  document.getElementById('btn-ai-project').addEventListener('click', () => AI.generateProject());
  document.getElementById('btn-ai-characters').addEventListener('click', () => Characters.generateAI());
  document.getElementById('btn-ai-outline').addEventListener('click', () => Outline.generateAI());
  document.getElementById('btn-ai-chapters').addEventListener('click', () => Chapters.generateAI());

  // ===== 模态框关闭 =====
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) UI.closeModal();
  });

  // ===== 新建项目 =====
  document.getElementById('btn-new-project').addEventListener('click', () => {
    if (confirm('确定新建项目？当前数据会被清空。')) {
      Storage.save(Storage.defaultProject());
      loadProjectInfo();
      Characters.render();
      Outline.render();
      Chapters.render();
      document.getElementById('chapter-editor').value = '';
      Writing.updateWordCount();
    }
  });

  // ===== 导入项目 =====
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('file-import').click();
  });

  document.getElementById('file-import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Storage.importJSON(file)
      .then((project) => {
        loadProjectInfo();
        Characters.render();
        Outline.render();
        Chapters.render();
        alert('导入成功！');
      })
      .catch((err) => {
        alert('导入失败：' + err.message);
      });

    e.target.value = '';
  });

  // ===== 异步刷新项目数据 =====
  async function refreshFromServer() {
    try {
      const project = await DataStore.load();
      localStorage.setItem(Storage.STORAGE_KEY, JSON.stringify(project));
      loadProjectInfo();
      Characters.render();
      Outline.render();
      Chapters.render();
      AgentsConfig.render();
    } catch (e) {
      console.warn('Server refresh failed, using local cache:', e);
    }
  }

  // ===== 初始化 =====
  loadProjectInfo();
  Characters.render();
  Outline.render();
  Chapters.render();
  AgentsConfig.render();
  Writing.init();
  Export.init();
  Search.init();
  Backups.init();

  // 从服务器加载数据
  refreshFromServer();

  // 每 30 秒自动同步
  setInterval(refreshFromServer, 30000);
});
