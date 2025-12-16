<template>
  <div class="chart-container">
    <canvas ref="chartRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale
} from 'chart.js'

// 注册 Chart.js 组件
Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale
)

interface Props {
  chartData: any
  chartType: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'polarArea'
  options?: any
}

const props = withDefaults(defineProps<Props>(), {
  chartType: 'bar',
  options: () => ({})
})

const chartRef = ref<HTMLCanvasElement>()
let chartInstance: Chart | null = null

// 默认配置
const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    title: {
      display: true,
      text: '图表'
    }
  }
}

onMounted(() => {
  createChart()
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
  }
})

watch([() => props.chartData, () => props.chartType, () => props.options], () => {
  updateChart()
})

const createChart = () => {
  if (!chartRef.value || !props.chartData) return
  
  // 销毁旧实例
  if (chartInstance) {
    chartInstance.destroy()
  }
  
  // 合并配置
  const mergedOptions = {
    ...defaultOptions,
    ...props.options
  }
  
  // 创建新图表
  chartInstance = new Chart(chartRef.value, {
    type: props.chartType,
    data: props.chartData,
    options: mergedOptions
  })
}

const updateChart = () => {
  if (!chartInstance) {
    createChart()
    return
  }
  
  if (props.chartData) {
    chartInstance.data = props.chartData
    chartInstance.options = {
      ...defaultOptions,
      ...props.options
    }
    chartInstance.update()
  }
}
</script>

<style scoped>
.chart-container {
  position: relative;
  height: 400px;
  width: 100%;
  margin: 1rem 0;
}

canvas {
  max-width: 100%;
}
</style>