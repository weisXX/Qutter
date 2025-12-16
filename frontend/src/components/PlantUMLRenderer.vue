<template>
  <div class="plantuml-container">
    <div ref="plantumlRef" class="plantuml-content">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <span>正在渲染 PlantUML 图表...</span>
      </div>
      <img 
        v-if="imageUrl" 
        :src="imageUrl" 
        alt="PlantUML Diagram"
        @error="handleImageError"
        @load="handleImageLoad"
      />
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
import { ref, onMounted, watch } from 'vue'
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

onMounted(() => {
  renderPlantUML()
})

watch(() => props.content, () => {
  renderPlantUML()
})
</script>

<style scoped>
.plantuml-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1rem 0;
  overflow-x: auto;
}

.plantuml-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 100%;
  min-height: 200px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
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

img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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