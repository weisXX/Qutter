<template>
  <div class="markdown-content" v-html="renderedContent"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import markdownItTaskLists from 'markdown-it-task-lists'
import markdownItTOC from 'markdown-it-table-of-contents'
import markdownItTexmath from 'markdown-it-texmath'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface Props {
  content: string
}

const props = defineProps<Props>()
console.log('[[[[[[[[[[[[[[[[[[1111]]]]]]]]]]]]]]]]]]')
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

// 添加数学公式支持
md.use(markdownItTexmath, {
  engine: katex,
  delimiters: ['dollars', 'brackets'],
  katexOptions: {
    throwOnError: false,
    errorColor: '#cc0000',
    strict: false
  }
})

// 自定义列表项渲染规则，确保列表项内容不换行
md.renderer.rules.list_item_open = (tokens: any, idx: number): string => {
  return '<li>'
}

md.renderer.rules.list_item_close = (tokens: any, idx: number): string => {
  return '</li>'
}

// 自定义段落渲染规则，在列表项中的段落不换行
md.renderer.rules.paragraph_open = (tokens: any, idx: number, options: any, env: any, renderer: any): string => {
  // 检查是否在列表项中
  const parentTokens = tokens.slice(0, idx).reverse()
  const isInListItem = parentTokens.some((token: any) => token.type === 'list_item_open')
  
  if (isInListItem) {
    return '<span style="display: inline;">'
  }
  return '<p>'
}

md.renderer.rules.paragraph_close = (tokens: any, idx: number, options: any, env: any, renderer: any): string => {
  // 检查是否在列表项中
  const parentTokens = tokens.slice(0, idx).reverse()
  const isInListItem = parentTokens.some((token: any) => token.type === 'list_item_open')
  
  if (isInListItem) {
    return '</span>'
  }
  return '</p>'
}

// 自定义渲染规则，处理行内代码
md.renderer.rules.code_inline = (tokens: any, idx: number): string => {
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
  
  // 预处理内容，处理HTML标签和数学公式
  let content = props.content
    // 处理HTML实体解码
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // 新增：处理被<br>标签打断的方括号内容
    // 匹配形如 [<br>内容<br>] 的模式，并将其重构为 [$内容$]
    .replace(/(\[)(?:<br\s*\/?>\s*)+(.*?)(?:<br\s*\/?>\s*)+(\])/gs, (match, openingBracket, middle, closingBracket) => {
      // 移除中间内容中的所有HTML标签和多余空白
      const cleanMiddle = middle
        .replace(/<[^>]*>/g, '') // 移除所有HTML标签
        .replace(/\s+/g, ' ') // 合并多个空白字符为单个空格
        .trim();
      return `[$${cleanMiddle}$]`;
    })
    // 处理行内公式 $...$
    .replace(/\$(.*?)\$/g, (match, formula) => {
      // 移除公式内的HTML标签，特别是<br>标签
      const cleanFormula = formula
        .replace(/<br[^>]*>/g, ' ') // 移除<br>标签
        .replace(/<br\s*\/>/g, ' ') // 处理自闭合<br/>标签
        .replace(/<br\s*\/\s*>/g, ' ') // 处理自闭合<br />标签
        .replace(/\[([^\]]*?)\]/g, (match, inside) => {
          // 处理方括号内的内容，移除其中的<br>标签
          return `[${inside.replace(/<br[^>]*>/g, ' ').replace(/<br\s*\/>/g, ' ').replace(/<br\s*\/\s*>/g, ' ')}]`;
        })
        .replace(/<[^>]*>/g, '') // 移除其他HTML标签
        .replace(/&nbsp;/g, ' ')
        .trim();
      return `$${cleanFormula}$`;
    })
    // 处理块级公式 $$...$$
    .replace(/\$\$(.*?)\$\$/gs, (match, formula) => {
      // 移除公式内的HTML标签，特别是<br>标签
      const cleanFormula = formula
        .replace(/<br[^>]*>/g, ' ') // 移除<br>标签
        .replace(/<br\s*\/>/g, ' ') // 处理自闭合<br/>标签
        .replace(/<br\s*\/\s*>/g, ' ') // 处理自闭合<br />标签
        .replace(/\[([^\]]*?)\]/g, (match, inside) => {
          // 处理方括号内的内容，移除其中的<br>标签
          return `[${inside.replace(/<br[^>]*>/g, ' ').replace(/<br\s*\/>/g, ' ').replace(/<br\s*\/\s*>/g, ' ')}]`;
        })
        .replace(/<[^>]*>/g, '') // 移除其他HTML标签
        .replace(/&nbsp;/g, ' ')
        .trim();
      return `$$${cleanFormula}$$`;
    })
    // 处理行内公式 \(...\)
    .replace(/\\\((.*?)\\\)/gs, (match, formula) => {
      // 移除公式内的HTML标签，特别是<br>标签
      const cleanFormula = formula
        .replace(/<br[^>]*>/g, ' ') // 移除<br>标签
        .replace(/<br\s*\/>/g, ' ') // 处理自闭合<br/>标签
        .replace(/<br\s*\/\s*>/g, ' ') // 处理自闭合<br />标签
        .replace(/\[([^\]]*?)\]/g, (match, inside) => {
          // 处理方括号内的内容，移除其中的<br>标签
          return `[${inside.replace(/<br[^>]*>/g, ' ').replace(/<br\s*\/>/g, ' ').replace(/<br\s*\/\s*>/g, ' ')}]`;
        })
        .replace(/<[^>]*>/g, '') // 移除其他HTML标签
        .replace(/&nbsp;/g, ' ')
        .trim();
      return `\\(${cleanFormula})\\)`;
    })
    // 处理块级公式 \[...\]
    .replace(/\\\[(.*?)\\\]/gs, (match, formula) => {
      // 移除公式内的HTML标签，特别<br>标签
      const cleanFormula = formula
        .replace(/<br[^>]*>/g, ' ') // 移除<br>标签
        .replace(/<br\s*\/>/g, ' ') // 处理自闭合<br/>标签
        .replace(/<br\s*\/\s*>/g, ' ') // 处理自闭合<br />标签
        .replace(/\[([^\]]*?)\]/g, (match, inside) => {
          // 处理方括号内的内容，移除其中的<br>标签
          return `[${inside.replace(/<br[^>]*>/g, ' ').replace(/<br\s*\/>/g, ' ').replace(/<br\s*\/\s*>/g, ' ')}]`;
        })
        .replace(/<[^>]*>/g, '') // 移除其他HTML标签
        .replace(/&nbsp;/g, ' ')
        .trim();
      return `\\[${cleanFormula}\\]`;
    });
  
  return md.render(content)
})
</script>

<style scoped>
.markdown-content {
  line-height: 1.6;
  color: #1f2937;
}

/* 继承原有的 Markdown 样式 */
.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin: 1em 0 0.5em 0;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
}

.markdown-content :deep(h1) { font-size: 1.8em; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
.markdown-content :deep(h2) { font-size: 1.5em; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; }
.markdown-content :deep(h3) { font-size: 1.3em; }
.markdown-content :deep(h4) { font-size: 1.2em; }
.markdown-content :deep(h5) { font-size: 1.1em; }
.markdown-content :deep(h6) { font-size: 1em; }

.markdown-content :deep(p) {
  margin: 0.8em 0;
  line-height: 1.6;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 0.8em 0;
  padding-left: 2em;
}

.markdown-content :deep(ul) {
  list-style-type: disc;
}

.markdown-content :deep(ol) {
  list-style-type: decimal;
}

.markdown-content :deep(li) {
  margin: 0.3em 0;
  line-height: 1.6;
}

/* 嵌套列表样式 */
.markdown-content :deep(ul ul),
.markdown-content :deep(ol ol),
.markdown-content :deep(ul ol),
.markdown-content :deep(ol ul) {
  margin: 0.3em 0;
  padding-left: 1.5em;
}

.markdown-content :deep(ul ul) {
  list-style-type: circle;
}

.markdown-content :deep(ul ul ul) {
  list-style-type: square;
}

/* 行内代码样式 */
.markdown-content :deep(code:not(.hljs)) {
  background-color: #f1f5f9;
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  color: #1f2937;
}

/* 代码块样式 */
.markdown-content :deep(pre) {
  background-color: #f6f8fa;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  margin: 1em 0;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  color: #1f2937;
  font-size: 0.9em;
  line-height: 1.5;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

/* 行内代码高亮样式 */
.markdown-content :deep(code.hljs) {
  background-color: #f1f5f9;
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  color: #1f2937;
  display: inline;
}

/* 任务列表样式 */
.markdown-content :deep(.task-list-item) {
  list-style: none;
  margin-left: -1.5em;
}

.markdown-content :deep(.task-list-item input) {
  margin-right: 0.5em;
}

/* 引用块样式 */
.markdown-content :deep(blockquote) {
  border-left: 4px solid #d0d7de;
  padding: 0 1em;
  margin: 1em 0;
  color: #57606a;
  background: #f6f8fa;
  border-radius: 0 6px 6px 0;
}

.markdown-content :deep(blockquote p) {
  margin: 0.5em 0;
}

/* 表格样式 */
.markdown-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid #d0d7de;
  padding: 8px 12px;
  text-align: left;
}

.markdown-content :deep(th) {
  background-color: #f6f8fa;
  font-weight: 600;
  color: #1f2937;
}

.markdown-content :deep(tr:nth-child(even)) {
  background-color: #f6f8fa;
}

/* 链接样式 */
.markdown-content :deep(a) {
  color: #0969da;
  text-decoration: none;
}

.markdown-content :deep(a:hover) {
  text-decoration: underline;
  color: #0550ae;
}

/* 水平线样式 */
.markdown-content :deep(hr) {
  border: none;
  border-top: 1px solid #d0d7de;
  margin: 2em 0;
}

/* 图片样式 */
.markdown-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 0.5em 0;
}

/* 目录样式 */
.markdown-content :deep(.table-of-contents) {
  background: #f6f8fa;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  padding: 16px;
  margin: 1em 0;
}

.markdown-content :deep(.table-of-contents ul) {
  margin: 0;
  padding-left: 1.5em;
}

.markdown-content :deep(.table-of-contents li) {
  margin: 0.2em 0;
}

/* 代码块深色主题覆盖 */
.markdown-content :deep(.hljs) {
  background: #f6f8fa !important;
  color: #1f2937 !important;
}

/* 数学公式样式 */
.markdown-content :deep(.katex) {
  font-size: 1.1em;
}

.markdown-content :deep(.katex-display) {
  margin: 1em 0;
  text-align: center;
}

.markdown-content :deep(.katex-error) {
  color: #ff4757;
}
</style>