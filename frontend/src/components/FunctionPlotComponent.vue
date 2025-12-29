<template>
  <div class="function-plot-component">
    <div class="plot-container" ref="plotContainerRef"></div>
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import FunctionPlotter from '../utils/func-plot'

interface Props {
  expression: string
  options?: {
    xRange?: [number, number]
    yRange?: [number, number]
    color?: string
    width?: number
    height?: number
    title?: string
  }
}

const props = withDefaults(defineProps<Props>(), {
  options: () => ({
    xRange: [-10, 10],
    yRange: [-10, 10],
    color: '#007bff',
    width: 600,
    height: 400,
    title: '函数图像'
  })
})

const plotContainerRef = ref<HTMLElement>()
const error = ref('')
let plotter: FunctionPlotter | null = null

const initPlotter = () => {
  if (!plotContainerRef.value) return
  
  try {
    // 设置容器尺寸
    const container = plotContainerRef.value
    container.style.width = `${props.options?.width || 600}px`
    container.style.height = `${props.options?.height || 400}px`
    
    // 创建绘图器实例
    plotter = new FunctionPlotter(container)
    console.log('函数绘图器初始化成功')
  } catch (err: any) {
    error.value = `初始化失败: ${err.message}`
    console.error('函数绘图器初始化错误:', err)
  }
}

const drawPlot = async () => {
  if (!plotter || !props.expression) return
  
  try {
    error.value = ''
    
    // 等待DOM更新
    await nextTick()
    // 使用智能绘图方法
    plotter.smartPlot(props.expression, {
      xRange: props.options?.xRange,
      yRange: props.options?.yRange,
      color: props.options?.color,
      width: props.options?.width,
      height: props.options?.height
    })
    
    console.log('函数绘制成功:', props.expression)
  } catch (err: any) {
    error.value = `绘制失败: ${err.message}`
    console.error('函数绘制错误:', err)
  }
}

// 监听表达式变化
watch(() => props.expression, () => {
  drawPlot()
}, { immediate: false })

// 监听选项变化
watch(() => props.options, () => {
  drawPlot()
}, { deep: true, immediate: false })

onMounted(() => {
  initPlotter()
  drawPlot()
})
</script>

<style scoped>
.function-plot-component {
  margin: 1rem 0;
}

.plot-container {
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background: white;
  overflow: hidden;
}

.error-message {
  color: #e74c3c;
  padding: 0.5rem;
  background: #ffeaea;
  border: 1px solid #e74c3c;
  border-radius: 4px;
  margin-top: 0.5rem;
  font-size: 0.9rem;
}
</style>