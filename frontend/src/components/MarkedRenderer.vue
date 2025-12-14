<template>
  <div class="marked-content" v-html="renderedContent"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

interface Props {
  content: string
}

const props = defineProps<Props>()

// 配置marked选项
marked.setOptions({
  highlight: (code: string, lang: string) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value
      } catch (err) {
        console.warn('代码高亮失败:', err)
      }
    }
    return hljs.highlightAuto(code).value
  },
  breaks: true, // 支持换行
  gfm: true, // GitHub风格markdown
  headerIds: false, // 禁用自动生成header ID
  mangle: false, // 禁用邮箱地址混淆
  sanitize: false, // 允许HTML（因为我们使用v-html）
  smartLists: true, // 智能列表
  smartypants: true, // 智能标点
  langPrefix: 'hljs language-', // 语言前缀
})

const renderedContent = computed(() => {
  if (!props.content) return ''
  
  // 先处理HTML实体解码，避免marked重复转义
  let content = props.content
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // 使用marked解析Markdown
  let html = marked(content)
  
  // 先处理代码块，确保它们不被行内代码处理影响
  html = html.replace(/<pre><code class="hljs language-(.*?)">(.*?)<\/code><\/pre>/gs, (match, lang, code) => {
    // 代码块已经由marked的highlight函数处理，不需要额外处理
    return match
  })
  
  // 处理行内代码标签（不在pre标签内的code），添加语法高亮
  // 使用更简单的方法：先提取所有pre块，然后处理剩下的code标签
  const preBlocks: string[] = []
  let preIndex = 0
  
  // 提取并替换pre块
  html = html.replace(/<pre[\s\S]*?<\/pre>/g, (match) => {
    preBlocks.push(match)
    return `__PRE_BLOCK_${preIndex++}__`
  })
  
  // 处理行内代码
  html = html.replace(/<code>(.*?)<\/code>/g, (match, code) => {
    // 解码HTML实体
    const decodedCode = code
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    // 检查是否是markdown语法（如 ### 标题）
    if (/^#{1,6}\s+.+|^[\*\-\+]\s+|^\d+\.\s+/.test(decodedCode.trim())) {
      // 如果是markdown语法，不进行代码高亮，保持原样
      return match
    }
    
    // 尝试检测语言类型
    let detectedLang = detectLanguage(decodedCode.trim())
    
    if (detectedLang && hljs.getLanguage(detectedLang)) {
      try {
        const highlighted = hljs.highlight(decodedCode.trim(), { language: detectedLang }).value
        return `<code class="hljs language-${detectedLang}">${highlighted}</code>`
      } catch (err) {
        console.warn('行内代码高亮失败:', err)
      }
    }
    
    // 如果无法检测语言或高亮失败，使用自动检测
    try {
      const highlighted = hljs.highlightAuto(decodedCode.trim()).value
      return `<code class="hljs">${highlighted}</code>`
    } catch (err) {
      console.warn('行内代码自动高亮失败:', err)
      return match
    }
  })
  
  // 恢复pre块
  html = html.replace(/__PRE_BLOCK_(\d+)__/g, (match, index) => {
    return preBlocks[parseInt(index)]
  })
  
  return html
})

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
</script>

<style scoped>
.marked-content {
  line-height: 1.3;
  color: #1f2937;
}

.marked-content :deep(h1),
.marked-content :deep(h2),
.marked-content :deep(h3),
.marked-content :deep(h4),
.marked-content :deep(h5),
.marked-content :deep(h6) {
  margin: 0.8em 0 0.3em 0;
  font-weight: 600;
  color: #1f2937;
}

.marked-content :deep(h1) { font-size: 1.6em; }
.marked-content :deep(h2) { font-size: 1.4em; }
.marked-content :deep(h3) { font-size: 1.2em; }
.marked-content :deep(h4) { font-size: 1.1em; }

.marked-content :deep(p) {
  margin: 0.3em 0;
  line-height: 1.3;
}

.marked-content :deep(ul),
.marked-content :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.marked-content :deep(ul) {
  list-style-type: disc;
}

.marked-content :deep(ol) {
  list-style-type: decimal;
}

.marked-content :deep(li) {
  margin: 0.2em 0;
  line-height: 1.4;
}

/* 嵌套列表样式 */
.marked-content :deep(ul ul),
.marked-content :deep(ol ol),
.marked-content :deep(ul ol),
.marked-content :deep(ol ul) {
  margin: 0.2em 0;
  padding-left: 1.2em;
}

.marked-content :deep(ul ul) {
  list-style-type: circle;
}

.marked-content :deep(ul ul ul) {
  list-style-type: square;
}

.marked-content :deep(code:not(.hljs)) {
  background-color: #f1f5f9;
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.85em;
  color: #1f2937;
}

/* 行内代码高亮样式 */
.marked-content :deep(code.hljs) {
  background-color: #f1f5f9;
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.85em;
  color: #1f2937;
  display: inline;
}

.marked-content :deep(pre) {
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 12px;
  overflow-x: auto;
  margin: 0.8em 0;
}

.marked-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  color: #e2e8f0;
  font-size: 0.85em;
  line-height: 1.4;
}

/* 代码高亮样式 - 深色主题（代码块） */
.marked-content :deep(pre .hljs) {
  background: #1e293b;
  color: #e2e8f0;
}

/* 行内代码高亮样式 - 浅色主题 */
.marked-content :deep(code.hljs) {
  background: #f1f5f9;
  color: #1f2937;
}

.marked-content :deep(.hljs-comment),
.marked-content :deep(.hljs-quote) {
  color: #94a3b8;
  font-style: italic;
}

.marked-content :deep(.hljs-keyword),
.marked-content :deep(.hljs-selector-tag),
.marked-content :deep(.hljs-subst) {
  color: #f472b6;
}

.marked-content :deep(.hljs-number),
.marked-content :deep(.hljs-literal),
.marked-content :deep(.hljs-variable),
.marked-content :deep(.hljs-template-variable),
.marked-content :deep(.hljs-tag .hljs-attr) {
  color: #60a5fa;
}

.marked-content :deep(.hljs-string),
.marked-content :deep(.hljs-doctag) {
  color: #4ade80;
}

.marked-content :deep(.hljs-title),
.marked-content :deep(.hljs-section),
.marked-content :deep(.hljs-selector-id) {
  color: #a78bfa;
  font-weight: bold;
}

.marked-content :deep(.hljs-type),
.marked-content :deep(.hljs-class .hljs-title) {
  color: #a78bfa;
}

.marked-content :deep(.hljs-tag),
.marked-content :deep(.hljs-name),
.marked-content :deep(.hljs-attribute) {
  color: #34d399;
  font-weight: normal;
}

.marked-content :deep(.hljs-regexp),
.marked-content :deep(.hljs-link) {
  color: #fbbf24;
}

.marked-content :deep(.hljs-symbol),
.marked-content :deep(.hljs-bullet) {
  color: #60a5fa;
}

.marked-content :deep(.hljs-built_in),
.marked-content :deep(.hljs-builtin-name) {
  color: #60a5fa;
}

.marked-content :deep(.hljs-meta) {
  color: #34d399;
}

.marked-content :deep(.hljs-deletion) {
  background: #7f1d1d;
  color: #fecaca;
}

.marked-content :deep(.hljs-addition) {
  background: #14532d;
  color: #bbf7d0;
}

.marked-content :deep(.hljs-emphasis) {
  font-style: italic;
}

.marked-content :deep(.hljs-strong) {
  font-weight: bold;
}

/* 行内代码特有的高亮样式 */
.marked-content :deep(code.hljs .hljs-comment),
.marked-content :deep(code.hljs .hljs-quote) {
  color: #6b7280;
  font-style: italic;
}

.marked-content :deep(code.hljs .hljs-keyword),
.marked-content :deep(code.hljs .hljs-selector-tag),
.marked-content :deep(code.hljs .hljs-subst) {
  color: #0000ff;
  font-weight: bold;
}

.marked-content :deep(code.hljs .hljs-number),
.marked-content :deep(code.hljs .hljs-literal) {
  color: #098658;
}

.marked-content :deep(code.hljs .hljs-variable),
.marked-content :deep(code.hljs .hljs-template-variable) {
  color: #001080;
}

.marked-content :deep(code.hljs .hljs-string),
.marked-content :deep(code.hljs .hljs-doctag) {
  color: #a31515;
}

.marked-content :deep(code.hljs .hljs-title),
.marked-content :deep(code.hljs .hljs-section),
.marked-content :deep(code.hljs .hljs-selector-id) {
  color: #7c3aed;
  font-weight: bold;
}

.marked-content :deep(code.hljs .hljs-type),
.marked-content :deep(code.hljs .hljs-class .hljs-title) {
  color: #267f99;
}

.marked-content :deep(code.hljs .hljs-tag),
.marked-content :deep(code.hljs .hljs-name) {
  color: #800000;
}

.marked-content :deep(code.hljs .hljs-attribute) {
  color: #0451a5;
}

.marked-content :deep(code.hljs .hljs-regexp),
.marked-content :deep(code.hljs .hljs-link) {
  color: #d97706;
}

.marked-content :deep(code.hljs .hljs-symbol),
.marked-content :deep(code.hljs .hljs-bullet) {
  color: #2563eb;
}

.marked-content :deep(code.hljs .hljs-built_in),
.marked-content :deep(code.hljs .hljs-builtin-name) {
  color: #2563eb;
}

.marked-content :deep(code.hljs .hljs-function) {
  color: #795e26;
}

.marked-content :deep(code.hljs .hljs-params) {
  color: #001080;
}

.marked-content :deep(code.hljs .hljs-meta) {
  color: #059669;
}

.marked-content :deep(blockquote) {
  border-left: 4px solid #e2e8f0;
  padding: 0 12px;
  margin: 0.5em 0;
  color: #64748b;
  background: #f8fafc;
  border-radius: 0 4px 4px 0;
}

.marked-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.8em 0;
}

.marked-content :deep(th),
.marked-content :deep(td) {
  border: 1px solid #e2e8f0;
  padding: 6px 10px;
  text-align: left;
}

.marked-content :deep(th) {
  background-color: #f1f5f9;
  font-weight: 600;
  color: #1e293b;
}

.marked-content :deep(a) {
  color: #3b82f6;
  text-decoration: none;
}

.marked-content :deep(a:hover) {
  text-decoration: underline;
  color: #2563eb;
}

.marked-content :deep(hr) {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 1.5em 0;
}

.marked-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 0.5em 0;
}
</style>