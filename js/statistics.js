// ===== 写作统计模块 =====
// 提供项目概览、字数统计、写作速度追踪、目标完成率

const Statistics = {
  HISTORY_KEY: 'novel_stats_history',
  GOAL_KEY: 'novel_stats_daily_goal',

  // 每日字数历史记录，格式: { '2026-05-24': { words: 3200, chapters: 1 } }
  loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(this.HISTORY_KEY)) || {};
    } catch { return {}; }
  },

  saveHistory(history) {
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
  },

  // 记录当日写作数据
  recordToday() {
    const project = Storage.load();
    const today = new Date().toISOString().slice(0, 10);
    const history = this.loadHistory();

    const totalWords = project.chapters.reduce(
      (sum, ch) => sum + Chapters.countWords(ch.content || ''), 0
    );
    const completedChapters = project.chapters.filter(ch => ch.content && Chapters.countWords(ch.content) > 0).length;

    history[today] = {
      words: totalWords,
      chapters: completedChapters,
      timestamp: Date.now()
    };
    this.saveHistory(history);
    return history[today];
  },

  // 计算当日新增字数
  getTodayDelta() {
    const history = this.loadHistory();
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const todayWords = history[today]?.words || 0;
    const yesterdayWords = history[yesterday]?.words || 0;

    return Math.max(0, todayWords - yesterdayWords);
  },

  // 获取连续写作天数（连续有新增字数的天数）
  getWritingStreak() {
    const history = this.loadHistory();
    if (Object.keys(history).length < 2) return 0;

    const dates = Object.keys(history).sort().reverse();
    let streak = 0;
    let prevDate = null;

    for (const dateStr of dates) {
      const current = new Date(dateStr);
      if (prevDate) {
        const diffDays = Math.round((prevDate - current) / 86400000);
        if (diffDays <= 1) {
          // 检查当日是否有新增字数
          const prevEntry = history[dates[dates.indexOf(dateStr) - 1]];
          const currEntry = history[dateStr];
          if (currEntry && prevEntry && currEntry.words > prevEntry.words) {
            streak++;
          }
        } else {
          break;
        }
      }
      prevDate = current;
    }
    return streak;
  },

  // 获取最近 N 天的趋势数据
  getTrendDays(days = 7) {
    const history = this.loadHistory();
    const trend = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000);
      const dateStr = date.toISOString().slice(0, 10);
      const entry = history[dateStr];

      trend.push({
        date: dateStr.slice(5), // MM-DD
        words: entry?.words || 0,
        delta: this.getDayDelta(dateStr, history)
      });
    }
    return trend;
  },

  // 计算单日新增字数
  getDayDelta(dateStr, history) {
    const entry = history[dateStr];
    if (!entry) return 0;

    // 向前找最近一个有记录的日期
    let prevDate = null;
    const dates = Object.keys(history).sort();
    const idx = dates.indexOf(dateStr);
    if (idx > 0) {
      prevDate = dates[idx - 1];
    }

    if (prevDate) {
      const prevEntry = history[prevDate];
      return Math.max(0, entry.words - prevEntry.words);
    }
    return entry.words;
  },

  // 获取每日目标
  getDailyGoal() {
    try {
      return parseInt(localStorage.getItem(this.GOAL_KEY)) || 0;
    } catch { return 0; }
  },

  // 设置每日目标
  setDailyGoal(goal) {
    localStorage.setItem(this.GOAL_KEY, String(goal));
  },

  // 计算完整统计
  calcStats() {
    const project = Storage.load();
    const totalWords = project.chapters.reduce(
      (sum, ch) => sum + Chapters.countWords(ch.content || ''), 0
    );
    const totalGoal = project.chapters.reduce(
      (sum, ch) => sum + (ch.wordGoal || 0), 0
    );
    const completedChapters = project.chapters.filter(
      ch => ch.content && Chapters.countWords(ch.content) > 0
    ).length;
    const totalChapters = project.chapters.length;

    // 平均每章字数
    const avgWords = completedChapters > 0
      ? Math.round(totalWords / completedChapters)
      : 0;

    // 目标完成率
    const goalPct = totalGoal > 0
      ? Math.round(totalWords / totalGoal * 100)
      : null;

    // 项目年龄（天）
    const created = project.createdAt || Date.now();
    const daysSinceCreation = Math.max(1, Math.round((Date.now() - created) / 86400000));

    // 日均字数
    const avgDaily = Math.round(totalWords / daysSinceCreation);

    // 预估剩余字数
    const remainingWords = Math.max(0, totalGoal - totalWords);

    // 按当前速度预估完成天数
    const estimatedDays = avgDaily > 0 && remainingWords > 0
      ? Math.ceil(remainingWords / avgDaily)
      : null;

    // 角色统计
    const totalChars = project.characters?.length || 0;

    // 大纲统计
    const totalOutline = project.outline?.length || 0;

    // 最近7天趋势
    const trend = this.getTrendDays(7);

    return {
      totalWords,
      totalGoal,
      goalPct,
      completedChapters,
      totalChapters,
      avgWords,
      avgDaily,
      daysSinceCreation,
      remainingWords,
      estimatedDays,
      totalChars,
      totalOutline,
      todayDelta: this.getTodayDelta(),
      dailyGoal: this.getDailyGoal(),
      trend,
      streak: this.getWritingStreak()
    };
  },

  // 渲染统计面板
  render() {
    const stats = this.calcStats();
    const container = document.getElementById('statistics-container');

    // 计算最大字数用于趋势图比例
    const maxDelta = Math.max(1, ...stats.trend.map(d => d.delta || 0));

    container.innerHTML = `
      <div class="stats-grid">
        <!-- 核心指标 -->
        <div class="stat-card stat-primary">
          <div class="stat-label">总字数</div>
          <div class="stat-value">${stats.totalWords.toLocaleString()}</div>
          <div class="stat-sub">日均 ${stats.avgDaily.toLocaleString()} 字</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">章节</div>
          <div class="stat-value">${stats.completedChapters}<span class="stat-slash">/</span>${stats.totalChapters}</div>
          <div class="stat-sub">已完成 / 总计</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">角色</div>
          <div class="stat-value">${stats.totalChars}</div>
          <div class="stat-sub">大纲节点 ${stats.totalOutline}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">今日新增</div>
          <div class="stat-value">${stats.todayDelta.toLocaleString()}</div>
          ${stats.dailyGoal > 0
            ? `<div class="stat-sub ${stats.todayDelta >= stats.dailyGoal ? 'goal-met' : ''}">目标 ${stats.dailyGoal.toLocaleString()} 字 ${stats.todayDelta >= stats.dailyGoal ? '✅' : '⏳'}</div>`
            : '<div class="stat-sub">尚未设定目标</div>'
          }
        </div>
      </div>

      <!-- 目标进度条 -->
      ${stats.totalGoal > 0 ? `
      <div class="stats-section">
        <h3 class="stats-section-title">🎯 字数目标进度</h3>
        <div class="goal-progress-container">
          <div class="goal-progress-info">
            <span>${stats.totalWords.toLocaleString()} / ${stats.totalGoal.toLocaleString()} 字</span>
            <span>${stats.goalPct}%</span>
          </div>
          <div class="goal-progress-bar">
            <div class="goal-progress-fill" style="width:${Math.min(stats.goalPct, 100)}%"></div>
          </div>
          ${stats.remainingWords > 0 ? `
            <div class="goal-remaining">
              剩余 ${stats.remainingWords.toLocaleString()} 字
              ${stats.estimatedDays ? ` · 按当前速度约 ${stats.estimatedDays} 天完成` : ''}
            </div>
          ` : ''}
        </div>
      </div>
      ` : ''}

      <!-- 写作趋势图 -->
      <div class="stats-section">
        <h3 class="stats-section-title">📈 近7日写作趋势</h3>
        <div class="trend-chart">
          ${stats.trend.map(d => `
            <div class="trend-bar-wrapper">
              <div class="trend-value">${d.delta > 0 ? d.delta.toLocaleString() : ''}</div>
              <div class="trend-bar" style="height:${d.delta > 0 ? Math.max(4, (d.delta / maxDelta) * 100) : 0}%"></div>
              <div class="trend-date">${d.date}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 写作连续天数 -->
      <div class="stats-section">
        <h3 class="stats-section-title">🔥 连续写作</h3>
        <div class="streak-display">
          <div class="streak-number">${stats.streak}</div>
          <div class="streak-label">天</div>
          ${stats.streak >= 3 ? '<div class="streak-badge">🔥 保持住！</div>' : ''}
          ${stats.streak >= 7 ? '<div class="streak-badge">🌟 一周达人！</div>' : ''}
          ${stats.streak >= 30 ? '<div class="streak-badge">⭐ 月度坚持！</div>' : ''}
        </div>
      </div>

      <!-- 每日目标设置 -->
      <div class="stats-section">
        <h3 class="stats-section-title">⚙️ 每日写作目标</h3>
        <div class="daily-goal-setter">
          <input type="number" id="daily-goal-input" value="${stats.dailyGoal || ''}"
            placeholder="输入每日目标字数" min="0" step="100">
          <button class="btn-primary" onclick="Statistics.saveDailyGoal()">保存目标</button>
          ${stats.dailyGoal > 0 ? `
            <button class="btn-secondary" onclick="Statistics.clearDailyGoal()">清除目标</button>
          ` : ''}
        </div>
      </div>

      <!-- 项目信息 -->
      <div class="stats-section">
        <h3 class="stats-section-title">📊 项目概览</h3>
        <div class="project-overview">
          <div class="overview-item">
            <span class="overview-label">项目运行</span>
            <span class="overview-value">${stats.daysSinceCreation} 天</span>
          </div>
          <div class="overview-item">
            <span class="overview-label">平均每章</span>
            <span class="overview-value">${stats.avgWords.toLocaleString()} 字</span>
          </div>
          <div class="overview-item">
            <span class="overview-label">日均产出</span>
            <span class="overview-value">${stats.avgDaily.toLocaleString()} 字/天</span>
          </div>
        </div>
      </div>
    `;
  },

  // 保存每日目标
  saveDailyGoal() {
    const input = document.getElementById('daily-goal-input');
    const goal = parseInt(input.value);
    if (goal > 0) {
      this.setDailyGoal(goal);
      this.render();
    }
  },

  // 清除每日目标
  clearDailyGoal() {
    this.setDailyGoal(0);
    this.render();
  },

  // 初始化
  init() {
    // 进入统计 Tab 时自动记录
    const observer = new MutationObserver(() => {
      const tab = document.getElementById('tab-statistics');
      if (tab && tab.classList.contains('active')) {
        this.recordToday();
        this.render();
      }
    });

    // 监听 tab-content 变化
    document.addEventListener('DOMContentLoaded', () => {
      const tab = document.getElementById('tab-statistics');
      if (tab) {
        observer.observe(tab, { attributes: true, attributeFilter: ['class'] });
      }
    });
  }
};
