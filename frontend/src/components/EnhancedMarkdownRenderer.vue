<template>
  <div class="enhanced-markdown-content">
    <template v-for="(block, index) in processedBlocks" :key="index">
      <!-- Mermaid 图表 -->
      <MermaidRenderer 
        v-if="block.type === 'mermaid'"
        :content="block.content"
        :theme="mermaidTheme"
      />
      
      <!-- PlantUML 图表 -->
      <PlantUMLRenderer
        v-else-if="block.type === 'plantuml'"
        :content="block.content"
      />
      
      <!-- Chart.js 图表 -->
      <ChartRenderer
        v-else-if="block.type === 'chart'"
        :chart-data="block.data"
        :chart-type="block.chartType"
        :options="block.options"
      />
      
      <!-- 普通 Markdown 内容 -->
      <div 
        v-else-if="block.type === 'markdown'"
        class="markdown-block"
        v-html="block.content"
      ></div>
    </template>
  </div>
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
import MermaidRenderer from './MermaidRenderer.vue'
import ChartRenderer from './ChartRenderer.vue'
import PlantUMLRenderer from './PlantUMLRenderer.vue'

interface Props {
  content: string
  mermaidTheme?: 'default' | 'dark' | 'forest' | 'neutral'
}

const props = withDefaults(defineProps<Props>(), {
  mermaidTheme: 'default'
})

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
md.renderer.rules.list_item_open = (tokens: any, idx: number) => {
  return '<li>'
}

md.renderer.rules.list_item_close = (tokens: any, idx: number) => {
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
md.renderer.rules.code_inline = (tokens: any, idx: number) => {
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

// 处理内容，分离图表和普通 Markdown
const processedBlocks = computed(() => {
  if (!props.content) return []
  
  const blocks: Array<{
    type: 'mermaid' | 'plantuml' | 'chart' | 'markdown'
    content?: string
    data?: any
    chartType?: string
    options?: any
  }> = []
  
  // 分割内容为行
  const lines = props.content.split('\n')
  let currentMarkdownLines: string[] = []
  let inMermaidBlock = false
  let inPlantUMLBlock = false
  let inChartBlock = false
  let chartContent = ''
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // 检测 Mermaid 代码块
    if (line === '```mermaid') {
      // 保存之前的 Markdown 内容
      if (currentMarkdownLines.length > 0) {
        const markdownContent = currentMarkdownLines.join('\n')
        blocks.push({
          type: 'markdown',
          content: renderMarkdown(markdownContent)
        })
        currentMarkdownLines = []
      }
      inMermaidBlock = true
      chartContent = ''
      continue
    }
    
    if (line === '```' && inMermaidBlock) {
      inMermaidBlock = false
      blocks.push({
        type: 'mermaid',
        content: chartContent.trim()
      })
      continue
    }
    
    // 检测 PlantUML 代码块
    if (line === '```plantuml' || line === '```puml') {
      // 保存之前的 Markdown 内容
      if (currentMarkdownLines.length > 0) {
        const markdownContent = currentMarkdownLines.join('\n')
        blocks.push({
          type: 'markdown',
          content: renderMarkdown(markdownContent)
        })
        currentMarkdownLines = []
      }
      inPlantUMLBlock = true
      chartContent = ''
      continue
    }
    
    if (line === '```' && inPlantUMLBlock) {
      inPlantUMLBlock = false
      blocks.push({
        type: 'plantuml',
        content: chartContent.trim()
      })
      continue
    }
    
    // 检测 Chart.js 代码块
    if (line === '```chart') {
      // 保存之前的 Markdown 内容
      if (currentMarkdownLines.length > 0) {
        const markdownContent = currentMarkdownLines.join('\n')
        blocks.push({
          type: 'markdown',
          content: renderMarkdown(markdownContent)
        })
        currentMarkdownLines = []
      }
      inChartBlock = true
      chartContent = ''
      continue
    }
    
    if (line === '```' && inChartBlock) {
      inChartBlock = false
      try {
        const chartConfig = parseChartConfig(chartContent.trim())
        blocks.push({
          type: 'chart',
          ...chartConfig
        })
      } catch (error) {
        console.error('图表配置解析错误:', error)
        // 将错误信息作为 Markdown 显示
        blocks.push({
          type: 'markdown',
          content: `<div class="error">图表配置错误: ${error}</div>`
        })
      }
      continue
    }
    
    // 收集内容
    if (inMermaidBlock || inPlantUMLBlock || inChartBlock) {
      chartContent += lines[i] + '\n'
    } else {
      currentMarkdownLines.push(lines[i])
    }
  }
  
  // 处理最后的 Markdown 内容
  if (currentMarkdownLines.length > 0) {
    const markdownContent = currentMarkdownLines.join('\n')
    blocks.push({
      type: 'markdown',
      content: renderMarkdown(markdownContent)
    })
  }
  
  return blocks
})

// 渲染 Markdown 内容
const renderMarkdown = (content: string) => {
  // 预处理内容，处理HTML标签和数学公式
  let processedContent = content
    // 移除可能干扰数学公式的HTML标签
    .replace(/<br[^>]*>/g, ' ') // 将<br>替换为空格
    .replace(/<br\s*\/>/g, ' ') // 处理自闭合<br/>
    .replace(/&nbsp;/g, ' ') // 替换不间断空格
    // 处理数学公式中的特殊字符
    .replace(/\\cdotp/g, '/')
    // 临时保护数学公式中的特殊符号
    .replace(/\$(.*?)\$/g, (match, formula) => {
      // 移除公式内的HTML标签
      const cleanFormula = formula.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
      return `$${cleanFormula}$`
    })
    .replace(/\$\$(.*?)\$\$/g, (match, formula) => {
      // 移除公式内的HTML标签
      const cleanFormula = formula.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
      return `$$${cleanFormula}$$`
    })
  
  return md.render(processedContent)
}

// 解析图表配置
const parseChartConfig = (configText: string) => {
  try {
    // 尝试解析 JSON 配置
    const config = JSON.parse(configText)
    
    return {
      data: config.data,
      chartType: config.type || 'bar',
      options: config.options || {}
    }
  } catch (error) {
    // 如果不是 JSON，尝试解析简单的文本格式
    const lines = configText.split('\n')
    const config: any = {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: '数据',
          data: [],
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {}
    }
    
    let currentSection = ''
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine || trimmedLine.startsWith('#')) continue
      
      if (trimmedLine.toLowerCase().startsWith('type:')) {
        config.type = trimmedLine.substring(5).trim()
      } else if (trimmedLine.toLowerCase().startsWith('title:')) {
        config.options.plugins = config.options.plugins || {}
        config.options.plugins.title = {
          display: true,
          text: trimmedLine.substring(6).trim()
        }
      } else if (trimmedLine.toLowerCase().startsWith('labels:')) {
        currentSection = 'labels'
      } else if (trimmedLine.toLowerCase().startsWith('data:')) {
        currentSection = 'data'
      } else if (currentSection === 'labels') {
        const labels = trimmedLine.split(',').map(l => l.trim())
        config.data.labels = config.data.labels.concat(labels)
      } else if (currentSection === 'data') {
        const data = trimmedLine.split(',').map(d => parseFloat(d.trim()))
        config.data.datasets[0].data = config.data.datasets[0].data.concat(data)
      }
    }
    
    return {
      data: config.data,
      chartType: config.type,
      options: config.options
    }
  }
}
</script>

<style scoped>
.enhanced-markdown-content {
  line-height: 1.6;
  color: #1f2937;
}

.markdown-block {
  line-height: 1.6;
  color: #1f2937;
}

.error {
  color: #ff4757;
  padding: 1rem;
  border: 1px solid #ff4757;
  border-radius: 4px;
  background-color: #ffe0e0;
  margin: 1rem 0;
}

/* 继承原有的 Markdown 样式 */
.markdown-block :deep(h1),
.markdown-block :deep(h2),
.markdown-block :deep(h3),
.markdown-block :deep(h4),
.markdown-block :deep(h5),
.markdown-block :deep(h6) {
  margin: 1em 0 0.5em 0;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
}

.markdown-block :deep(h1) { font-size: 1.8em; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
.markdown-block :deep(h2) { font-size: 1.5em; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; }
.markdown-block :deep(h3) { font-size: 1.3em; }
.markdown-block :deep(h4) { font-size: 1.2em; }
.markdown-block :deep(h5) { font-size: 1.1em; }
.markdown-block :deep(h6) { font-size: 1em; }

.markdown-block :deep(p) {
  margin: 0.8em 0;
  line-height: 1.6;
}

.markdown-block :deep(ul),
.markdown-block :deep(ol) {
  margin: 0.8em 0;
  padding-left: 2em;
}

.markdown-block :deep(ul) {
  list-style-type: disc;
}

.markdown-block :deep(ol) {
  list-style-type: decimal;
}

.markdown-block :deep(li) {
  margin: 0.3em 0;
  line-height: 1.6;
}

/* 嵌套列表样式 */
.markdown-block :deep(ul ul),
.markdown-block :deep(ol ol),
.markdown-block :deep(ul ol),
.markdown-block :deep(ol ul) {
  margin: 0.3em 0;
  padding-left: 1.5em;
}

.markdown-block :deep(ul ul) {
  list-style-type: circle;
}

.markdown-block :deep(ul ul ul) {
  list-style-type: square;
}

/* 行内代码样式 */
.markdown-block :deep(code:not(.hljs)) {
  background-color: #f1f5f9;
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  color: #1f2937;
}

/* 代码块样式 */
.markdown-block :deep(pre) {
  background-color: #f6f8fa;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  margin: 1em 0;
}

.markdown-block :deep(pre code) {
  background-color: transparent;
  padding: 0;
  color: #1f2937;
  font-size: 0.9em;
  line-height: 1.5;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

/* 行内代码高亮样式 */
.markdown-block :deep(code.hljs) {
  background-color: #f1f5f9;
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  color: #1f2937;
  display: inline;
}

/* 任务列表样式 */
.markdown-block :deep(.task-list-item) {
  list-style: none;
  margin-left: -1.5em;
}

.markdown-block :deep(.task-list-item input) {
  margin-right: 0.5em;
}

/* 引用块样式 */
.markdown-block :deep(blockquote) {
  border-left: 4px solid #d0d7de;
  padding: 0 1em;
  margin: 1em 0;
  color: #57606a;
  background: #f6f8fa;
  border-radius: 0 6px 6px 0;
}

.markdown-block :deep(blockquote p) {
  margin: 0.5em 0;
}

/* 表格样式 */
.markdown-block :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.markdown-block :deep(th),
.markdown-block :deep(td) {
  border: 1px solid #d0d7de;
  padding: 8px 12px;
  text-align: left;
}

.markdown-block :deep(th) {
  background-color: #f6f8fa;
  font-weight: 600;
  color: #1f2937;
}

.markdown-block :deep(tr:nth-child(even)) {
  background-color: #f6f8fa;
}

/* 链接样式 */
.markdown-block :deep(a) {
  color: #0969da;
  text-decoration: none;
}

.markdown-block :deep(a:hover) {
  text-decoration: underline;
  color: #0550ae;
}

/* 水平线样式 */
.markdown-block :deep(hr) {
  border: none;
  border-top: 1px solid #d0d7de;
  margin: 2em 0;
}

/* 图片样式 */
.markdown-block :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 0.5em 0;
}

/* 目录样式 */
.markdown-block :deep(.table-of-contents) {
  background: #f6f8fa;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  padding: 16px;
  margin: 1em 0;
}

.markdown-block :deep(.table-of-contents ul) {
  margin: 0;
  padding-left: 1.5em;
}

.markdown-block :deep(.table-of-contents li) {
  margin: 0.2em 0;
}

/* 代码块深色主题覆盖 */
.markdown-block :deep(.hljs) {
  background: #f6f8fa !important;
  color: #1f2937 !important;
}

/* 数学公式样式 */
.markdown-block :deep(.katex) {
  font-size: 1.1em;
}

.markdown-block :deep(.katex-display) {
  margin: 1em 0;
  text-align: center;
}

.markdown-block :deep(.katex-error) {
  color: #ff4757;
}
</style>