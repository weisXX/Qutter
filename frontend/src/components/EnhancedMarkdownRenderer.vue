<template>
  <div class="enhanced-markdown-content">
    <template v-for="(block, index) in processedBlocks" :key="index">
      <!-- Mermaid 图表 -->
      <MermaidRenderer 
        v-if="block.type === 'mermaid'"
        :content="block.content"
        :theme="mermaidTheme"
      />
      
      <!-- Mermaid 图表 -->
<MermaidRenderer
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
      
      <!-- 函数绘制 -->
      <FunctionPlotRenderer
        v-else-if="block.type === 'function'"
        :expression="block.expression"
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
import { computed, ref } from 'vue'
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
import FunctionPlotRenderer from './FunctionPlotRenderer.vue'

interface Props {
  content: string
  mermaidTheme?: 'default' | 'dark' | 'forest' | 'neutral'
}

const props = withDefaults(defineProps<Props>(), {
  mermaidTheme: 'default'
})

// 生成唯一代码ID
const codeIdCounter = ref(0)
const generateCodeId = (): string => {
  return `code-${++codeIdCounter.value}-${Date.now()}`
}

// 创建markdown-it实例
const md = new MarkdownIt({
  html: true,        // 允许HTML标签
  linkify: true,     // 自动将URL转换为链接
  typographer: true, // 启用印刷美化
  breaks: false,     // 禁用自动转换换行符，避免干扰数学公式
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
    strict: false,
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

// 自定义代码块渲染规则，添加工具栏
md.renderer.rules.fence = (tokens: any, idx: number, options: any, env: any, renderer: any): string => {
  const token = tokens[idx]
  const langName = token.info ? md.utils.escapeHtml(token.info.trim()) : ''
  const langClass = langName ? ` class="hljs language-${langName}"` : ' class="hljs"'
  const codeId = generateCodeId()
  
  let highlighted = token.content
  if (langName && hljs.getLanguage(langName)) {
    try {
      highlighted = hljs.highlight(token.content, { language: langName, ignoreIllegals: true }).value
    } catch (err) {
      console.warn('代码高亮失败:', err)
    }
  } else if (!langName) {
    try {
      highlighted = hljs.highlightAuto(token.content).value
    } catch (err) {
      console.warn('自动代码高亮失败:', err)
    }
  }
  
  return `<div class="code-block-container">
    <div class="code-toolbar">
      <span class="code-language">${langName || 'text'}</span>
      <div class="toolbar-buttons">
        <button class="download-button" onclick="downloadCode('${codeId}', '${langName || 'code'}')" title="下载代码">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7,10 12,15 17,10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
        <button class="copy-button" onclick="copyCode('${codeId}')" title="复制代码">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      </div>
    </div>
    <pre class="hljs"><code id="${codeId}"${langClass}>${highlighted}</code></pre>
  </div>`
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


// 添加全局复制和下载函数
if (typeof window !== 'undefined') {
  (window as any).copyCode = async (codeId: string) => {
    try {
      const codeElement = document.getElementById(codeId)
      if (codeElement) {
        await navigator.clipboard.writeText(codeElement.textContent || '')
        // 可以添加成功提示
        const button = codeElement.closest('.code-block-container')?.querySelector('.copy-button')
        if (button) {
          const originalHTML = button.innerHTML
          button.innerHTML = '✓'
          button.style.color = '#10b981'
          setTimeout(() => {
            button.innerHTML = originalHTML
            button.style.color = ''
          }, 2000)
        }
      }
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  (window as any).downloadCode = (codeId: string, langName: string) => {
    try {
      const codeElement = document.getElementById(codeId)
      if (codeElement) {
        const codeText = codeElement.textContent || ''
        const blob = new Blob([codeText], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        // 根据语言确定文件扩展名
        const extension = getLanguageExtension(langName) || 'txt'
        link.download = `code_${Date.now()}.${extension}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        // 下载成功提示
        const button = codeElement.closest('.code-block-container')?.querySelector('.download-button')
        if (button) {
          const originalHTML = button.innerHTML
          button.innerHTML = '✓'
          button.style.color = '#10b981'
          setTimeout(() => {
            button.innerHTML = originalHTML
            button.style.color = ''
          }, 2000)
        }
      }
    } catch (err) {
      console.error('下载失败:', err)
    }
  }

  // 根据语言名称获取文件扩展名
  const getLanguageExtension = (langName: string): string => {
    const langMap: { [key: string]: string } = {
      'javascript': 'js',
      'typescript': 'ts',
      'java': 'java',
      'python': 'py',
      'c': 'c',
      'cpp': 'cpp',
      'c++': 'cpp',
      'php': 'php',
      'html': 'html',
      'css': 'css',
      'sql': 'sql',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'markdown': 'md',
      'go': 'go',
      'rust': 'rs',
      'swift': 'swift',
      'kotlin': 'kt',
      'scala': 'scala',
      'ruby': 'rb',
      'perl': 'pl',
      'r': 'r',
      'matlab': 'm',
      'shell': 'sh',
      'bash': 'sh',
      'dockerfile': 'Dockerfile',
      'makefile': 'Makefile'
    }
    return langMap[langName.toLowerCase()] || 'txt'
  }
}

// 处理内容，分离图表和普通 Markdown
const processedBlocks = computed(() => {
  if (!props.content) return []
  
  const blocks: Array<{
    type: 'mermaid' | 'chart' | 'function' | 'markdown'
    content?: string
    data?: any
    chartType?: string
    expression?: string
    options?: any
  }> = []
  
  // 分割内容为行
  const lines = props.content.split('\n')
  let currentMarkdownLines: string[] = []
  let inMermaidBlock = false
  let inPlantUMLBlock = false
  let inChartBlock = false
  let inFunctionPlotBlock = false
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
    
    // 检测函数绘制代码块
    if (line === '```function' || line === '```plot' || line === '```function-plot') {
      // 保存之前的 Markdown 内容
      if (currentMarkdownLines.length > 0) {
        const markdownContent = currentMarkdownLines.join('\n')
        blocks.push({
          type: 'markdown',
          content: renderMarkdown(markdownContent)
        })
        currentMarkdownLines = []
      }
      inFunctionPlotBlock = true
      chartContent = ''
      continue
    }
    
    if (line === '```' && inFunctionPlotBlock) {
      inFunctionPlotBlock = false
      try {
        const plotConfig = parseFunctionPlotConfig(chartContent.trim())
        blocks.push({
          type: 'function',
          ...plotConfig
        })
      } catch (error) {
        console.error('函数绘制配置解析错误:', error)
        // 将错误信息作为 Markdown 显示
        blocks.push({
          type: 'markdown',
          content: `<div class="error">函数绘制配置错误: ${error}</div>`
        })
      }
      continue
    }
    
    // 收集内容
    if (inMermaidBlock || inPlantUMLBlock || inChartBlock || inFunctionPlotBlock) {
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
const renderMarkdown = (content: string): string => {
  console.log(content)
  
  // 更智能的预处理：只处理数学公式外的HTML标签
  let processedContent = content
  
  // 首先，保护数学公式区域
  const formulaRegex = /(\$\$.*?\$\$|\\\[.*?\\\]|\\\(.*?\\\)|\$.*?\$)/gs
  const parts: string[] = []
  let lastIndex = 0
  let match
  
  while ((match = formulaRegex.exec(content)) !== null) {
    // 添加公式前的文本
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index)
      // 只对非公式区域进行HTML标签清理
      parts.push(textBefore
        .replace(/<br[^>]*>/g, '\n') // 将<br>替换为换行符
        .replace(/&nbsp;/g, ' ') // 替换不间断空格
      )
    }
    // 添加公式本身（不进行任何处理）
    parts.push(match[0])
    lastIndex = formulaRegex.lastIndex
  }
  
  // 添加最后一段文本
  if (lastIndex < content.length) {
    const textAfter = content.slice(lastIndex)
    parts.push(textAfter
      .replace(/<br[^>]*>/g, '\n') // 将<br>替换为换行符
      .replace(/&nbsp;/g, ' ') // 替换不间断空格
    )
  }
  
  // 如果没有匹配到公式，使用原始内容
  if (parts.length === 0) {
    processedContent = content
      .replace(/<br[^>]*>/g, '\n') // 将<br>替换为换行符
      .replace(/&nbsp;/g, ' ') // 替换不间断空格
  } else {
    processedContent = parts.join('')
  }
  
  return md.render(processedContent).replace(/\\cdotp/g, '.')
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

// 解析函数绘制配置
const parseFunctionPlotConfig = (configText: string) => {
  try {
    // 尝试解析 JSON 配置
    const config = JSON.parse(configText)
    
    return {
      expression: config.expression || config.function || '',
      options: {
        xMin: config.xMin || -10,
        xMax: config.xMax || 10,
        yMin: config.yMin || -10,
        yMax: config.yMax || 10,
        width: config.width || 600,
        height: config.height || 400,
        title: config.title || '函数图像',
        color: config.color || '#1f77b4'
      }
    }
  } catch (error) {
    // 如果不是 JSON，尝试解析简单的文本格式
    const lines = configText.split('\n')
    let expression = ''
    const options: any = {
      xMin: -10,
      xMax: 10,
      yMin: -10,
      yMax: 10,
      width: 600,
      height: 400,
      title: '函数图像',
      color: '#1f77b4'
    }
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine || trimmedLine.startsWith('#')) continue
      
      if (trimmedLine.toLowerCase().startsWith('expression:') || trimmedLine.toLowerCase().startsWith('function:')) {
        expression = trimmedLine.substring(trimmedLine.indexOf(':') + 1).trim()
      } else if (trimmedLine.toLowerCase().startsWith('x-min:')) {
        options.xMin = parseFloat(trimmedLine.substring(6).trim())
      } else if (trimmedLine.toLowerCase().startsWith('x-max:')) {
        options.xMax = parseFloat(trimmedLine.substring(6).trim())
      } else if (trimmedLine.toLowerCase().startsWith('y-min:')) {
        options.yMin = parseFloat(trimmedLine.substring(6).trim())
      } else if (trimmedLine.toLowerCase().startsWith('y-max:')) {
        options.yMax = parseFloat(trimmedLine.substring(6).trim())
      } else if (trimmedLine.toLowerCase().startsWith('title:')) {
        options.title = trimmedLine.substring(6).trim()
      } else if (trimmedLine.toLowerCase().startsWith('color:')) {
        options.color = trimmedLine.substring(6).trim()
      } else if (trimmedLine.toLowerCase().startsWith('width:')) {
        options.width = parseInt(trimmedLine.substring(6).trim(), 10)
      } else if (trimmedLine.toLowerCase().startsWith('height:')) {
        options.height = parseInt(trimmedLine.substring(8).trim(), 10)
      } else if (!expression && !trimmedLine.startsWith('x-') && !trimmedLine.startsWith('y-') && !trimmedLine.startsWith('title:') && !trimmedLine.startsWith('color:') && !trimmedLine.startsWith('width:') && !trimmedLine.startsWith('height:')) {
        // 如果没有明确指定表达式，且当前行不是选项，则认为是表达式
        expression = trimmedLine
      }
    }
    
    return {
      expression: expression || configText.trim(),
      options: options
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

/* 代码块工具栏样式 */
.markdown-block :deep(.code-block-container) {
  position: relative;
  margin: 1em 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #d0d7de;
  white-space: normal;
}

.markdown-block :deep(.code-toolbar) {
  background-color: #f6f8fa;
  padding: 6px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #d0d7de;
  font-size: 0.8em;
  color: #57606a;
}

.markdown-block :deep(.code-language) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-weight: 600;
}

.markdown-block :deep(.toolbar-buttons) {
  display: flex;
  gap: 8px;
}

.markdown-block :deep(.copy-button), .markdown-block :deep(.download-button) {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: #57606a;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
}

.markdown-block :deep(.copy-button):hover, .markdown-block :deep(.download-button):hover {
  background-color: #e6e9eb;
  color: #1f2937;
}

.markdown-block :deep(.copy-button):active, .markdown-block :deep(.download-button):active {
  transform: scale(0.95);
}

.markdown-block :deep(pre) {
  margin: 0;
  border-radius: 0;
}

.markdown-block :deep(.hljs) {
  background: #f6f8fa !important;
  color: #1f2937 !important;
  border-radius: 0;
  margin: 0;
  padding: 16px;
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