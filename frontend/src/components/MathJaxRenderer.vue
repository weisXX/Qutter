<template>
  <div class="mathjax-content">
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
        ref="mathElements"
      ></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, nextTick, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import markdownItTaskLists from 'markdown-it-task-lists'
import markdownItTOC from 'markdown-it-table-of-contents'
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

const mathElements = ref<HTMLElement[]>([])

// 动态加载 MathJax 脚本
const loadMathJaxScript = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 检查是否已经加载
    if (window.MathJax) {
      resolve()
      return
    }

    // 配置 MathJax
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: true,
        processEnvironments: true,
        packages: {'[+]': ['base', 'ams', 'noerrors', 'noundefined']}
      },
      loader: {
        load: ['[tex]/ams', '[tex]/newcommand']
      },
      options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
        ignoreHtmlClass: 'tex2jax_ignore',
        processHtmlClass: 'tex2jax_process',
        // 禁用语音探索器以避免加载错误
        sre: {
          speech: false
        }
      },
      startup: {
        typeset: false,
        ready: () => {
          MathJax.startup.defaultReady()
          resolve()
        }
      }
    }

    // 创建并加载 MathJax 脚本
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js'
    script.async = true
    script.onload = () => {
      // 等待 MathJax 完全初始化
      if (window.MathJax && window.MathJax.startup && window.MathJax.startup.promise) {
        window.MathJax.startup.promise.then(() => {
          resolve()
        }).catch(err => {
          console.error('MathJax 初始化失败:', err)
          reject(err)
        })
      } else {
        resolve()
      }
    }
    script.onerror = (err) => {
      console.error('MathJax 脚本加载失败:', err)
      reject(err)
    }
    document.head.appendChild(script)
  })
}

// 加载 MathJax
const loadMathJax = async () => {
  if (!window.MathJax || !window.MathJax.typesetPromise) {
    try {
      await loadMathJaxScript()
    } catch (error) {
      console.error('MathJax 加载失败:', error)
    }
  }
}

// 创建markdown-it实例
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false,
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

// 自定义列表项渲染规则
md.renderer.rules.list_item_open = (tokens: any, idx: number): string => '<li>'
md.renderer.rules.list_item_close = (tokens: any, idx: number): string => '</li>'

// 自定义段落渲染规则
md.renderer.rules.paragraph_open = (tokens: any, idx: number, options: any, env: any, renderer: any): string => {
  const parentTokens = tokens.slice(0, idx).reverse()
  const isInListItem = parentTokens.some((token: any) => token.type === 'list_item_open')
  return isInListItem ? '<span style="display: inline;">' : '<p>'
}

md.renderer.rules.paragraph_close = (tokens: any, idx: number, options: any, env: any, renderer: any): string => {
  const parentTokens = tokens.slice(0, idx).reverse()
  const isInListItem = parentTokens.some((token: any) => token.type === 'list_item_open')
  return isInListItem ? '</span>' : '</p>'
}

// 自定义渲染规则，处理行内代码
md.renderer.rules.code_inline = (tokens: any, idx: number): string => {
  const token = tokens[idx]
  const code = token.content
  
  const detectedLang = detectLanguage(code.trim())
  
  if (detectedLang && hljs.getLanguage(detectedLang)) {
    try {
      const highlighted = hljs.highlight(code.trim(), { language: detectedLang }).value
      return `<code class="hljs language-${detectedLang}">${highlighted}</code>`
    } catch (err) {
      console.warn('行内代码高亮失败:', err)
    }
  }
  
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
  if (/function\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=|=>|\{.*\}|\[\]|\.\w+|console\.|require\(|import\s+/.test(code)) {
    return 'javascript'
  }
  
  if (/public\s+class|private\s+\w+\s+\w+|public\s+static\s+void|System\.out\.println|String\[\]\s+args|new\s+\w+\(\)|@Override/.test(code)) {
    return 'java'
  }
  
  if (/def\s+\w+|import\s+\w+|from\s+\w+\s+import|print\(|if\s+__name__\s*==\s*['"]__main__['"]|:\s*\n/.test(code)) {
    return 'python'
  }
  
  if (/\{\s*[\w-]+:\s*[^}]+\}|\.[\w-]+\s*\{|#[\w-]+\s*\{|@media|@import/.test(code)) {
    return 'css'
  }
  
  if (/&lt;\/?\w+[^&gt;]*&gt;|&lt;div|&lt;span|&lt;p|&lt;h[1-6]|class=|id=/.test(code)) {
    return 'html'
  }
  
  if (/SELECT\s+.*\s+FROM|INSERT\s+INTO|UPDATE\s+.*\s+SET|DELETE\s+FROM|CREATE\s+TABLE|DROP\s+TABLE/i.test(code)) {
    return 'sql'
  }
  
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
  
  const lines = props.content.split('\n')
  let currentMarkdownLines: string[] = []
  let inMermaidBlock = false
  let inPlantUMLBlock = false
  let inChartBlock = false
  let chartContent = ''
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    if (line === '```mermaid') {
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
    
    if (line === '```plantuml' || line === '```puml') {
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
    
    if (line === '```chart') {
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
        blocks.push({
          type: 'markdown',
          content: `<div class="error">图表配置错误: ${error}</div>`
        })
      }
      continue
    }
    
    if (inMermaidBlock || inPlantUMLBlock || inChartBlock) {
      chartContent += lines[i] + '\n'
    } else {
      currentMarkdownLines.push(lines[i])
    }
  }
  
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
const renderMarkdown = (content: string): string => {
  let processedContent = content
  
  // 保护数学公式区域，避免被HTML处理影响
  const formulaRegex = /(\$\$.*?\$\$|\\\[.*?\\\]|\\\(.*?\\\)|\$.*?\$)/gs
  const parts: string[] = []
  let lastIndex = 0
  let match
  
  while ((match = formulaRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index)
      parts.push(textBefore
        .replace(/<br[^>]*>/g, '\n')
        .replace(/&nbsp;/g, ' ')
      )
    }
    parts.push(match[0])
    lastIndex = formulaRegex.lastIndex
  }
  
  if (lastIndex < content.length) {
    const textAfter = content.slice(lastIndex)
    parts.push(textAfter
      .replace(/<br[^>]*>/g, '\n')
      .replace(/&nbsp;/g, ' ')
    )
  }
  
  if (parts.length === 0) {
    processedContent = content
      .replace(/<br[^>]*>/g, '\n')
      .replace(/&nbsp;/g, ' ')
  } else {
    processedContent = parts.join('')
  }
  
  return md.render(processedContent)
}

// 解析图表配置
const parseChartConfig = (configText: string) => {
  try {
    const config = JSON.parse(configText)
    return {
      data: config.data,
      chartType: config.type || 'bar',
      options: config.options || {}
    }
  } catch (error) {
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

// 渲染 MathJax
const renderMathJax = async () => {
  await loadMathJax()
  await nextTick()
  
  // 等待一下确保 DOM 完全更新
  await new Promise(resolve => setTimeout(resolve, 300))
  
  if (window.MathJax) {
    try {
      // 如果有 mathElements，只渲染这些元素
      if (mathElements.value.length > 0) {
        if (window.MathJax.typesetPromise) {
          await window.MathJax.typesetPromise(mathElements.value)
        } else if (window.MathJax.typeset) {
          window.MathJax.typeset(mathElements.value)
        }
      } else {
        // 如果没有特定元素，渲染整个文档
        if (window.MathJax.typesetPromise) {
          await window.MathJax.typesetPromise()
        } else if (window.MathJax.typeset) {
          window.MathJax.typeset()
        }
      }
    } catch (error) {
      console.error('MathJax 渲染错误:', error)
    }
  }
}

onMounted(() => {
  renderMathJax()
})

watch(() => props.content, () => {
  renderMathJax()
}, { deep: true })

// 扩展 Window 接口
declare global {
  interface Window {
    MathJax: any
  }
}
</script>

<style scoped>
.mathjax-content {
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

/* Markdown 样式 */
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

.markdown-block :deep(code:not(.hljs)) {
  background-color: #f1f5f9;
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  color: #1f2937;
}

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

.markdown-block :deep(code.hljs) {
  background-color: #f1f5f9;
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  color: #1f2937;
  display: inline;
}

.markdown-block :deep(.task-list-item) {
  list-style: none;
  margin-left: -1.5em;
}

.markdown-block :deep(.task-list-item input) {
  margin-right: 0.5em;
}

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

.markdown-block :deep(a) {
  color: #0969da;
  text-decoration: none;
}

.markdown-block :deep(a:hover) {
  text-decoration: underline;
  color: #0550ae;
}

.markdown-block :deep(hr) {
  border: none;
  border-top: 1px solid #d0d7de;
  margin: 2em 0;
}

.markdown-block :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 0.5em 0;
}

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

.markdown-block :deep(.hljs) {
  background: #f6f8fa !important;
  color: #1f2937 !important;
}

/* MathJax 样式 */
.markdown-block :deep(.MathJax) {
  font-size: 1.1em;
}

.markdown-block :deep(.MathJax_Display) {
  margin: 1em 0;
  text-align: center;
}

.markdown-block :deep(.MathJax_Error) {
  color: #ff4757;
}

.math-display {
  margin: 1em 0;
  text-align: center;
}
</style>