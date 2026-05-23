// ===== 角色管理模块 =====
const Characters = {
  render() {
    const project = Storage.load();
    const container = document.getElementById('characters-list');

    if (project.characters.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎭</div>
          <p>还没有角色，点击"添加角色"开始创建</p>
        </div>`;
      return;
    }

    container.innerHTML = project.characters.map((char, i) => `
      <div class="char-card" data-index="${i}">
        <div class="char-card-header">
          <h3>${this.esc(char.name || '未命名')}</h3>
          ${char.role ? `<span class="char-role">${this.esc(char.role)}</span>` : ''}
        </div>
        <div class="char-card-body">
          ${char.appearance ? `<p><strong>外貌：</strong>${this.esc(char.appearance)}</p>` : ''}
          ${char.personality ? `<p><strong>性格：</strong>${this.esc(char.personality)}</p>` : ''}
          ${char.background ? `<p><strong>背景：</strong>${this.esc(char.background)}</p>` : ''}
          ${char.goal ? `<p><strong>目标：</strong>${this.esc(char.goal)}</p>` : ''}
          ${char.relations ? `<p><strong>关系：</strong>${this.esc(char.relations)}</p>` : ''}
        </div>
        <div class="char-card-actions">
          <button class="btn-secondary btn-sm" onclick="Characters.edit(${i})">✏️ 编辑</button>
          <button class="btn-secondary btn-sm btn-danger" onclick="Characters.remove(${i})">🗑️ 删除</button>
        </div>
      </div>
    `).join('');
  },

  add() {
    const char = {
      name: '', role: '', appearance: '', personality: '',
      background: '', goal: '', relations: ''
    };
    this.showModal(char, (saved) => {
      const project = Storage.load();
      project.characters.push(saved);
      Storage.save(project);
      this.render();
    });
  },

  edit(index) {
    const project = Storage.load();
    const char = { ...project.characters[index] };
    this.showModal(char, (saved) => {
      const project = Storage.load();
      project.characters[index] = saved;
      Storage.save(project);
      this.render();
    });
  },

  remove(index) {
    if (!confirm('确定删除这个角色？')) return;
    const project = Storage.load();
    project.characters.splice(index, 1);
    Storage.save(project);
    this.render();
  },

  showModal(char, onSave) {
    const fields = [
      { key: 'name', label: '角色名称', type: 'text', required: true },
      { key: 'role', label: '角色定位', type: 'text', placeholder: '如：主角、反派、配角' },
      { key: 'appearance', label: '外貌特征', type: 'textarea' },
      { key: 'personality', label: '性格特点', type: 'textarea' },
      { key: 'background', label: '人物背景', type: 'textarea' },
      { key: 'goal', label: '角色目标', type: 'textarea' },
      { key: 'relations', label: '人物关系', type: 'textarea' },
    ];

    const formHtml = fields.map(f => {
      const val = char[f.key] || '';
      if (f.type === 'textarea') {
        return `
          <div class="form-group">
            <label>${f.label}</label>
            <textarea id="modal-${f.key}" rows="2" placeholder="${f.placeholder || ''}">${this.esc(val)}</textarea>
          </div>`;
      }
      return `
        <div class="form-group">
          <label>${f.label}</label>
          <input type="text" id="modal-${f.key}" value="${this.esc(val)}" placeholder="${f.placeholder || ''}">
        </div>`;
    }).join('');

    document.getElementById('modal').innerHTML = `
      <h3>${char.name ? '编辑角色' : '添加角色'}</h3>
      ${formHtml}
      <div class="modal-actions">
        <button class="btn-secondary" onclick="UI.closeModal()">取消</button>
        <button class="btn-primary" id="modal-save">保存</button>
      </div>`;

    document.getElementById('modal-save').onclick = () => {
      const saved = {};
      fields.forEach(f => {
        const el = document.getElementById(`modal-${f.key}`);
        if (f.required && !el.value.trim()) {
          el.focus();
          el.style.borderColor = 'var(--danger)';
          return;
        }
        saved[f.key] = el.value.trim();
      });
      if (saved.name) {
        UI.closeModal();
        onSave(saved);
      }
    };

    UI.openModal();
  },

  esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // AI 生成角色建议
  generateAI() {
    const project = Storage.load();
    const context = this.buildPrompt(project);

    document.getElementById('modal').innerHTML = `
      <h3>🤖 AI 生成角色建议</h3>
      <p style="font-size:0.82em;color:var(--text-secondary);margin-bottom:12px;">
        根据项目信息生成角色建议，你可以复制提示词让有灵帮你生成，然后把结果粘贴回来。
      </p>
      <div class="form-group">
        <label>提示词（点击复制，发给有灵）</label>
        <textarea id="ai-prompt" rows="6" style="font-size:0.82em;">${context}</textarea>
        <button class="btn-secondary btn-sm" style="margin-top:6px;" onclick="navigator.clipboard.writeText(document.getElementById('ai-prompt').value);this.textContent='✅ 已复制';setTimeout(()=>this.textContent='📋 复制提示词',2000)">📋 复制提示词</button>
      </div>
      <div class="form-group">
        <label>有灵生成的结果（粘贴到这里，格式：每行一个角色，用 | 分隔字段）</label>
        <textarea id="ai-result" rows="6" placeholder="角色名 | 定位 | 外貌 | 性格 | 背景 | 目标 | 关系\n..."></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="UI.closeModal()">取消</button>
        <button class="btn-primary" onclick="Characters.parseAndSaveAI()">✨ 解析并添加</button>
      </div>`;

    UI.openModal();
  },

  buildPrompt(project) {
    let prompt = `请帮我为一本小说生成角色建议。\n\n`;
    prompt += `【项目信息】\n`; prompt += `标题：${project.title || '未命名'}\n`;
    if (project.genre) prompt += `类型：${project.genre}\n`;
    if (project.summary) prompt += `简介：${project.summary}\n`;
    if (project.world) prompt += `世界观：${project.world}\n`;
    prompt += `\n【已有角色】\n`;
    if (project.characters.length > 0) {
      project.characters.forEach(c => prompt += `- ${c.name}（${c.role || '未定位'}）\n`);
    } else {
      prompt += `（暂无）\n`;
    }
    prompt += `\n请生成 3-5 个角色建议，每行一个角色，格式如下：\n`;
    prompt += `角色名 | 定位 | 外貌 | 性格 | 背景 | 目标 | 关系\n\n`;
    prompt += `要求：\n`;
    prompt += `1. 角色之间有冲突和张力\n`;
    prompt += `2. 性格有鲜明差异\n`;
    prompt += `3. 目标有交叉和矛盾\n`;
    prompt += `4. 关系有复杂性和发展空间\n`;
    return prompt;
  },

  parseAndSaveAI() {
    const result = document.getElementById('ai-result').value;
    const lines = result.split('\n').filter(l => l.trim());
    let added = 0;

    lines.forEach(line => {
      const parts = line.split('|').map(s => s.trim());
      if (parts.length >= 2) {
        const project = Storage.load();
        project.characters.push({
          name: parts[0] || '未命名',
          role: parts[1] || '',
          appearance: parts[2] || '',
          personality: parts[3] || '',
          background: parts[4] || '',
          goal: parts[5] || '',
          relations: parts[6] || ''
        });
        Storage.save(project);
        added++;
      }
    });

    UI.closeModal();
    this.render();
    alert(`✅ 成功添加 ${added} 个角色`);
  }
};
