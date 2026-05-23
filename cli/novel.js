#!/usr/bin/env node
// ===== 有灵 · 小说 CLI 工具 v2 =====
// 用法: node novel.js <命令> [参数]
// 子 Agent 架构：大纲师 → 正文写手 → 对话精修 → 场景描写 → 去 AI 味

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'projects');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function projectPath(name) {
  if (!name) {
    // 默认项目：取第一个或 default
    ensureDir();
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    if (files.length === 0) return path.join(DATA_DIR, 'default.json');
    const first = files[0].replace('.json', '');
    return path.join(DATA_DIR, files[0]);
  }
  return path.join(DATA_DIR, `${name}.json`);
}

function loadProject(name) {
  ensureDir();
  const p = projectPath(name);
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  return createProject(name || 'default');
}

function createProject(name) {
  name = name || 'default';
  const project = {
    title: '', genre: '', summary: '', world: '',
    characters: [], outline: [], chapters: [],
    customAgents: [],
    createdAt: Date.now(), updatedAt: Date.now()
  };
  saveProject(project, name);
  console.log(`✅ 项目已创建: ${name}`);
  return project;
}

function saveProject(project, name) {
  ensureDir();
  project.updatedAt = Date.now();
  const p = name ? path.join(DATA_DIR, `${name}.json`) : projectPath(null);
  fs.writeFileSync(p, JSON.stringify(project, null, 2), 'utf8');
}

// ===== 内置子 Agent 配置 =====
const BUILTIN_AGENTS = {
  outline: { name: '📋 大纲师', temp: 0.7, topP: 0.85, maxTokens: 1500, contextKeep: 'outline', pipeline: '1' },
  writer: { name: '✍️ 正文写手', temp: 0.85, topP: 0.9, maxTokens: 4096, contextKeep: 'chapter', pipeline: '2' },
  dialogue: { name: '💬 对话精修', temp: 0.9, topP: 0.95, maxTokens: 3072, contextKeep: 'none', pipeline: '3' },
  scene: { name: '🎬 场景描写', temp: 0.75, topP: 0.88, maxTokens: 2048, contextKeep: 'chapter', pipeline: '4' },
  polisher: { name: '🔧 去 AI 味', temp: 0.4, topP: 0.7, maxTokens: 3072, contextKeep: 'none', pipeline: '5' }
};

// ===== 命令处理 =====
const [, , cmd, ...args] = process.argv;

switch (cmd) {
  // ===== 项目 =====
  case 'init':
    createProject(args[0]);
    break;

  case 'list':
  case 'ls': {
    ensureDir();
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    if (files.length === 0) { console.log('暂无项目'); break; }
    console.log('\n📚 项目列表：');
    files.forEach(f => {
      const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
      const words = data.chapters.reduce((s, c) => s + (c.content || '').replace(/\s/g, '').length, 0);
      const date = new Date(data.updatedAt).toLocaleString('zh-CN');
      console.log(`  ${data.title || path.basename(f, '.json')} | ${data.chapters.length}章 | ${words.toLocaleString()}字 | 更新: ${date}`);
    });
    console.log('');
    break;
  }

  case 'info': {
    const p = loadProject(args[0]);
    const words = p.chapters.reduce((s, c) => s + (c.content || '').replace(/\s/g, '').length, 0);
    console.log(`\n📖 ${p.title || '未命名'}`);
    console.log(`   类型: ${p.genre || '-'}`);
    console.log(`   简介: ${p.summary || '-'}`);
    console.log(`   角色: ${p.characters.length} 个`);
    console.log(`   大纲: ${p.outline.length} 章`);
    console.log(`   章节: ${p.chapters.length} 章`);
    console.log(`   总字数: ${words.toLocaleString()}`);
    console.log(`   自定义 Agent: ${p.customAgents?.length || 0} 个`);
    console.log('');
    break;
  }

  case 'set': {
    const p = loadProject(args[0]);
    const field = args[1];
    const value = args.slice(2).join(' ');
    if (['title', 'genre', 'summary', 'world'].includes(field)) {
      p[field] = value;
      saveProject(p, args[0]);
      console.log(`✅ ${field} = "${value.substring(0, 60)}${value.length > 60 ? '...' : ''}"`);
    } else {
      console.error('❌ 字段不存在: title, genre, summary, world');
    }
    break;
  }

  // ===== 角色 =====
  case 'char':
  case 'character':
    if (args[0] === 'add' || args[0] === 'a') {
      const p = loadProject(args[1]);
      p.characters.push({ name: args[2], role: args[3] || '', appearance: '', personality: '', background: '', goal: '', relations: '' });
      saveProject(p, args[1]);
      console.log(`✅ 角色已添加: ${args[2]}${args[3] ? ' (' + args[3] + ')' : ''}`);
    } else if (args[0] === 'set') {
      const p = loadProject(args[1]);
      const char = p.characters.find(c => c.name === args[2]);
      if (char && char[args[3]] !== undefined) {
        char[args[3]] = args.slice(4).join(' ');
        saveProject(p, args[1]);
        console.log(`✅ ${args[2]}.${args[3]} 已更新`);
      } else { console.error('❌ 角色或字段不存在'); }
    } else if (args[0] === 'rm' || args[0] === 'remove') {
      const p = loadProject(args[1]);
      const idx = parseInt(args[2]) - 1;
      if (p.characters[idx]) {
        const r = p.characters.splice(idx, 1);
        saveProject(p, args[1]);
        console.log(`✅ 已删除: ${r[0].name}`);
      }
    } else if (args[0] === 'show') {
      const p = loadProject(args[1]);
      const idx = parseInt(args[2]) - 1;
      if (p.characters[idx]) {
        const c = p.characters[idx];
        console.log(`\n${c.name}${c.role ? ' (' + c.role + ')' : ''}`);
        if (c.appearance) console.log(`  外貌: ${c.appearance}`);
        if (c.personality) console.log(`  性格: ${c.personality}`);
        if (c.background) console.log(`  背景: ${c.background}`);
        if (c.goal) console.log(`  目标: ${c.goal}`);
        if (c.relations) console.log(`  关系: ${c.relations}`);
        console.log('');
      }
    } else {
      const p = loadProject(args[0]);
      p.characters.forEach((c, i) => console.log(`${i + 1}. ${c.name}${c.role ? ' (' + c.role + ')' : ''}`));
    }
    break;

  // ===== 大纲 =====
  case 'outline':
    if (args[0] === 'add' || args[0] === 'a') {
      const p = loadProject(args[1]);
      p.outline.push({ title: args[2], summary: args.slice(3).join(' ') });
      saveProject(p, args[1]);
      console.log(`✅ 大纲已添加: ${args[2]}`);
    } else if (args[0] === 'rm') {
      const p = loadProject(args[1]);
      p.outline.splice(parseInt(args[2]) - 1, 1);
      saveProject(p, args[1]);
      console.log('✅ 大纲已删除');
    } else {
      const p = loadProject(args[0]);
      p.outline.forEach((o, i) => {
        console.log(`${i + 1}. ${o.title}`);
        if (o.summary) console.log(`   ${o.summary.substring(0, 80)}${o.summary.length > 80 ? '...' : ''}`);
      });
    }
    break;

  // ===== 章节 =====
  case 'ch':
  case 'chapter':
    if (args[0] === 'add' || args[0] === 'a') {
      const p = loadProject(args[1]);
      p.chapters.push({ title: args[2] || `第${p.chapters.length + 1}章`, content: '', keypoints: '', style: '' });
      saveProject(p, args[1]);
      console.log(`✅ 章节已添加: ${args[2] || '第' + p.chapters.length + '章'}`);
    } else if (args[0] === 'write') {
      const p = loadProject(args[1]);
      const idx = parseInt(args[2]) - 1;
      if (p.chapters[idx]) {
        p.chapters[idx].content = args.slice(3).join(' ');
        saveProject(p, args[1]);
        console.log(`✅ 已写入 ${p.chapters[idx].title}，${p.chapters[idx].content.replace(/\s/g, '').length} 字`);
      }
    } else if (args[0] === 'append') {
      const p = loadProject(args[1]);
      const idx = parseInt(args[2]) - 1;
      if (p.chapters[idx]) {
        p.chapters[idx].content += '\n\n' + args.slice(3).join(' ');
        saveProject(p, args[1]);
        console.log(`✅ 已追加，总计 ${p.chapters[idx].content.replace(/\s/g, '').length} 字`);
      }
    } else if (args[0] === 'read' || args[0] === 'get') {
      const p = loadProject(args[1]);
      const idx = parseInt(args[2]) - 1;
      if (p.chapters[idx]) {
        console.log(`\n📝 ${p.chapters[idx].title}`);
        console.log('─'.repeat(50));
        console.log(p.chapters[idx].content || '(空白)');
        console.log('─'.repeat(50));
        console.log(`字数: ${p.chapters[idx].content.replace(/\s/g, '').length}`);
        console.log('');
      }
    } else if (args[0] === 'set') {
      const p = loadProject(args[1]);
      const idx = parseInt(args[2]) - 1;
      if (p.chapters[idx]) {
        p.chapters[idx][args[3]] = args.slice(4).join(' ');
        saveProject(p, args[1]);
        console.log(`✅ ${p.chapters[idx].title}.${args[3]} 已更新`);
      }
    } else if (args[0] === 'rm') {
      const p = loadProject(args[1]);
      const idx = parseInt(args[2]) - 1;
      const r = p.chapters.splice(idx, 1);
      saveProject(p, args[1]);
      console.log(`✅ 已删除: ${r[0]?.title}`);
    } else if (args[0] === 'stats') {
      const p = loadProject(args[1]);
      let total = 0;
      p.chapters.forEach((c, i) => {
        const w = (c.content || '').replace(/\s/g, '').length;
        total += w;
        console.log(`  ${i + 1}. ${c.title} - ${w.toLocaleString()} 字`);
      });
      console.log(`  总计: ${total.toLocaleString()} 字`);
    } else {
      const p = loadProject(args[0]);
      p.chapters.forEach((c, i) => {
        const w = (c.content || '').replace(/\s/g, '').length;
        console.log(`${i + 1}. ${c.title} (${w} 字)`);
      });
      const total = p.chapters.reduce((s, c) => s + (c.content || '').replace(/\s/g, '').length, 0);
      console.log(`\n总计: ${total.toLocaleString()} 字`);
    }
    break;

  // ===== 子 Agent =====
  case 'agent':
  case 'agents':
    if (args[0] === 'list' || args[0] === 'ls' || !args[0]) {
      console.log('\n🤖 内置子 Agent：');
      Object.entries(BUILTIN_AGENTS).forEach(([key, a]) => {
        const ctx = a.contextKeep === 'none' ? '无' : a.contextKeep === 'outline' ? '大纲历史' : '本章上下文';
        console.log(`  ${a.name} | temp:${a.temp} topP:${a.topP} max:${a.maxTokens} 上下文:${ctx}`);
      });
      const p = loadProject(args[0] === 'list' || args[0] === 'ls' ? undefined : undefined);
      if (p.customAgents?.length > 0) {
        console.log('\n自定义 Agent：');
        p.customAgents.forEach((a, i) => console.log(`  ${a.name} | temp:${a.temperature} max:${a.maxTokens}`));
      }
      console.log('');
    } else if (args[0] === 'add') {
      const p = loadProject(args[1]);
      if (!p.customAgents) p.customAgents = [];
      p.customAgents.push({
        name: args[2], desc: args[3] || '', prompt: '',
        temperature: parseFloat(args[4]) || 0.8, maxTokens: parseInt(args[5]) || 3072,
        contextKeep: 'none', autoClear: true
      });
      saveProject(p, args[1]);
      console.log(`✅ 自定义 Agent 已添加: ${args[2]}`);
    } else if (args[0] === 'pipeline') {
      console.log('\n🔄 流水线执行顺序：');
      Object.entries(BUILTIN_AGENTS).forEach(([key, a]) => {
        console.log(`  ${a.pipeline}. ${a.name}`);
      });
      console.log('');
    }
    break;

  // ===== 导出 =====
  case 'export':
    const p3 = loadProject(args[1]);
    if (args[0] === 'txt') {
      let txt = `《${p3.title || '未命名'}》\n\n`;
      if (p3.summary) txt += `${p3.summary}\n\n`;
      p3.chapters.forEach(c => { txt += `${c.title}\n${'-'.repeat(30)}\n${c.content || '(待写)'}\n\n`; });
      const out = path.join(DATA_DIR, '..', 'exports', `${p3.title || 'novel'}.txt`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, txt, 'utf8');
      console.log(`✅ 已导出: ${out}`);
    } else if (args[0] === 'md') {
      let md = `# 《${p3.title || '未命名'}》\n\n`;
      if (p3.genre) md += `**类型：**${p3.genre}\n\n`;
      if (p3.summary) md += `> ${p3.summary}\n\n`;
      if (p3.world) md += `**世界观：** ${p3.world}\n\n---\n\n`;
      if (p3.characters.length) {
        md += '## 角色\n\n';
        p3.characters.forEach(c => {
          md += `### ${c.name}${c.role ? '（' + c.role + '）' : ''}\n`;
          if (c.personality) md += `- **性格：** ${c.personality}\n`;
          if (c.background) md += `- **背景：** ${c.background}\n`;
          md += '\n';
        });
        md += '---\n\n';
      }
      p3.chapters.forEach(c => { md += `## ${c.title}\n\n${c.content || '*（待写）*'}\n\n---\n\n`; });
      const out = path.join(DATA_DIR, '..', 'exports', `${p3.title || 'novel'}.md`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, md, 'utf8');
      console.log(`✅ 已导出: ${out}`);
    } else if (args[0] === 'json') {
      const out = path.join(DATA_DIR, '..', 'exports', `${p3.title || 'novel'}.json`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, JSON.stringify(p3, null, 2), 'utf8');
      console.log(`✅ 已导出: ${out}`);
    }
    break;

  // ===== 帮助 =====
  case 'help':
  case '-h':
  default:
    if (cmd && !['help', '-h'].includes(cmd)) console.error(`❌ 未知命令: ${cmd}`);
    console.log(`
有灵 · 小说 CLI 工具 v2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

项目:
  init [name]                    创建项目
  ls                             列出所有项目
  info [name]                    查看项目信息
  set [name] <field> <value>     设置 (title/genre/summary/world)

角色:
  char add [name] <名字> [角色]  添加角色
  char set [name] <名字> <字段> <值>  设置属性
  char show [name] <序号>         查看详情
  char [name]                    列出角色

大纲:
  outline add [name] <标题> [概要]
  outline [name]                 列出大纲

章节:
  ch add [name] <标题>           添加章节
  ch write [name] <序号> <内容>  写入内容
  ch append [name] <序号> <内容> 追加内容
  ch read [name] <序号>          阅读章节
  ch set [name] <序号> <字段> <值>
  ch stats [name]                字数统计
  ch [name]                      列出章节

子 Agent:
  agents ls                      列出所有 Agent
  agents add [name] <名字> ...   添加自定义 Agent
  agents pipeline                查看流水线顺序

导出:
  export txt/md/json [name]      导出项目
`);
    break;
}
