// ===== 子 Agent 配置管理 =====
const AgentsConfig = {
  // 预定义子 Agent 模板
  templates: {
    outline: {
      name: '📋 大纲师',
      desc: '负责章节大纲规划，擅长构建故事节奏',
      prompt: `你是一个资深小说大纲师。请根据以下信息，为本章生成详细大纲。

要求：
1. 列出 3-5 个关键情节节点
2. 每个节点标注冲突/悬念程度（1-5星）
3. 标注情绪曲线（紧张→放松→紧张）
4. 结尾必须留悬念或钩子
5. 考虑前后章衔接，不要孤立设计`,
      temperature: 0.7,
      topP: 0.85,
      maxTokens: 1500,
      contextKeep: 'outline', // 保留前3章大纲保证节奏连贯
      autoClear: true,
      pipeline: 'first' // 流水线第一步
    },
    writer: {
      name: '✍️ 正文写手',
      desc: '负责章节正文写作，擅长叙事和描写',
      prompt: `你是一个网文小说写手。请根据以下信息写本章正文。

写作原则：
1. 对话自然，不同角色说话节奏不同
2. 情绪用生理细节代替（"手心出汗" 代替 "他紧张"）
3. 动作描写有画面感，不要像清单
4. 结尾用动作/悬念代替感慨
5. 消灭模板化表达
6. 不要用"会/将/应该"的预测语气
7. 开头直接进入场景，不要铺垫过长

目标字数：${WORD_COUNT}`,
      temperature: 0.85,
      topP: 0.9,
      maxTokens: 4096,
      contextKeep: 'chapter', // 保留本章大纲+前1章结尾保证衔接
      autoClear: true,
      pipeline: 'second'
    },
    dialogue: {
      name: '💬 对话精修',
      desc: '专门润色对话，让角色说话各有特色',
      prompt: `你是一个对话精修师。请重写以下章节中的对话部分。

要求：
1. 每个角色说话节奏、用词习惯不同
2. 删除所有解释性对话（"你知道的..."）
3. 对话要推进情节，不要闲聊
4. 适当加入动作/神态打断对话
5. 删除"说道""说道"等标签，用动作代替
6. 让对话有潜台词，不要直白`,
      temperature: 0.9,
      topP: 0.95,
      maxTokens: 3072,
      contextKeep: 'none', // 只需要角色卡+待修文本
      autoClear: true,
      pipeline: 'third'
    },
    scene: {
      name: '🎬 场景描写',
      desc: '负责场景环境描写，营造氛围',
      prompt: `你是一个场景描写专家。请为以下情节添加/重写场景描写。

要求：
1. 用五感描写（视觉/听觉/嗅觉/触觉/味觉）
2. 环境要反映人物情绪（ pathetic fallacy）
3. 不要堆砌形容词
4. 细节要服务于情节，不要闲笔
5. 每段描写控制在 3-4 句
6. 用具体名词代替抽象描述`,
      temperature: 0.75,
      topP: 0.88,
      maxTokens: 2048,
      contextKeep: 'chapter', // 本章上下文+待写段落
      autoClear: true,
      pipeline: 'optional'
    },
    polisher: {
      name: '🔧 去 AI 味',
      desc: '消除 AI 写作痕迹，让文字更自然',
      prompt: `你是一个去 AI 味精修师。请重写以下内容，消除 AI 写作痕迹。

常见问题清单：
- 模板化开头（"话说..."）
- 过度使用比喻
- 整齐的排比句
- 说教式结尾
- "不禁""顿时""忽然"等 AI 高频词
- 过于工整的段落结构
- "仿佛/好像"开头
- 总结性段落

目标：让文字像真人写的，有呼吸感`,
      temperature: 0.4,
      topP: 0.7,
      maxTokens: 3072,
      contextKeep: 'none', // 零上下文，避免被原风格影响
      autoClear: true,
      pipeline: 'last'
    }
  },

  // 加载自定义 Agent（从项目数据）
  loadCustomAgents(project) {
    return project.customAgents || [];
  },

  // 获取所有可用 Agent
  getAllAgents(project) {
    const custom = this.loadCustomAgents(project);
    const builtins = Object.entries(this.templates).map(([key, cfg]) => ({
      id: 'builtin:' + key,
      key,
      ...cfg,
      builtin: true
    }));
    return [...builtins, ...custom];
  },

  // 构建实际发送给 API 的提示词
  buildPrompt(agent, project, chapter, extra) {
    let prompt = agent.prompt;

    // 替换变量
    prompt = prompt.replace('${WORD_COUNT}', extra.wordCount || '2000-3000');
    prompt = prompt.replace('${TITLE}', project.title || '未命名');

    // 追加项目上下文
    prompt += `\n\n【项目信息】\n小说：${project.title || '未命名'}\n`;
    if (project.genre) prompt += `类型：${project.genre}\n`;
    if (project.summary) prompt += `简介：${project.summary}\n`;
    if (project.world) prompt += `世界观：${project.world}\n`;

    // 追加角色
    if (project.characters && project.characters.length > 0) {
      prompt += `\n【相关角色】\n`;
      project.characters.forEach(c => {
        prompt += `- ${c.name}${c.role ? '（' + c.role + '）' : ''}\n`;
        if (c.personality) prompt += `  性格：${c.personality}\n`;
        if (c.appearance) prompt += `  外貌：${c.appearance}\n`;
      });
    }

    // 追加章节信息
    if (chapter) {
      prompt += `\n【本章信息】\n标题：${chapter.title}\n`;
      if (chapter.keypoints) prompt += `要点：${chapter.keypoints}\n`;
      if (chapter.style) prompt += `风格：${chapter.style}\n`;
    }

    // 追加额外内容
    if (extra.content) {
      prompt += `\n【待处理内容】\n${extra.content}\n`;
    }

    return prompt;
  },

  // 上下文管理策略
  contextPolicy: {
    // 基于滑动窗口 + 选择性保留的最佳实践
    // 核心原则：每个 Agent 只拿到它需要的上下文，减少噪声
    policies: {
      none: {
        maxHistory: 0,
        desc: '不保留历史',
        includes: [] // 零上下文
      },
      outline: {
        maxHistory: 3,
        desc: '保留前 3 章大纲',
        includes: ['projectInfo', 'characters', 'recentOutlines:3']
        // 大纲师需要：项目信息 + 角色卡 + 前3章大纲
      },
      chapter: {
        maxHistory: 2,
        desc: '保留本章大纲 + 前 1 章结尾',
        includes: ['projectInfo', 'characters', 'chapterOutline', 'previousChapterEnd:1000']
        // 写手需要：项目信息 + 角色卡 + 本章大纲 + 前章结尾（1000字以内）
      }
    },

    // 构建实际上下文（注入到 prompt 中）
    buildContext(agent, project, chapterIndex) {
      const policy = this.policies[agent.contextKeep] || this.policies.none;
      let context = '';

      if (policy.includes.includes('projectInfo')) {
        context += `【项目】${project.title || '未命名'} | ${project.genre || ''}\n`;
        if (project.summary) context += `简介：${project.summary}\n`;
        if (project.world) context += `世界观：${project.world}\n`;
      }

      if (policy.includes.includes('characters')) {
        context += '\n【角色】\n';
        project.characters.forEach(c => {
          context += `- ${c.name}${c.role ? '（' + c.role + '）' : ''}`;
          if (c.personality) context += ` | 性格：${c.personality}`;
          context += '\n';
        });
      }

      if (policy.includes.includes('recentOutlines:3') && project.outline) {
        context += '\n【前几章大纲】\n';
        const recent = project.outline.slice(-3);
        recent.forEach((o, i) => {
          context += `${i + 1}. ${o.title}${o.summary ? ': ' + o.summary : ''}\n`;
        });
      }

      if (policy.includes.includes('chapterOutline') && project.outline && project.outline[chapterIndex]) {
        const outline = project.outline[chapterIndex];
        context += `\n【本章大纲】${outline.title}\n`;
        if (outline.summary) context += outline.summary + '\n';
      }

      if (policy.includes.includes('previousChapterEnd:1000') && project.chapters && chapterIndex > 0) {
        const prev = project.chapters[chapterIndex - 1];
        if (prev && prev.content) {
          const end = prev.content.slice(-1000);
          context += `\n【前章结尾】...${end}\n`;
        }
      }

      return context;
    },

    // 计算应该保留的上下文消息数
    keepMessages(agent, messages) {
      const policy = this.policies[agent.contextKeep] || this.policies.none;
      if (policy.maxHistory === 0) return [];

      const userMessages = messages.filter(m => m.role === 'user');
      return userMessages.slice(-policy.maxHistory);
    },

    // 判断是否需要清空上下文
    shouldClear(agent, taskCompleted) {
      if (agent.autoClear && taskCompleted) return true;
      return false;
    }
  },

  // 流水线执行顺序
  pipeline: {
    order: ['outline', 'writer', 'dialogue', 'scene', 'polisher'],
    // 流水线描述：
    // 1. 大纲师：生成大纲
    // 2. 正文写手：根据大纲写正文
    // 3. 对话精修：精修正文中的对话
    // 4. 场景描写（可选）：增强场景描写
    // 5. 去 AI 味：最终精修
  },

  // UI 渲染
  render() {
    const project = Storage.load();
    const container = document.getElementById('agents-list');
    const allAgents = this.getAllAgents(project);

    if (allAgents.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🤖</div>
          <p>没有可用的 Agent</p>
        </div>`;
      return;
    }

    container.innerHTML = allAgents.map((agent, i) => `
      <div class="agent-card" data-id="${agent.id}">
        <div class="agent-card-header">
          <h3>${agent.name}</h3>
          ${agent.builtin ? '<span class="agent-badge">内置</span>' : '<span class="agent-badge custom">自定义</span>'}
        </div>
        <p class="agent-desc">${agent.desc}</p>
        <div class="agent-params">
          <span class="param-tag">🌡️ ${agent.temperature}</span>
          <span class="param-tag">📝 ${agent.maxTokens} tokens</span>
          <span class="param-tag">🧠 ${this.contextPolicy.policies[agent.contextKeep]?.desc || '无'}</span>
        </div>
        <div class="agent-prompt-preview">
          <small>提示词预览：</small>
          <pre>${this.esc(agent.prompt.substring(0, 150))}${agent.prompt.length > 150 ? '...' : ''}</pre>
        </div>
        ${!agent.builtin ? `
        <div class="agent-actions">
          <button class="btn-secondary btn-sm" onclick="AgentsConfig.editAgent(${i})">✏️ 编辑</button>
          <button class="btn-secondary btn-sm btn-danger" onclick="AgentsConfig.removeAgent(${i})">🗑️ 删除</button>
        </div>
        ` : ''}
      </div>
    `).join('');
  },

  addCustom() {
    const agent = {
      name: '', desc: '', prompt: '',
      temperature: 0.8, maxTokens: 3000,
      contextKeep: 'none', autoClear: true
    };
    this.showAgentModal(agent, (saved) => {
      const project = Storage.load();
      if (!project.customAgents) project.customAgents = [];
      saved.id = 'custom:' + Date.now();
      saved.builtin = false;
      project.customAgents.push(saved);
      Storage.save(project);
      this.render();
    });
  },

  editAgent(index) {
    const project = Storage.load();
    const agent = { ...project.customAgents[index] };
    this.showAgentModal(agent, (saved) => {
      const project = Storage.load();
      project.customAgents[index] = saved;
      Storage.save(project);
      this.render();
    });
  },

  removeAgent(index) {
    if (!confirm('确定删除这个自定义 Agent？')) return;
    const project = Storage.load();
    project.customAgents.splice(index, 1);
    Storage.save(project);
    this.render();
  },

  showAgentModal(agent, onSave) {
    document.getElementById('modal').innerHTML = `
      <h3>${agent.name ? '编辑 Agent' : '添加自定义 Agent'}</h3>
      <div class="form-group">
        <label>Agent 名称</label>
        <input type="text" id="modal-agent-name" value="${this.esc(agent.name)}" placeholder="如：📖 对话精修师">
      </div>
      <div class="form-group">
        <label>描述</label>
        <input type="text" id="modal-agent-desc" value="${this.esc(agent.desc || '')}" placeholder="这个 Agent 负责什么">
      </div>
      <div class="form-group">
        <label>提示词模板</label>
        <textarea id="modal-agent-prompt" rows="6" placeholder="系统提示词，可以使用 ${WORD_COUNT} 等变量">${this.esc(agent.prompt || '')}</textarea>
      </div>
      <div class="form-group">
        <label>Temperature (创造力)</label>
        <input type="range" id="modal-agent-temp" min="0" max="1.5" step="0.1" value="${agent.temperature || 0.8}">
        <span id="temp-value">${agent.temperature || 0.8}</span>
      </div>
      <div class="form-group">
        <label>最大 Token 数</label>
        <input type="number" id="modal-agent-max" value="${agent.maxTokens || 3000}">
      </div>
      <div class="form-group">
        <label>上下文保留策略</label>
        <select id="modal-agent-context">
          <option value="none" ${agent.contextKeep === 'none' ? 'selected' : ''}>不保留（每次清空）</option>
          <option value="outline" ${agent.contextKeep === 'outline' ? 'selected' : ''}>保留大纲历史</option>
          <option value="chapter" ${agent.contextKeep === 'chapter' ? 'selected' : ''}>保留本章上下文</option>
        </select>
      </div>
      <div class="form-group">
        <label><input type="checkbox" id="modal-agent-clear" ${agent.autoClear !== false ? 'checked' : ''}> 任务完成后自动清空上下文</label>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="UI.closeModal()">取消</button>
        <button class="btn-primary" id="modal-save">保存</button>
      </div>`;

    // Temperature 滑块实时更新
    document.getElementById('modal-agent-temp').addEventListener('input', (e) => {
      document.getElementById('temp-value').textContent = e.target.value;
    });

    document.getElementById('modal-save').onclick = () => {
      const saved = {
        name: document.getElementById('modal-agent-name').value.trim(),
        desc: document.getElementById('modal-agent-desc').value.trim(),
        prompt: document.getElementById('modal-agent-prompt').value,
        temperature: parseFloat(document.getElementById('modal-agent-temp').value),
        maxTokens: parseInt(document.getElementById('modal-agent-max').value),
        contextKeep: document.getElementById('modal-agent-context').value,
        autoClear: document.getElementById('modal-agent-clear').checked
      };
      if (!saved.name) {
        alert('请输入 Agent 名称');
        return;
      }
      UI.closeModal();
      onSave(saved);
    };

    UI.openModal();
  },

  esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
