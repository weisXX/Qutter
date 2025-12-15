<template>
  <div class="markdownit-content" v-html="renderedContent"></div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import markdownItTaskLists from 'markdown-it-task-lists'
import markdownItTOC from 'markdown-it-table-of-contents'

interface Props {
  content: string
}

const props = defineProps<Props>()

// 创建markdown-it实例
const md = new MarkdownIt({
  html: true,        // 允许HTML标签
  linkify: true,     // 自动将URL转换为链接
  typographer: true, // 启用印刷美化
  breaks: true,      // 转换换行符
  highlight: function (str: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre class="hljs"><code>' +
               hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
               '</code></pre>'
      } catch (__) {}
    }
    return '<pre class="hljs"><code>' +
           md.utils.escapeHtml(str) +
           '</code></pre>'
  }
})

// 添加任务列表支持
md.use(markdownItTaskLists, {
  enabled: true,
  label: true,
  labelAfter: false
})

// 添加目录支持
md.use(markdownItTOC, {
  includeLevel: [1, 2, 3, 4],
  containerClass: 'table-of-contents',
  listType: 'ul',
  format: function (x: string, htmlencode: (s: string) => string) {
    return htmlencode(x)
  }
})

// 自定义渲染规则，处理行内代码
md.renderer.rules.code_inline = (tokens, idx) => {
  const token = tokens[idx]
  const code = token.content
  
  // 尝试检测语言类型
  const detectedLang = detectLanguage(code.trim())
  
  if (detectedLang && hljs.getLanguage(detectedLang)) {
    try {
      const highlighted = hljs.highlight(code.trim(), { language: detectedLang }).value
      return `<code class="hljs language-${detectedLang}">${highlighted}</code>`
    } catch (err) {
      console.warn('行内代码高亮失败:', err)
    }
  }
  
  // 如果无法检测语言，使用自动检测
  try {
    const highlighted = hljs.highlightAuto(code.trim()).value
    return `<code class="hljs">${highlighted}</code>`
  } catch (err) {
    console.warn('行内代码自动高亮失败:', err)
    return `<code>${md.utils.escapeHtml(code)}</code>`
  }
}

// 自定义代码块渲染规则，添加工具栏
md.renderer.rules.fence = (tokens, idx, options, env, renderer) => {
  const token = tokens[idx]
  const info = token.info ? md.utils.unescapeAll(token.info).trim() : ''
  const langName = info ? info.split(/\s+/g)[0] : ''
  
  let highlighted = token.content
  if (langName && hljs.getLanguage(langName)) {
    try {
      highlighted = hljs.highlight(token.content, { language: langName }).value
    } catch (err) {
      console.warn('代码高亮失败:', err)
    }
  }
  
  const codeId = `code-block-${Date.now()}-${idx}`
  const toolbar = `
    <div class="code-toolbar">
      <div class="code-language">${langName || 'text'}</div>
      <div class="code-actions">
        <button class="code-action-btn" data-action="copy" data-code-id="${codeId}" title="复制代码">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>复制</span>
        </button>
        <button class="code-action-btn" data-action="download" data-code-id="${codeId}" data-language="${langName || 'code'}" title="下载代码">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>下载</span>
        </button>
      </div>
    </div>
  `
  
  return `
    <div class="code-block-container">
      ${toolbar}
      <pre class="hljs"><code id="${codeId}" class="hljs language-${langName}">${highlighted}</code></pre>
    </div>
  `
}

// 自定义列表项渲染规则，确保列表项内容不换行
md.renderer.rules.list_item_open = (tokens, idx) => {
  return '<li>'
}

md.renderer.rules.list_item_close = (tokens, idx) => {
  return '</li>'
}

// 自定义段落渲染规则，在列表项中的段落不换行
md.renderer.rules.paragraph_open = (tokens, idx, options, env, renderer) => {
  // 检查是否在列表项中
  const parentTokens = tokens.slice(0, idx).reverse()
  const isInListItem = parentTokens.some(token => token.type === 'list_item_open')
  
  if (isInListItem) {
    return '<span style="display: inline;">'
  }
  return '<p>'
}

md.renderer.rules.paragraph_close = (tokens, idx, options, env, renderer) => {
  // 检查是否在列表项中
  const parentTokens = tokens.slice(0, idx).reverse()
  const isInListItem = parentTokens.some(token => token.type === 'list_item_open')
  
  if (isInListItem) {
    return '</span>'
  }
  return '</p>'
}

// 简单的语言检测函数
function detectLanguage(code: string): string | null {
  // JavaScript 检测
  if (/function\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=|=>|\{.*\}|\[\]|\.\w+|console\.|require\(|import\s+/.test(code)) {
    return 'javascript'
  }
  
  // Java 检测
  if (/public\s+class|private\s+\w+\s+\w+|public\s+static\s+void|System\.out\.println|String\[\]\s+args|new\s+\w+\(\)|@Override/.test(code)) {
    return 'java'
  }
  
  // Python 检测
  if (/def\s+\w+|import\s+\w+|from\s+\w+\s+import|print\(|if\s+__name__\s*==\s*['"]__main__['"]|:\s*\n/.test(code)) {
    return 'python'
  }
  
  // CSS 检测
  if (/\{\s*[\w-]+:\s*[^}]+\}|\.[\w-]+\s*\{|#[\w-]+\s*\{|@media|@import/.test(code)) {
    return 'css'
  }
  
  // HTML 检测
  if (/&lt;\/?\w+[^&gt;]*&gt;|&lt;div|&lt;span|&lt;p|&lt;h[1-6]|class=|id=/.test(code)) {
    return 'html'
  }
  
  // SQL 检测
  if (/SELECT\s+.*\s+FROM|INSERT\s+INTO|UPDATE\s+.*\s+SET|DELETE\s+FROM|CREATE\s+TABLE|DROP\s+TABLE/i.test(code)) {
    return 'sql'
  }
  
  // JSON 检测
  if (/^\s*\{.*\}\s*$|^\s*\[.*\]\s*$/.test(code) && code.includes(':') && (code.includes('"') || code.includes("'"))) {
    return 'json'
  }
  
  return null
}

const renderedContent = computed(() => {
  if (!props.content) return ''
  
  // 处理HTML实体解码
  let content = props.content
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  return md.render(content)
})

// 事件处理函数
const handleCodeAction = (event: Event) => {
  const target = event.target as HTMLElement
  const button = target.closest('.code-action-btn') as HTMLButtonElement
  
  if (button) {
    const action = button.dataset.action
    const codeId = button.dataset.codeId
    const language = button.dataset.language
    
    if (action === 'copy' && codeId) {
      const codeElement = document.getElementById(codeId)
      if (codeElement) {
        const text = codeElement.textContent || ''
        navigator.clipboard.writeText(text).then(() => {
          console.log('代码已复制到剪贴板')
        }).catch(err => {
          console.error('复制失败:', err)
        })
      }
    } else if (action === 'download' && codeId && language) {
      const codeElement = document.getElementById(codeId)
      if (codeElement) {
        const text = codeElement.textContent || ''
        const blob = new Blob([text], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `code.${getFileExtension(language)}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    }
  }
}

// 生命周期钩子
onMounted(() => {
  document.addEventListener('click', handleCodeAction)
})

onUnmounted(() => {
  document.removeEventListener('click', handleCodeAction)
})

// 文件扩展名映射
const getFileExtension = (language: string): string => {
  const extensions: Record<string, string> = {
    'javascript': 'js',
    'typescript': 'ts',
    'python': 'py',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'csharp': 'cs',
    'php': 'php',
    'ruby': 'rb',
    'go': 'go',
    'rust': 'rs',
    'swift': 'swift',
    'kotlin': 'kt',
    'scala': 'scala',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yml',
    'toml': 'toml',
    'sql': 'sql',
    'bash': 'sh',
    'shell': 'sh',
    'powershell': 'ps1',
    'dockerfile': 'dockerfile',
    'markdown': 'md',
    'tex': 'tex',
    'r': 'r',
    'matlab': 'm',
    'lua': 'lua',
    'perl': 'pl',
    'dart': 'dart'
  }
  return extensions[language.toLowerCase()] || 'txt'
}
</script>

<style scoped>
.markdownit-content {
  line-height: 1.6;
  color: #1f2937;
}

.markdownit-content :deep(h1),
.markdownit-content :deep(h2),
.markdownit-content :deep(h3),
.markdownit-content :deep(h4),
.markdownit-content :deep(h5),
.markdownit-content :deep(h6) {
  margin: 1em 0 0.5em 0;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
}

.markdownit-content :deep(h1) { font-size: 1.8em; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
.markdownit-content :deep(h2) { font-size: 1.5em; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; }
.markdownit-content :deep(h3) { font-size: 1.3em; }
.markdownit-content :deep(h4) { font-size: 1.2em; }
.markdownit-content :deep(h5) { font-size: 1.1em; }
.markdownit-content :deep(h6) { font-size: 1em; }

.markdownit-content :deep(p) {
  margin: 0.8em 0;
  line-height: 1.6;
}

.markdownit-content :deep(ul),
.markdownit-content :deep(ol) {
  margin: 0.8em 0;
  padding-left: 2em;
}

.markdownit-content :deep(ul) {
  list-style-type: disc;
}

.markdownit-content :deep(ol) {
  list-style-type: decimal;
}

.markdownit-content :deep(li) {
  margin: 0.3em 0;
  line-height: 1.6;
}

.markdownit-content :deep(li p:first-child) {
  display: inline;
  margin: 0;
}

.markdownit-content :deep(li p:not(:first-child)) {
  display: block;
  margin: 0.5em 0;
}

/* 嵌套列表样式 */
.markdownit-content :deep(ul ul),
.markdownit-content :deep(ol ol),
.markdownit-content :deep(ul ol),
.markdownit-content :deep(ol ul) {
  margin: 0.3em 0;
  padding-left: 1.5em;
}

.markdownit-content :deep(ul ul) {
  list-style-type: circle;
}

.markdownit-content :deep(ul ul ul) {
  list-style-type: square;
}

/* 行内代码样式 */
.markdownit-content :deep(code:not(.hljs)) {
  background-color: #f1f5f9;
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  color: #1f2937;
}

/* 代码块容器样式 */
.markdownit-content :deep(.code-block-container) {
  margin: 1em 0;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  overflow: hidden;
  background: #f6f8fa;
}

/* 代码块工具栏样式 */
.markdownit-content :deep(.code-toolbar) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 12px;
  background: #f1f3f4;
  border-bottom: 1px solid #d0d7de;
  font-size: 11px;
  height: 28px;
}

.markdownit-content :deep(.code-language) {
  color: #57606a;
  font-weight: 500;
  text-transform: uppercase;
  font-size: 10px;
}

.markdownit-content :deep(.code-actions) {
  display: flex;
  gap: 4px;
}

.markdownit-content :deep(.code-action-btn) {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  border: 1px solid #d0d7de;
  border-radius: 3px;
  background: white;
  color: #57606a;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 20px;
  min-width: 0;
}

.markdownit-content :deep(.code-action-btn:hover) {
  background: #f3f4f6;
  border-color: #9ca3af;
  color: #24292f;
}

.markdownit-content :deep(.code-action-btn svg) {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
}

.markdownit-content :deep(.code-action-btn span) {
  display: none;
}

/* 代码块样式 */
.markdownit-content :deep(pre) {
  background-color: #f6f8fa;
  border: none;
  border-radius: 0;
  padding: 16px;
  overflow-x: auto;
  margin: 0;
}

.markdownit-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  color: #1f2937;
  font-size: 0.9em;
  line-height: 1.5;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

/* 行内代码高亮样式 */
.markdownit-content :deep(code.hljs) {
  background-color: #f1f5f9;
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  color: #1f2937;
  display: inline;
}

/* 代码高亮颜色 */
.markdownit-content :deep(code.hljs .hljs-comment),
.markdownit-content :deep(code.hljs .hljs-quote) {
  color: #6b7280;
  font-style: italic;
}

.markdownit-content :deep(code.hljs .hljs-keyword),
.markdownit-content :deep(code.hljs .hljs-selector-tag),
.markdownit-content :deep(code.hljs .hljs-subst) {
  color: #0000ff;
  font-weight: bold;
}

.markdownit-content :deep(code.hljs .hljs-number),
.markdownit-content :deep(code.hljs .hljs-literal) {
  color: #098658;
}

.markdownit-content :deep(code.hljs .hljs-variable),
.markdownit-content :deep(code.hljs .hljs-template-variable) {
  color: #001080;
}

.markdownit-content :deep(code.hljs .hljs-string),
.markdownit-content :deep(code.hljs .hljs-doctag) {
  color: #a31515;
}

.markdownit-content :deep(code.hljs .hljs-title),
.markdownit-content :deep(code.hljs .hljs-section),
.markdownit-content :deep(code.hljs .hljs-selector-id) {
  color: #7c3aed;
  font-weight: bold;
}

.markdownit-content :deep(code.hljs .hljs-type),
.markdownit-content :deep(code.hljs .hljs-class .hljs-title) {
  color: #267f99;
}

.markdownit-content :deep(code.hljs .hljs-tag),
.markdownit-content :deep(code.hljs .hljs-name) {
  color: #800000;
}

.markdownit-content :deep(code.hljs .hljs-attribute) {
  color: #0451a5;
}

.markdownit-content :deep(code.hljs .hljs-function) {
  color: #795e26;
}

.markdownit-content :deep(code.hljs .hljs-params) {
  color: #001080;
}

/* 任务列表样式 */
.markdownit-content :deep(.task-list-item) {
  list-style: none;
  margin-left: -1.5em;
}

.markdownit-content :deep(.task-list-item input) {
  margin-right: 0.5em;
}

/* 引用块样式 */
.markdownit-content :deep(blockquote) {
  border-left: 4px solid #d0d7de;
  padding: 0 1em;
  margin: 1em 0;
  color: #57606a;
  background: #f6f8fa;
  border-radius: 0 6px 6px 0;
}

.markdownit-content :deep(blockquote p) {
  margin: 0.5em 0;
}

/* 表格样式 */
.markdownit-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.markdownit-content :deep(th),
.markdownit-content :deep(td) {
  border: 1px solid #d0d7de;
  padding: 8px 12px;
  text-align: left;
}

.markdownit-content :deep(th) {
  background-color: #f6f8fa;
  font-weight: 600;
  color: #1f2937;
}

.markdownit-content :deep(tr:nth-child(even)) {
  background-color: #f6f8fa;
}

/* 链接样式 */
.markdownit-content :deep(a) {
  color: #0969da;
  text-decoration: none;
}

.markdownit-content :deep(a:hover) {
  text-decoration: underline;
  color: #0550ae;
}

/* 水平线样式 */
.markdownit-content :deep(hr) {
  border: none;
  border-top: 1px solid #d0d7de;
  margin: 1em 0;
}

/* 图片样式 */
.markdownit-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 0.5em 0;
}

/* 目录样式 */
.markdownit-content :deep(.table-of-contents) {
  background: #f6f8fa;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  padding: 16px;
  margin: 1em 0;
}

.markdownit-content :deep(.table-of-contents ul) {
  margin: 0;
  padding-left: 1.5em;
}

.markdownit-content :deep(.table-of-contents li) {
  margin: 0.2em 0;
}

/* 代码块深色主题覆盖 */
.markdownit-content :deep(.hljs) {
  background: #f6f8fa !important;
  color: #1f2937 !important;
}
</style>