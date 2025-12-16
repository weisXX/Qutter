<template>
  <div class="mermaid-container">
    <div ref="mermaidRef" class="mermaid"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import mermaid from 'mermaid'

interface Props {
  content: string
  theme?: 'default' | 'dark' | 'forest' | 'neutral'
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'default'
})

const mermaidRef = ref<HTMLElement>()

// 初始化 Mermaid
onMounted(() => {
  mermaid.initialize({
    startOnLoad: false,
    theme: props.theme,
    securityLevel: 'loose',
    fontFamily: 'monospace',
    fontSize: 16,
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      curve: 'basis'
    }
  })
  
  renderDiagram()
})

// 监听内容和主题变化
watch([() => props.content, () => props.theme], () => {
  renderDiagram()
})

const renderDiagram = async () => {
  if (!mermaidRef.value || !props.content.trim()) return
  
  try {
    // 清空容器
    mermaidRef.value.innerHTML = ''
    
    // 生成唯一ID
    const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // 渲染图表
    const { svg } = await mermaid.render(id, props.content)
    mermaidRef.value.innerHTML = svg
  } catch (error) {
    console.error('Mermaid 渲染错误:', error)
    
    // 提供更友好的错误信息
    let errorMessage = '图表渲染错误'
    if (error instanceof Error) {
      if (error.message.includes('inactivate an inactive participant')) {
        errorMessage = '时序图错误：尝试停用一个不存在的参与者。请检查所有参与者名称是否正确，确保在使用 deactivate/activate 之前参与者已经被定义。'
      } else if (error.message.includes('participant')) {
        errorMessage = '时序图错误：参与者定义有问题。请检查参与者名称是否重复或语法是否正确。'
      } else if (error.message.includes('syntax')) {
        errorMessage = '语法错误：请检查 Mermaid 语法是否正确。'
      } else {
        errorMessage = `渲染错误：${error.message}`
      }
    }
    
    mermaidRef.value.innerHTML = `
      <div class="error">
        <strong>${errorMessage}</strong>
        <details style="margin-top: 10px;">
          <summary>查看详细错误信息</summary>
          <pre style="margin-top: 5px; font-size: 12px; overflow: auto;">${error instanceof Error ? error.stack : error}</pre>
        </details>
        <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
          <strong>时序图正确示例：</strong>
          <pre style="margin-top: 5px; font-size: 12px;">sequenceDiagram
    participant 用户
    participant 前端
    participant 服务器
    
    用户->>前端: 发送请求
    前端->>服务器: API调用
    服务器-->>前端: 返回数据
    前端-->>用户: 显示结果</pre>
        </div>
      </div>
    `
  }
}
</script>

<style scoped>
.mermaid-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1rem 0;
  overflow-x: auto;
}

.mermaid {
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 100%;
}

.error {
  color: #ff4757;
  padding: 1rem;
  border: 1px solid #ff4757;
  border-radius: 4px;
  background-color: #ffe0e0;
}

:deep(.mermaid svg) {
  max-width: 100%;
  height: auto;
}
</style>