<template>
  <div class="function-plot-container">
    <div v-if="loading" class="loading-indicator">
      <div class="spinner"></div>
      <p>正在生成函数图像...</p>
    </div>
    <div v-else-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="retryPlot" class="retry-button">重试</button>
    </div>
    <img v-else-if="plotImage" :src="plotImage" :alt="options.title" class="function-plot-image" />
    <div v-else class="placeholder">
      <p>函数图像将在此显示</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { generateFunctionPlot } from '../services/api'

interface PlotOptions {
  xMin?: number
  xMax?: number
  yMin?: number
  yMax?: number
  width?: number
  height?: number
  title?: string
  color?: string
  grid?: boolean
  dpi?: number
}

interface Props {
  expression: string
  options?: PlotOptions
}

const props = withDefaults(defineProps<Props>(), {
  options: () => ({
    xMin: -10,
    xMax: 10,
    yMin: -10,
    yMax: 10,
    width: 800,
    height: 600,
    title: '函数图像',
    color: '#1f77b4',
    grid: true,
    dpi: 100
  })
})

const loading = ref(false)
const error = ref('')
const plotImage = ref('')

// 预处理表达式，确保格式正确
const preprocessExpression = (expr: string): string | string[] => {
  if (!expr) return ''
  
  // 尝试解析JSON格式的表达式
  try {
    const parsed = JSON.parse(expr)
    if (Array.isArray(parsed)) {
      console.log('检测到表达式数组:', parsed)
      return parsed
    } else if (parsed.expressions && Array.isArray(parsed.expressions)) {
      console.log('检测到对象中的表达式数组:', parsed.expressions)
      return parsed.expressions
    }
  } catch (e) {
    // 不是JSON格式，继续处理
  }
  
  let result = expr.trim()
  
  // 处理等号，提取右侧表达式
  const equalsIndex = result.indexOf('=')
  if (equalsIndex !== -1) {
    const leftSide = result.substring(0, equalsIndex).trim()
    const rightSide = result.substring(equalsIndex + 1).trim()
    
    console.log('检测到方程格式:', result)
    console.log('左侧:', leftSide, '右侧:', rightSide)
    
    // 如果是简单的 y= 或 f(x)= 格式，只使用右侧表达式
    if (leftSide === 'y' || leftSide === 'f(x)' || leftSide.match(/^f\([^)]*\)$/)) {
      console.log('提取右侧表达式:', rightSide)
      return rightSide
    }
    
    // 其他隐式方程现在也支持，直接返回完整表达式
    console.log('支持隐式方程:', result)
    return result
  }
  
  // 处理显式函数
  console.log('处理显式函数:', result)
  return result
}

// 生成函数图像
const generatePlot = async () => {
  if (!props.expression) {
    error.value = '表达式不能为空'
    return
  }

  // 防止重复请求
  if (loading.value) {
    return
  }

  loading.value = true
  error.value = ''
  plotImage.value = ''

  try {
    // 预处理表达式
    const processedExpression = preprocessExpression(props.expression)
    
    console.log('原始表达式:', props.expression)
    console.log('预处理后表达式:', processedExpression)
    
    // 确保表达式不为空
    const finalExpression = processedExpression || props.expression
    console.log('最终发送的表达式:', finalExpression)
    
    // 如果是数组，需要转换为JSON字符串发送
    let expressionToSend = finalExpression
    if (Array.isArray(finalExpression)) {
      expressionToSend = JSON.stringify(finalExpression)
    }
    
    const response = await generateFunctionPlot({
      expression: expressionToSend,
      options: props.options
    })

    if (response.success && response.image) {
      plotImage.value = response.image
      console.log('函数图像生成成功:', response.metadata)
    } else {
      error.value = response.error || '生成函数图像失败'
      console.error('函数图像生成失败:', response)
    }
  } catch (err: any) {
    console.error('生成函数图像时出错:', err)
    error.value = err.message || '网络请求失败'
  } finally {
    loading.value = false
  }
}

// 重试生成图像
const retryPlot = () => {
  // debugger
  generatePlot()
}

// 防抖函数，避免频繁请求
let debounceTimer: NodeJS.Timeout | null = null

const debouncedGeneratePlot = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    generatePlot()
  }, 500) // 500ms防抖
}

// 监听表达式变化
onMounted(() => {
  generatePlot()
})

// 只监听表达式变化，不使用deep监听
watch(() => props.expression, () => {
  debouncedGeneratePlot()
})

// 单独监听关键的选项变化，避免深层监听
watch([
  () => props.options?.xMin,
  () => props.options?.xMax,
  () => props.options?.yMin,
  () => props.options?.yMax,
  () => props.options?.width,
  () => props.options?.height,
  () => props.options?.color,
  () => props.options?.title
], () => {
  debouncedGeneratePlot()
})
</script>

<style scoped>
.function-plot-container {
  position: relative;
  margin: 1rem 0;
  display: flex;
  justify-content: center;
  min-height: 200px;
}

.function-plot-image {
  max-width: 100%;
  height: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #e74c3c;
  text-align: center;
}

.retry-button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.retry-button:hover {
  background-color: #2980b9;
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #999;
  border: 1px dashed #ddd;
  border-radius: 4px;
}
</style>