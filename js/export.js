// ===== 导出模块 =====
const Export = {
  init() {
    document.querySelectorAll('.export-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card = e.target.closest('.export-card');
        const format = card.dataset.format;
        this.export(format);
      });
    });
  },

  export(format) {
    const project = Storage.load();
    const title = project.title || '小说';

    if (format === 'json') {
      Storage.exportJSON();
      return;
    }

    if (format === 'txt') {
      this.exportTxt(project, title);
    } else if (format === 'md') {
      this.exportMarkdown(project, title);
    }
  },

  exportTxt(project, title) {
    let text = `《${title}》\n`;
    if (project.summary) text += `${project.summary}\n`;
    text += '\n' + '='.repeat(50) + '\n\n';

    project.chapters.forEach((ch, i) => {
      text += `${ch.title}\n`;
      text += '-'.repeat(30) + '\n';
      text += ch.content || '(待写)\n\n';
    });

    this.download(`${title}.txt`, text, 'text/plain');
  },

  exportMarkdown(project, title) {
    let md = `# 《${title}》\n\n`;
    if (project.genre) md += `**类型：**${project.genre}\n\n`;
    if (project.summary) md += `> ${project.summary}\n\n`;
    if (project.world) md += `**世界观：** ${project.world}\n\n`;

    md += `---\n\n`;

    if (project.characters && project.characters.length > 0) {
      md += `## 角色\n\n`;
      project.characters.forEach(c => {
        md += `### ${c.name}${c.role ? `（${c.role}）` : ''}\n`;
        if (c.appearance) md += `- **外貌：** ${c.appearance}\n`;
        if (c.personality) md += `- **性格：** ${c.personality}\n`;
        if (c.background) md += `- **背景：** ${c.background}\n`;
        if (c.goal) md += `- **目标：** ${c.goal}\n`;
        if (c.relations) md += `- **关系：** ${c.relations}\n`;
        md += `\n`;
      });
      md += `---\n\n`;
    }

    project.chapters.forEach((ch, i) => {
      md += `## ${ch.title}\n\n`;
      md += ch.content || '*（待写）*';
      md += `\n\n---\n\n`;
    });

    this.download(`${title}.md`, md, 'text/markdown');
  },

  download(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};
