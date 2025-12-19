<template>
  <div class="plantuml-container">
    <div class="plantuml-toolbar">
      <div class="toolbar-left">
        <button 
          class="toolbar-btn" 
          :class="{ active: viewMode === 'diagram' }"
          @click="switchView('diagram')"
          title="显示图表"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="3" x2="9" y2="21"></line>
          </svg>
        </button>
        <button 
          class="toolbar-btn" 
          :class="{ active: viewMode === 'code' }"
          @click="switchView('code')"
          title="显示代码"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16,18 22,12 16,6"></polyline>
            <polyline points="8,6 2,12 8,18"></polyline>
          </svg>
        </button>
      </div>
      <div class="toolbar-right">
        <button 
          class="toolbar-btn" 
          @click="zoomIn"
          title="放大"
          :disabled="scale >= 2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
        <button 
          class="toolbar-btn" 
          @click="zoomOut"
          title="缩小"
          :disabled="scale <= 0.5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
        <button 
          class="toolbar-btn" 
          @click="resetZoom"
          title="重置缩放"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="1,4 1,10 7,10"></polyline>
            <line x1="23" y1="20" x2="13" y2="10"></line>
            <polyline points="23,20 17,20 17,14"></polyline>
            <line x1="1" y1="4" x2="11" y2="14"></line>
          </svg>
        </button>
        <button 
          class="toolbar-btn" 
          @click="downloadDiagram"
          title="下载图表"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7,10 12,15 17,10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
        <button 
          class="toolbar-btn" 
          @click="toggleFullscreen"
          title="全屏"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
          </svg>
        </button>
      </div>
    </div>
    
    <div ref="plantumlRef" class="plantuml-content">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <span>正在渲染 PlantUML 图表...</span>
      </div>
      
      <div 
        v-if="viewMode === 'diagram' && imageUrl" 
        class="diagram-container"
        @mousedown="startDrag"
        @mousemove="onDrag"
        @mouseup="stopDrag"
        @mouseleave="stopDrag"
        :style="{ cursor: isDragging ? 'grabbing' : 'grab' }"
      >
        <img 
          :src="imageUrl" 
          alt="PlantUML Diagram"
          @error="handleImageError"
          @load="handleImageLoad"
          :style="{ transform: `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`, transformOrigin: 'center center' }"
        />
      </div>
      
      <div v-if="viewMode === 'code'" class="code-container">
        <pre class="code-block"><code>{{ content }}</code></pre>
      </div>
      
      <div v-if="error" class="error">
        <strong>PlantUML 渲染错误</strong>
        <p>{{ error }}</p>
        <details style="margin-top: 10px;">
          <summary>查看 PlantUML 语法示例</summary>
          <div style="margin-top: 10px;">
            <h4>类图示例：</h4>
            <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 12px;">@startuml
class Animal {
  +String name
  +int age
  +eat()
  +sleep()
}

class Dog {
  +String breed
  +bark()
}

Animal <|-- Dog
@enduml</pre>
            
            <h4>时序图示例：</h4>
            <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 12px;">@startuml
actor User
participant "First Class" as A
participant "Second Class" as B
participant "Last Class" as C

User -> A : DoWork
activate A

A -> B : Create Request
activate B
B -> C : DoWork
activate C
C --> B : WorkDone
destroy C

B --> A : Request Created
deactivate B
A --> User : Done
deactivate A
@enduml</pre>

            <h4>用例图示例：</h4>
            <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 12px;">@startuml
left to right direction
skinparam packageStyle rectangle
actor 用户
actor 管理员
rectangle 订单系统 {
  用户 -- (创建订单)
  用户 -- (查看订单)
  管理员 -- (管理订单)
  管理员 -- (生成报表)
}
@enduml</pre>
          </div>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { encode } from 'plantuml-encoder'

interface Props {
  content: string
  serverUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
  serverUrl: 'https://www.plantuml.com/plantuml/svg/'
})

const plantumlRef = ref<HTMLElement>()
const imageUrl = ref('')
const loading = ref(false)
const error = ref('')
const viewMode = ref<'diagram' | 'code'>('diagram') // 'diagram' or 'code'
const scale = ref(1) // Zoom scale
const offsetX = ref(0) // 拖拽偏移量X
const offsetY = ref(0) // 拖拽偏移量Y
const isDragging = ref(false) // 是否正在拖拽
const dragStartX = ref(0) // 拖拽起始X
const dragStartY = ref(0) // 拖拽起始Y
const isFullscreen = ref(false)

// 渲染 PlantUML
const renderPlantUML = async () => {
  if (!props.content.trim()) {
    imageUrl.value = ''
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    // 确保 content 包含 @startuml 和 @enduml
    let processedContent = props.content.trim()
    if (!processedContent.includes('@startuml')) {
      processedContent = `@startuml\n${processedContent}\n@enduml`
    }
    
    // 编码 PlantUML 内容
    const encoded = encode(processedContent)
    
    // 构建图片 URL
    imageUrl.value = props.serverUrl + encoded
  } catch (err) {
    console.error('PlantUML 编码错误:', err)
    error.value = err instanceof Error ? err.message : 'PlantUML 编码失败'
  } finally {
    loading.value = false
  }
}

const handleImageError = () => {
  error.value = '图片加载失败，请检查 PlantUML 语法是否正确'
  imageUrl.value = ''
}

const handleImageLoad = () => {
  loading.value = false
}

// 切换视图模式
const switchView = (mode: 'diagram' | 'code') => {
  viewMode.value = mode
}

// 放大
const zoomIn = () => {
  if (scale.value < 2) {
    // 保存当前中心点位置
    const oldScale = scale.value;
    scale.value = Math.min(2, scale.value + 0.1);
    
    // 调整偏移量以保持中心点位置不变
    const scaleRatio = scale.value / oldScale;
    offsetX.value = offsetX.value * scaleRatio;
    offsetY.value = offsetY.value * scaleRatio;
  }
}

// 缩小
const zoomOut = () => {
  if (scale.value > 0.5) {
    // 保存当前中心点位置
    const oldScale = scale.value;
    scale.value = Math.max(0.5, scale.value - 0.1);
    
    // 调整偏移量以保持中心点位置不变
    const scaleRatio = scale.value / oldScale;
    offsetX.value = offsetX.value * scaleRatio;
    offsetY.value = offsetY.value * scaleRatio;
  }
}

// 重置缩放
const resetZoom = () => {
  scale.value = 1
  offsetX.value = 0
  offsetY.value = 0
}

// 开始拖拽
const startDrag = (e: MouseEvent) => {
  // 移除放大状态限制，随时可以拖拽
  
  isDragging.value = true;
  dragStartX.value = e.clientX - offsetX.value;
  dragStartY.value = e.clientY - offsetY.value;
  e.preventDefault();
}

// 拖拽中
const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return;
  
  offsetX.value = e.clientX - dragStartX.value;
  offsetY.value = e.clientY - dragStartY.value;
}

// 停止拖拽
const stopDrag = () => {
  isDragging.value = false;
}

// 下载图表
const downloadDiagram = async () => {
  if (!imageUrl.value) return
  
  try {
    // 获取图片数据
    const response = await fetch(imageUrl.value)
    const blob = await response.blob()
    
    // 创建下载链接
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `plantuml-diagram-${Date.now()}.svg`
    
    // 触发下载
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // 释放对象URL
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('下载失败:', err)
    alert('下载失败: ' + (err instanceof Error ? err.message : '未知错误'))
  }
}

// 切换全屏
const toggleFullscreen = async () => {
  if (!plantumlRef.value) return
  
  try {
    if (!isFullscreen.value) {
      // 进入全屏
      if (plantumlRef.value?.requestFullscreen) {
        await plantumlRef.value.requestFullscreen()
      } else if ((plantumlRef.value as any)?.webkitRequestFullscreen) {
        await (plantumlRef.value as any).webkitRequestFullscreen()
      } else if ((plantumlRef.value as any)?.msRequestFullscreen) {
        await (plantumlRef.value as any).msRequestFullscreen()
      }
      isFullscreen.value = true
      // 添加全屏类
      plantumlRef.value.classList.add('fullscreen-mode')
    } else {
      // 退出全屏
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if ((document as any)?.webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen()
      } else if ((document as any)?.msExitFullscreen) {
        await (document as any).msExitFullscreen()
      }
      isFullscreen.value = false
      // 移除全屏类
      plantumlRef.value.classList.remove('fullscreen-mode')
    }
  } catch (err) {
    console.error('全屏操作失败:', err)
  }
}

// 监听全屏变化事件
const handleFullscreenChange = () => {
  isFullscreen.value = !!(document.fullscreenElement || 
                          (document as any).webkitFullscreenElement || 
                          (document as any).msFullscreenElement)
}

onMounted(() => {
  renderPlantUML()
  
  // 监听全屏变化事件
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('msfullscreenchange', handleFullscreenChange);
})

watch(() => props.content, () => {
  renderPlantUML()
})

// 组件卸载时移除事件监听器
onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.removeEventListener('msfullscreenchange', handleFullscreenChange);
})
</script>

<style scoped>
.plantuml-container {
  margin: 1rem 0;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.plantuml-toolbar {
  display: flex;
  justify-content: space-between;
  background-color: #f6f8fa;
  border-bottom: 1px solid #d0d7de;
  padding: 8px 12px;
  align-items: center;
}

.toolbar-left, .toolbar-right {
  display: flex;
  gap: 4px;
}

.toolbar-btn {
  background: none;
  border: 1px solid #d0d7de;
  border-radius: 4px;
  padding: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: #57606a;
}

.toolbar-btn:hover:not(:disabled) {
  background-color: #e6e9eb;
  color: #1f2937;
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-btn.active {
  background-color: #0969da;
  border-color: #0969da;
  color: white;
}

.plantuml-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 16px;
  overflow: auto; /* 添加滚动条 */
}

.diagram-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 400px; /* 设置固定高度 */
  min-height: 200px;
  overflow: hidden; /* 隐藏溢出内容 */
  position: relative; /* 为定位做准备 */
}

/* 全屏模式下的样式 - 使用类选择器 */
.plantuml-content.fullscreen-mode .diagram-container {
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
}

/* 全屏模式下的样式 - 使用伪类选择器 */
.plantuml-content:fullscreen .diagram-container {
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
}

/* 兼容不同浏览器的全屏前缀 */
.plantuml-content:-webkit-full-screen .diagram-container {
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
}

.plantuml-content:-moz-full-screen .diagram-container {
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
}

.plantuml-content:-ms-fullscreen .diagram-container {
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
}

.diagram-container img {
  max-width: none; /* 移除max-width限制，让图片可以任意缩放 */
  height: auto;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.1s ease;
  max-height: none; /* 确保图片可以任意缩放 */
}

.code-container {
  width: 100%;
  overflow-x: auto;
}

.code-block {
  background: #f6f8fa;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  padding: 16px;
  margin: 0;
  overflow-x: auto;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  color: #24292f;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #666;
  padding: 2rem;
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

.error {
  color: #ff4757;
  padding: 1rem;
  border: 1px solid #ff4757;
  border-radius: 4px;
  background-color: #ffe0e0;
  max-width: 600px;
  text-align: left;
}

.error h4 {
  margin: 10px 0 5px 0;
  color: #ff4757;
}

.error pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>