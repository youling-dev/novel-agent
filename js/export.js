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
    } else if (format === 'html') {
      const includeToc = document.getElementById('html-include-toc')?.checked ?? true;
      const includeChars = document.getElementById('html-include-chars')?.checked ?? true;
      this.exportHTML(project, title, { includeToc, includeChars });
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
  },

  exportHTML(project, title, opts = {}) {
    const { includeToc = true, includeChars = true } = opts;
    const chapters = project.chapters || [];
    const characters = project.characters || [];

    // Build TOC links
    let tocHtml = '';
    if (includeToc && chapters.length > 0) {
      tocHtml = `
      <div class="book-toc">
        <h2>目录</h2>
        <ul>
          ${chapters.map((ch, i) => `<li data-num="${i + 1}"><a href="#ch-${i}">${ch.title || `第${i + 1}章`}</a></li>`).join('\n          ')}
        </ul>
      </div>
      <hr class="book-divider">`;
    }

    // Build character table
    let charsHtml = '';
    if (includeChars && characters.length > 0) {
      charsHtml = `
      <div class="book-chars">
        <h2>角色表</h2>
        <table>
          <thead><tr><th>姓名</th><th>角色</th><th>性格</th><th>背景</th></tr></thead>
          <tbody>
            ${characters.map(c => `<tr><td>${c.name}</td><td>${c.role || '-'}</td><td>${c.personality || '-'}</td><td>${c.background || '-'}</td></tr>`).join('\n            ')}
          </tbody>
        </table>
      </div>
      <hr class="book-divider">`;
    }

    // Build chapters
    const chaptersHtml = chapters.map((ch, i) => {
      const content = (ch.content || '').replace(/\n/g, '<br>');
      return `
      <div class="book-chapter" id="ch-${i}">
        <h2 class="chapter-title">${ch.title || `第${i + 1}章`}</h2>
        <div class="chapter-content">${content || '<em>（待写）</em>'}</div>
      </div>`;
    }).join('\n      ');

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    :root {
      --bg: #faf8f5;
      --text: #2c2c2c;
      --muted: #777;
      --accent: #c0392b;
      --link: #2980b9;
      --border: #e0dcd7;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Source Han Serif SC", "Noto Serif SC", "Songti SC", Georgia, serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.9;
      font-size: 18px;
      max-width: 720px;
      margin: 0 auto;
      padding: 60px 30px 120px;
    }
    a { color: var(--link); text-decoration: none; }
    a:hover { text-decoration: underline; }
    hr.book-divider {
      border: none;
      border-top: 1px solid var(--border);
      margin: 48px 0;
    }
    /* Cover */
    .book-cover {
      text-align: center;
      padding: 120px 0 80px;
    }
    .book-cover h1 {
      font-size: 42px;
      font-weight: 700;
      margin-bottom: 24px;
      letter-spacing: 0.1em;
    }
    .book-cover .meta {
      font-size: 14px;
      color: var(--muted);
      line-height: 2;
    }
    .book-cover .summary {
      margin-top: 32px;
      font-size: 16px;
      color: var(--muted);
      font-style: italic;
    }
    /* TOC */
    .book-toc {
      margin: 24px 0 48px;
    }
    .book-toc h2 {
      font-size: 24px;
      margin-bottom: 16px;
      text-align: center;
    }
    .book-toc ul {
      list-style: none;
      columns: 2;
      column-gap: 40px;
    }
    .book-toc li {
      padding: 6px 0;
      border-bottom: 1px dotted var(--border);
      font-size: 15px;
    }
    .book-toc li::before {
      content: attr(data-num) ". ";
      color: var(--muted);
    }
    /* Chapters */
    .book-chapter {
      margin-bottom: 64px;
      page-break-after: always;
    }
    .chapter-title {
      font-size: 26px;
      font-weight: 600;
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 2px solid var(--accent);
      text-align: center;
    }
    .chapter-content {
      text-indent: 2em;
      text-align: justify;
    }
    .chapter-content br + br {
      height: 1em;
    }
    /* Characters */
    .book-chars table {
      width: 100%;
      border-collapse: collapse;
      font-size: 15px;
      margin: 16px 0;
    }
    .book-chars th, .book-chars td {
      padding: 10px 12px;
      border: 1px solid var(--border);
      text-align: left;
      vertical-align: top;
    }
    .book-chars th {
      background: #f0ede8;
      font-weight: 600;
      font-size: 14px;
    }
    .book-chars h2 {
      font-size: 24px;
      margin-bottom: 16px;
      text-align: center;
    }
    h2.section-title {
      font-size: 24px;
      text-align: center;
      margin: 32px 0 16px;
    }
    @media print {
      body { max-width: none; padding: 0; font-size: 14px; background: white; }
      .book-chapter { page-break-after: always; }
    }
    @media (max-width: 600px) {
      body { font-size: 16px; padding: 30px 16px 80px; }
      .book-toc ul { columns: 1; }
      .book-cover h1 { font-size: 28px; }
    }
  </style>
</head>
<body>
  <div class="book-cover">
    <h1>《${title}》</h1>
    <div class="meta">
      ${project.genre ? `${project.genre}<br>` : ''}
      ${project.summary ? '' : ''}
    </div>
    ${project.summary ? `<div class="summary">${project.summary}</div>` : ''}
  </div>

  ${tocHtml}
  ${charsHtml}${chaptersHtml}
</body>
</html>`;

    this.download(`${title}.html`, html, 'text/html');
  }
};
