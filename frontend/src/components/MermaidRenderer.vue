<template>
  <div class="mermaid-container">
    <div class="mermaid-toolbar">
      <div class="toolbar-group">
        <button @click="refreshDiagram" class="toolbar-button" title="刷新图表">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </button>
        <button @click="downloadSVG" class="toolbar-button" title="下载SVG">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
        </button>
        <button @click="toggleFullscreen" class="toolbar-button" title="全屏">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
          </svg>
        </button>
      </div>
      <div class="toolbar-group">
        <select v-model="selectedTheme" @change="updateTheme" class="theme-selector">
          <option value="default">默认主题</option>
          <option value="dark">暗色主题</option>
          <option value="forest">森林主题</option>
          <option value="neutral">中性主题</option>
        </select>
      </div>
    </div>
    
    <div ref="mermaidRef" class="mermaid-content">
      <!-- 加载指示器作为覆盖层 -->
      <div v-if="loading" class="loading-overlay">
        <div class="loading-indicator">
          <div class="spinner"></div>
          <span>正在渲染 Mermaid 图表...</span>
        </div>
      </div>
      
      <!-- 错误信息 -->
      <div v-if="error" class="error-indicator">
        <strong>Mermaid 渲染错误</strong>
        <p>{{ error }}</p>
        <details>
          <summary>查看 Mermaid 语法示例</summary>
          <div class="syntax-examples">
            <h4>流程图示例:</h4>
            <pre><code>flowchart TD
    A[开始] --> B{判断条件}
    B -->|是| C[执行操作]
    B -->|否| D[结束]
    C --> D</code></pre>
            
            <h4>时序图示例:</h4>
            <pre><code>sequenceDiagram
    participant A as 用户
    participant B as 系统
    A->>B: 发送请求
    B-->>A: 返回响应</code></pre>
          </div>
        </details>
      </div>
      
      <!-- Mermaid 图表容器 - 始终渲染 -->
      <div class="diagram-container" :class="{ 'has-error': error, 'is-loading': loading }">
        <div class="mermaid" :key="diagramId">{{ processedContent }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import mermaid from 'mermaid'

interface Props {
  content: string
  theme?: string
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'default'
})

const mermaidRef = ref<HTMLElement>()
const loading = ref(false)
const error = ref('')
const diagramId = ref(`mermaid-${Date.now()}`)
const selectedTheme = ref(props.theme)
const processedContent = ref('')

// 生成唯一的Mermaid ID
const generateMermaidId = () => {
  return `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// 初始化 Mermaid
const initMermaid = () => {
  mermaid.initialize({
    startOnLoad: false,
    theme: selectedTheme.value,
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      curve: 'basis',
      defaultRenderer: 'elk'
    },
    mindmap: {
      useMaxWidth: true,
      padding: 20
    },
    classDiagram: {
      useMaxWidth: true,
      htmlLabels: true
    },
    stateDiagram: {
      useMaxWidth: true
    },
    gantt: {
      useMaxWidth: true,
      htmlLabels: true,
      topAxis: true,
      leftAxis: true
    },
    pie: {
      useMaxWidth: true,
      textPosition: 0.5
    },
    gitgraph: {
      useMaxWidth: true,
      titleTopMargin: 25,
      diagramPadding: 8,
      nodePadding: 16
    },
    erDiagram: {
      useMaxWidth: true,
      direction: 'TB'
    },
    journey: {
      useMaxWidth: true,
      leftMargin: 100,
      rightMargin: 100,
      bottomMargin: 50
    },
    themeVariables: {
      primaryColor: '#3498db',
      primaryTextColor: '#333',
      primaryBorderColor: '#3498db',
      lineColor: '#666',
      secondaryColor: '#f8f9fa',
      tertiaryColor: '#e9ecef',
      background: '#ffffff',
      mainBkg: '#ffffff',
      secondBkg: '#f8f9fa',
      tertiaryBkg: '#e9ecef'
    }
  })
}

// 处理内容 - 简化版本，直接支持Mermaid语法
const processContent = (content: string): string => {
  if (!content) return ''
  
  let processed = content.trim()
  
  // 移除 PlantUML 的开始和结束标记
  processed = processed.replace(/@startuml\s*\n?/g, '')
  processed = processed.replace(/@enduml\s*\n?/g, '')
  
  // 移除无效的Mermaid定义和样式
  processed = processed.replace(/!define.*$/gm, '')
  processed = processed.replace(/classskin.*$/gm, '')
  processed = processed.replace(/skinparam.*$/gm, '')
  
  // 修复常见的语法问题
  processed = processed.replace(/"(\*)" *-- *"/g, '"*" -- "*"')  // 修复引号问题
  processed = processed.replace(/"(\d+)" *-- *"/g, '"$1" -- "*"')  // 修复数字节点
  processed = processed.replace(/-- *"\*"/g, '-- "*"')  // 修复右边的星号
  processed = processed.replace(/"\*" *--/g, '"*" --')  // 修复左边的星号
  
  // 移除重复的节点名
  processed = processed.replace(/(\w+)\1(\s+-->)/g, '$1$2')  // OrderOrder --> Order
  
  // 修复关键字后面缺少换行的问题
  processed = processed.replace(/(flowchart\s+\w+)(subgraph|classDiagram|sequenceDiagram|stateDiagram|gantt|pie|mindmap|gitgraph|erDiagram|journey)/gi, '$1\n$2')
  processed = processed.replace(/(classDiagram)(class|participant)/gi, '$1\n$2')
  processed = processed.replace(/(sequenceDiagram)(participant|note)/gi, '$1\n$2')
  
  // 标准化换行符
  processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  
  // 移除空行和多余的空格
  processed = processed.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
  
  console.log('处理后的内容:', processed)
  
  // 如果不是以 Mermaid 关键字开头，添加 flowchart TD
  const mermaidKeywords = ['flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'gantt', 'pie', 'mindmap', 'gitgraph', 'erDiagram', 'journey']
  const startsWithMermaidKeyword = mermaidKeywords.some(keyword => 
    processed.toLowerCase().startsWith(keyword.toLowerCase())
  )
  
  // 如果已经是Mermaid格式，直接返回
  if (startsWithMermaidKeyword) {
    return processed
  }
  
  // 否则添加flowchart TD前缀
  return `flowchart TD\n${processed}`
}

// 渲染 Mermaid
const renderMermaid = async () => {
  console.log('=== 开始渲染 Mermaid ===')
  console.log('props.content:', JSON.stringify(props.content, null, 2))
  
  if (!props.content) {
    console.log('❌ 没有内容')
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    console.log('✅ 开始处理内容')
    
    // 直接使用原始内容，不做任何处理
    const mermaidContent = props.content.trim()
    processedContent.value = mermaidContent
    
    console.log('✅ 原始内容:', mermaidContent)
    
    // 生成新的ID
    diagramId.value = generateMermaidId()
    
    console.log('✅ 生成ID:', diagramId.value)
    
    await nextTick()
    console.log('✅ nextTick 完成')
    
    // 等待DOM更新
    setTimeout(async () => {
      try {
        const element = mermaidRef.value?.querySelector('.mermaid')
        console.log('✅ 找到元素:', !!element)
        
        if (element) {
          console.log('✅ 元素内容:', element.textContent)
          
          if (element.textContent && element.textContent.trim()) {
            console.log('✅ 元素有内容，开始渲染')
            
            // 确保Mermaid已初始化
            initMermaid()
            
            console.log('✅ 调用 mermaid.run...')
            
            // 使用 Mermaid 11.x 的渲染方法
            const result = await mermaid.run({
              nodes: [element]
            })
            
            console.log('✅ mermaid.run 完成:', result)
            
            // 检查是否有SVG生成
            setTimeout(() => {
              const svg = element.querySelector('svg')
              if (svg) {
                console.log('✅ SVG生成成功!')
                console.log('SVG尺寸:', svg.getAttribute('width'), 'x', svg.getAttribute('height'))
              } else {
                console.error('❌ 没有生成SVG')
                console.log('元素HTML:', element.innerHTML)
              }
            }, 100)
          } else {
            console.error('❌ 元素内容为空')
            error.value = 'Mermaid元素内容为空'
          }
        } else {
          console.error('❌ 找不到Mermaid元素')
          console.log('容器HTML:', mermaidRef.value?.innerHTML)
          error.value = '找不到Mermaid元素'
        }
      } catch (renderError) {
        console.error('❌ 渲染错误:', renderError)
        console.error('错误详情:', renderError.message)
        error.value = `渲染错误: ${renderError.message}`
      } finally {
        loading.value = false
      }
    }, 200)
    
  } catch (err) {
    console.error('❌ 处理错误:', err)
    error.value = `处理错误: ${err.message}`
    loading.value = false
  }
}

// 刷新图表
const refreshDiagram = () => {
  renderMermaid()
}

// 更新主题
const updateTheme = () => {
  initMermaid()
  renderMermaid()
}

// 下载SVG
const downloadSVG = () => {
  const svgElement = mermaidRef.value?.querySelector('svg')
  if (svgElement) {
    const svgData = new XMLSerializer().serializeToString(svgElement)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `mermaid-diagram-${Date.now()}.svg`
    link.click()
    URL.revokeObjectURL(url)
  }
}

// 全屏切换
const toggleFullscreen = async () => {
  if (!mermaidRef.value) return
  
  const container = mermaidRef.value
  
  if (!document.fullscreenElement) {
    await container.requestFullscreen()
    container.classList.add('fullscreen-mode')
  } else {
    await document.exitFullscreen()
    container.classList.remove('fullscreen-mode')
  }
}

// 监听内容变化
watch(() => props.content, () => {
  renderMermaid()
}, { immediate: true })

// 监听主题变化
watch(() => props.theme, (newTheme) => {
  selectedTheme.value = newTheme
  updateTheme()
})

onMounted(() => {
  initMermaid()
})
</script>

<style scoped>
.mermaid-container {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  margin: 1rem 0;
}

.mermaid-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #ddd;
}

.toolbar-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.toolbar-button {
  padding: 0.25rem 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.2s;
}

.toolbar-button:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.theme-selector {
  padding: 0.25rem 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  font-size: 0.875rem;
}

.mermaid-content {
  padding: 1rem;
  min-height: 200px;
  position: relative;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: #666;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-indicator {
  color: #d32f2f;
  background: #ffebee;
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem;
}

.error-indicator details {
  margin-top: 1rem;
}

.syntax-examples {
  margin-top: 1rem;
}

.syntax-examples h4 {
  margin: 1rem 0 0.5rem 0;
  color: #333;
}

.syntax-examples pre {
  background: #f5f5f5;
  padding: 0.75rem;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.875rem;
  margin: 0.5rem 0;
}

.diagram-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  position: relative;
}

.diagram-container.has-error {
  opacity: 0.5;
}

.diagram-container.is-loading {
  opacity: 0.7;
}

.mermaid {
  text-align: center;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.mermaid-content.fullscreen-mode {
  padding: 2rem;
  background: white;
}

.mermaid-content.fullscreen-mode .diagram-container {
  min-height: 80vh;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .mermaid-toolbar {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .toolbar-group {
    width: 100%;
    justify-content: center;
  }
}
</style>