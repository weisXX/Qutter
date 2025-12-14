<template>
  <div class="markdown-comparison">
    <div class="comparison-header">
      <h3>Markdown渲染器对比</h3>
      <div class="toggle-container">
        <button 
          class="toggle-button" 
          :class="{ active: showBoth }" 
          @click="showBoth = true"
        >
          对比显示
        </button>
        <button 
          class="toggle-button" 
          :class="{ active: !showBoth }" 
          @click="showBoth = false"
        >
          单独显示
        </button>
      </div>
    </div>
    
    <div class="comparison-container" :class="{ 'side-by-side': showBoth }">
      <!-- Marked渲染器 -->
      <div class="renderer-panel marked-panel">
        <div class="panel-header">
          <h4>Marked 渲染器</h4>
          <span class="render-time">{{ markedRenderTime }}ms</span>
        </div>
        <div class="panel-content">
          <MarkedRenderer :content="content" />
        </div>
      </div>
      
      <!-- Markdown-it渲染器 -->
      <div class="renderer-panel markdownit-panel">
        <div class="panel-header">
          <h4>Markdown-it 渲染器</h4>
          <span class="render-time">{{ markdownitRenderTime }}ms</span>
        </div>
        <div class="panel-content">
          <MarkdownItRenderer :content="content" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import MarkedRenderer from './MarkedRenderer.vue'
import MarkdownItRenderer from './MarkdownItRenderer.vue'

interface Props {
  content: string
}

const props = defineProps<Props>()

const showBoth = ref(true)
const markedRenderTime = ref(0)
const markdownitRenderTime = ref(0)
</script>

<style scoped>
.markdown-comparison {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.comparison-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.comparison-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.toggle-container {
  display: flex;
  gap: 8px;
}

.toggle-button {
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  color: #6b7280;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-button:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.toggle-button.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.comparison-container {
  display: flex;
  flex-direction: column;
}

.comparison-container.side-by-side {
  flex-direction: row;
}

.renderer-panel {
  flex: 1;
  border-bottom: 1px solid #e2e8f0;
}

.comparison-container.side-by-side .renderer-panel {
  border-bottom: none;
  border-right: 1px solid #e2e8f0;
}

.comparison-container.side-by-side .renderer-panel:last-child {
  border-right: none;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
}

.panel-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.render-time {
  font-size: 12px;
  color: #6b7280;
  background: #e5e7eb;
  padding: 2px 6px;
  border-radius: 4px;
}

.panel-content {
  padding: 20px;
  max-height: 600px;
  overflow-y: auto;
}

/* 滚动条样式 */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

@media (max-width: 768px) {
  .comparison-container.side-by-side {
    flex-direction: column;
  }
  
  .comparison-container.side-by-side .renderer-panel {
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .comparison-container.side-by-side .renderer-panel:last-child {
    border-bottom: none;
  }
}
</style>