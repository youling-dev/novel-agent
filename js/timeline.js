// ===== 时间线模块 =====
// 追踪小说中的关键事件，按时间顺序排列，保持剧情连贯性

const Timeline = {
  // 事件类型配置
  eventTypes: {
    plot:      { label: '📖 剧情',   color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    conflict:  { label: '⚔️ 冲突',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    discovery: { label: '💡 发现',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    emotion:   { label: '💜 情感',   color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
    world:     { label: '🌍 世界',   color: '#14b8a6', bg: 'rgba(20,184,166,0.12)' },
    other:     { label: '📌 其他',   color: '#6b7280', bg: 'rgba(107,114,128,0.12)' }
  },

  // 时间阶段配置
  timePhases: {
    prologue:  { label: '🌅 序幕',   order: 0 },
    early:     { label: '🌱 初期',   order: 1 },
    middle:    { label: '🔥 中期',   order: 2 },
    late:      { label: '🍂 后期',   order: 3 },
    climax:    { label: '💥 高潮',   order: 4 },
    ending:    { label: '🌟 结局',   order: 5 },
    unspecified: { label: '❓ 未定', order: 6 }
  },

  // 渲染时间线页面
  render(filter) {
    const project = Storage.load();
    const container = document.getElementById('timeline-list');
    if (!container) return;

    if (!Array.isArray(project.timeline)) project.timeline = [];

    const activeFilter = filter || this._getSavedFilter();
    let events = [...project.timeline];

    // 按时间阶段排序
    events.sort((a, b) => {
      const orderA = this.timePhases[a.phase]?.order ?? 6;
      const orderB = this.timePhases[b.phase]?.order ?? 6;
      if (orderA !== orderB) return orderA - orderB;
      return (a.sequence || 0) - (b.sequence || 0);
    });

    // 应用过滤器
    if (activeFilter && activeFilter !== 'all') {
      events = events.filter(e => e.type === activeFilter);
    }

    container.innerHTML = `
      <div class="timeline-toolbar">
        <div class="timeline-filters">
          <button class="filter-btn ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">全部</button>
          ${Object.entries(this.eventTypes).map(([key, val]) => `
            <button class="filter-btn ${activeFilter === key ? 'active' : ''}" data-filter="${key}"
                    style="${activeFilter === key ? 'background:' + val.bg + ';color:' + val.color + ';border-color:' + val.color : ''}">
              ${val.label}
            </button>
          `).join('')}
        </div>
        <div class="timeline-actions">
          <span class="timeline-count">${events.length} 个事件</span>
          <button id="btn-add-event" class="btn-primary">+ 添加事件</button>
        </div>
      </div>
      <div class="timeline-container">
        ${events.length === 0 ? this._emptyState(activeFilter) : this._renderEvents(events)}
      </div>
    `;

    // 绑定事件
    document.getElementById('btn-add-event').addEventListener('click', () => this.addEvent());
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const f = btn.dataset.filter;
        localStorage.setItem('novel-agent-timeline-filter', f);
        this.render(f);
      });
    });

    // 绑定卡片操作
    document.querySelectorAll('.timeline-event').forEach(card => {
      const id = card.dataset.eventId;
      card.querySelector('.event-edit').addEventListener('click', () => this.editEvent(id));
      card.querySelector('.event-delete').addEventListener('click', () => this.deleteEvent(id));
    });
  },

  // 渲染事件列表
  _renderEvents(events) {
    if (!events.length) return this._emptyState();

    let lastPhase = null;
    return events.map((ev, idx) => {
      const typeCfg = this.eventTypes[ev.type] || this.eventTypes.other;
      const phaseCfg = this.timePhases[ev.phase] || this.timePhases.unspecified;
      const phaseChanged = lastPhase !== ev.phase;
      lastPhase = ev.phase;

      return `
        <div class="timeline-event" data-event-id="${ev.id}">
          ${phaseChanged ? `<div class="timeline-phase-label">${phaseCfg.label}</div>` : ''}
          <div class="event-card" style="--event-color: ${typeCfg.color}; --event-bg: ${typeCfg.bg}">
            <div class="event-header">
              <span class="event-type-badge" style="background:var(--event-bg);color:var(--event-color);">
                ${typeCfg.label}
              </span>
              <span class="event-phase-tag">${phaseCfg.label}</span>
              ${ev.chapterRef ? `<span class="event-chapter-ref">📖 ${ev.chapterRef}</span>` : ''}
            </div>
            <div class="event-title">${ev.title || '无标题事件'}</div>
            <div class="event-description">${ev.description || ''}</div>
            ${ev.location ? `<div class="event-meta"><span class="meta-item">📍 ${ev.location}</span></div>` : ''}
            ${ev.characters && ev.characters.length ? `<div class="event-meta"><span class="meta-item">🎭 ${ev.characters.join('、')}</span></div>` : ''}
            ${ev.notes ? `<div class="event-notes">${ev.notes}</div>` : ''}
            <div class="event-actions">
              <button class="event-edit btn-icon" title="编辑">✏️</button>
              <button class="event-delete btn-icon" title="删除">🗑️</button>
              <div class="event-move">
                <button class="btn-icon event-move-up" title="上移">⬆️</button>
                <button class="btn-icon event-move-down" title="下移">⬇️</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  // 绑定移动事件
  _bindMoveButtons(events) {
    document.querySelectorAll('.event-move-up').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        const project = Storage.load();
        const temp = project.timeline[i];
        project.timeline[i] = project.timeline[i - 1];
        project.timeline[i - 1] = temp;
        Storage.save(project);
        this.render(this._getSavedFilter());
        Toast.show('已上移');
      });
    });
    document.querySelectorAll('.event-move-down').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        const project = Storage.load();
        const temp = project.timeline[i];
        project.timeline[i] = project.timeline[i + 1];
        project.timeline[i + 1] = temp;
        Storage.save(project);
        this.render(this._getSavedFilter());
        Toast.show('已下移');
      });
    });
  },

  // 添加事件
  addEvent(editId) {
    const project = Storage.load();
    const event = editId ? (project.timeline || []).find(e => e.id === editId) : null;

    const typeOptions = Object.entries(this.eventTypes).map(([key, val]) =>
      `<option value="${key}" ${event?.type === key ? 'selected' : ''}>${val.label}</option>`
    ).join('');

    const phaseOptions = Object.entries(this.timePhases).map(([key, val]) =>
      `<option value="${key}" ${event?.phase === key ? 'selected' : ''}>${val.label}</option>`
    ).join('');

    const chapters = (project.chapters || []).map(c => c.title).filter(Boolean);
    const chapterOptions = chapters.map(t => `<option value="${t}" ${event?.chapterRef === t ? 'selected' : ''}>${t}</option>`).join('');

    document.getElementById('modal').innerHTML = `
      <h3>${event ? '✏️ 编辑事件' : '⏱️ 添加事件'}</h3>
      <div class="form-group">
        <label>事件标题</label>
        <input type="text" id="event-title" placeholder="如：主角获得系统" value="${event?.title || ''}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>事件类型</label>
          <select id="event-type">${typeOptions}</select>
        </div>
        <div class="form-group">
          <label>时间阶段</label>
          <select id="event-phase">${phaseOptions}</select>
        </div>
      </div>
      <div class="form-group">
        <label>事件描述</label>
        <textarea id="event-description" rows="3" placeholder="描述这个事件发生了什么…">${event?.description || ''}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>发生地点</label>
          <input type="text" id="event-location" placeholder="如：安全屋、废墟城市" value="${event?.location || ''}">
        </div>
        <div class="form-group">
          <label>关联章节</label>
          <select id="event-chapter">
            <option value="">不关联</option>
            ${chapterOptions}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>涉及角色（逗号分隔）</label>
        <input type="text" id="event-characters" placeholder="如：裴萌,晓茜" value="${event?.characters?.join(',') || ''}">
      </div>
      <div class="form-group">
        <label>备注</label>
        <textarea id="event-notes" rows="2" placeholder="伏笔、前后呼应提示等…">${event?.notes || ''}</textarea>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="UI.closeModal()">取消</button>
        <button class="btn-primary" onclick="Timeline.saveEvent('${editId || ''}')">${event ? '💾 保存' : '✨ 添加'}</button>
      </div>
    `;

    UI.openModal();
    document.getElementById('event-title').focus();
  },

  // 编辑事件（别名）
  editEvent(id) {
    this.addEvent(id);
  },

  // 保存事件
  saveEvent(editId) {
    const project = Storage.load();
    if (!Array.isArray(project.timeline)) project.timeline = [];

    const title = document.getElementById('event-title').value.trim();
    if (!title) {
      alert('请输入事件标题');
      return;
    }

    const charactersRaw = document.getElementById('event-characters').value.trim();
    const characters = charactersRaw ? charactersRaw.split(/[,，、]/).map(s => s.trim()).filter(Boolean) : [];

    if (editId) {
      // 更新现有事件
      const idx = project.timeline.findIndex(e => e.id === editId);
      if (idx !== -1) {
        project.timeline[idx] = {
          ...project.timeline[idx],
          title,
          type: document.getElementById('event-type').value,
          phase: document.getElementById('event-phase').value,
          description: document.getElementById('event-description').value.trim(),
          location: document.getElementById('event-location').value.trim(),
          chapterRef: document.getElementById('event-chapter').value,
          characters,
          notes: document.getElementById('event-notes').value.trim()
        };
        Toast.show('事件已更新');
      }
    } else {
      // 添加新事件
      project.timeline.push({
        id: 'ev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        title,
        type: document.getElementById('event-type').value,
        phase: document.getElementById('event-phase').value,
        description: document.getElementById('event-description').value.trim(),
        location: document.getElementById('event-location').value.trim(),
        chapterRef: document.getElementById('event-chapter').value,
        characters,
        notes: document.getElementById('event-notes').value.trim(),
        createdAt: Date.now()
      });
      Toast.show('事件已添加');
    }

    Storage.save(project);
    UI.closeModal();
    this.render(this._getSavedFilter());
  },

  // 删除事件
  deleteEvent(id) {
    if (!confirm('确定删除这个事件？')) return;
    const project = Storage.load();
    project.timeline = (project.timeline || []).filter(e => e.id !== id);
    Storage.save(project);
    this.render(this._getSavedFilter());
    Toast.show('事件已删除');
  },

  // 获取保存的过滤器
  _getSavedFilter() {
    return localStorage.getItem('novel-agent-timeline-filter') || 'all';
  },

  // 空状态
  _emptyState(filter) {
    const isFiltered = filter && filter !== 'all';
    return `
      <div class="timeline-empty">
        <div style="font-size:2.5em;margin-bottom:12px;">⏱️</div>
        <p>${isFiltered ? '当前筛选下没有事件' : '时间线还没有事件'}</p>
        <p style="font-size:0.85em;color:var(--text-secondary);margin-top:4px;">
          ${isFiltered ? '试试其他筛选条件' : '添加第一个事件来追踪你的故事线'}
        </p>
      </div>
    `;
  }
};
