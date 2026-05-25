// ===== EPUB 导出模块 =====
// 将小说项目导出为标准 EPUB 3 电子书

const EPUB = {
  JSZIP_CDN: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',

  /**
   * 动态加载 JSZip（按需）
   */
  async loadJSZip() {
    if (typeof JSZip !== 'undefined') return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = this.JSZIP_CDN;
      script.onload = resolve;
      script.onerror = () => reject(new Error('无法加载 JSZip，请检查网络连接'));
      document.head.appendChild(script);
    });
  },

  /**
   * 生成 EPUB 并下载
   */
  async export(project, title) {
    try {
      await this.loadJSZip();
    } catch (e) {
      alert(e.message);
      return;
    }

    const zip = new JSZip();
    const chapters = project.chapters || [];
    const characters = project.characters || [];

    // 1. mimetype（必须第一个，不可压缩）
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    // 2. META-INF/container.xml
    zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

    // 3. 封面页
    const coverId = 'cover';
    zip.file('Cover.xhtml', this._generateCover(title, project));

    // 4. 章节 XHTML
    const chapterIds = [];
    chapters.forEach((ch, i) => {
      const id = `chapter${i}`;
      chapterIds.push(id);
      zip.file(`${id}.xhtml`, this._generateChapter(ch, i + 1));
    });

    // 5. 角色表（如果有角色）
    let charId = null;
    if (characters.length > 0) {
      charId = 'characters';
      zip.file('characters.xhtml', this._generateCharactersPage(characters));
    }

    // 6. CSS
    zip.file('style.css', this._getStyle());

    // 7. content.opf
    zip.file('content.opf', this._generateOPF(title, project, chapterIds, charId));

    // 8. nav.xhtml
    zip.file('nav.xhtml', this._generateNav(title, chapters, charId));

    // 9. 压缩并下载
    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/epub+zip',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.epub`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.show('📚 EPUB 导出成功');
  },

  /**
   * 生成封面页
   */
  _generateCover(title, project) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta charset="UTF-8"/>
  <title>${this._esc(title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body class="cover">
  <div class="cover-content">
    <h1>${this._esc(title)}</h1>
    ${project.genre ? `<p class="genre">${this._esc(project.genre)}</p>` : ''}
    ${project.summary ? `<p class="summary">${this._esc(project.summary)}</p>` : ''}
  </div>
</body>
</html>`;
  },

  /**
   * 生成章节 XHTML
   */
  _generateChapter(ch, num) {
    const content = (ch.content || '(待写)').replace(/\n/g, '</p><p>');
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta charset="UTF-8"/>
  <title>${this._esc(ch.title || `第${num}章`)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <article epub:type="chapter">
    <h2 epub:type="title">${this._esc(ch.title || `第${num}章`)}</h2>
    <p>${content}</p>
  </article>
</body>
</html>`;
  },

  /**
   * 生成角色表页
   */
  _generateCharactersPage(characters) {
    const rows = characters.map(c => `
      <tr>
        <td>${this._esc(c.name)}</td>
        <td>${this._esc(c.role || '')}</td>
        <td>${this._esc(c.personality || '')}</td>
        <td>${this._esc(c.background || '')}</td>
      </tr>`).join('\n      ');

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta charset="UTF-8"/>
  <title>角色表</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h2>角色表</h2>
  <table>
    <thead><tr><th>姓名</th><th>角色</th><th>性格</th><th>背景</th></tr></thead>
    <tbody>${rows}
    </tbody>
  </table>
</body>
</html>`;
  },

  /**
   * 生成 content.opf（包文档）
   */
  _generateOPF(title, project, chapterIds, charId) {
    const uuid = 'urn:uuid:' + this._uuid();
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');

    // 构建 spine 和 manifest 条目
    let manifest = `<item id="ncx" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="coverpage" href="Cover.xhtml" media-type="application/xhtml+xml"/>`;
    let spine = `  <itemref idref="coverpage"/>`;

    chapterIds.forEach(id => {
      manifest += `\n    <item id="${id}" href="${id}.xhtml" media-type="application/xhtml+xml"/>`;
      spine += `\n  <itemref idref="${id}"/>`;
    });

    if (charId) {
      manifest += `\n    <item id="${charId}" href="${charId}.xhtml" media-type="application/xhtml+xml"/>`;
    }
    manifest += `\n    <item id="css" href="style.css" media-type="text/css"/>`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">${uuid}</dc:identifier>
    <dc:title>${this._esc(title)}</dc:title>
    ${project.genre ? `<dc:type>${this._esc(project.genre)}</dc:type>` : ''}
    <dc:language>zh-CN</dc:language>
    <dc:date>${now}</dc:date>
    <meta property="dcterms:modified">${now}</meta>
  </metadata>
  <manifest>
    ${manifest}
  </manifest>
  <spine>${spine}
  </spine>
</package>`;
  },

  /**
   * 生成 nav.xhtml（导航文档）
   */
  _generateNav(title, chapters, charId) {
    let navList = chapters.map((ch, i) =>
      `<li><a href="#chapter${i}">${this._esc(ch.title || `第${i + 1}章`)}</a></li>`
    ).join('\n            ');

    if (charId) {
      navList += `\n            <li><a href="characters.xhtml#characters">角色表</a></li>`;
    }

    let navTargets = chapters.map((ch, i) =>
      `<navTarget id="chapter${i}" playOrder="${i + 1}">
        <a href="${i}.xhtml">${this._esc(ch.title || `第${i + 1}章`)}</a>
      </navTarget>`
    ).join('\n        ');

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta charset="UTF-8"/>
  <title>${this._esc(title)} - 目录</title>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>目录</h1>
    <ol>${navList}
    </ol>
  </nav>
  <nav epub:type="landmarks">
    <h1>Landmarks</h1>
    <ol>
      <li><a epub:type="bodymatter" href="chapter0.xhtml">正文</a></li>
    </ol>
  </nav>
  <nav epub:type="page-list">
    <h1>页码导航</h1>
    <navList>${navTargets}
    </navList>
  </nav>
</body>
</html>`;
  },

  /**
   * EPUB 内嵌 CSS
   */
  _getStyle() {
    return `
@page {
  margin: 0;
}

body {
  font-family: "Source Han Serif SC", "Noto Serif SC", "Songti SC", Georgia, serif;
  font-size: 1em;
  line-height: 1.8;
  color: #2c2c2c;
  margin: 8%;
  text-align: justify;
}

h1 {
  font-size: 2em;
  font-weight: 700;
  text-align: center;
  margin-bottom: 0.5em;
  letter-spacing: 0.1em;
}

h2 {
  font-size: 1.5em;
  font-weight: 600;
  text-align: center;
  margin: 2em 0 1.5em;
  padding-bottom: 0.5em;
  border-bottom: 2px solid #c0392b;
}

p {
  text-indent: 2em;
  margin: 0.5em 0;
}

.cover {
  text-align: center;
  padding-top: 30%;
}

.cover h1 {
  font-size: 2.5em;
  margin-bottom: 0.3em;
}

.cover .genre {
  font-size: 1em;
  color: #888;
  margin-bottom: 1em;
}

.cover .summary {
  font-size: 0.9em;
  color: #666;
  font-style: italic;
  text-indent: 0;
  max-width: 60%;
  margin: 1em auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  font-size: 0.9em;
}

th, td {
  padding: 0.5em;
  border: 1px solid #ddd;
  text-align: left;
  vertical-align: top;
}

th {
  background: #f5f5f5;
  font-weight: 600;
}

article {
  margin-bottom: 2em;
}

hr {
  border: none;
  border-top: 1px solid #ddd;
  margin: 2em 0;
}
`;
  },

  /**
   * 工具函数
   */
  _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  },

  _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
};
