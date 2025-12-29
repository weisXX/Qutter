<template>
  <div class="frontend-function-plot-container">
    <div class="input-section">
      <div class="input-group">
        <label for="user-input">自然语言输入：</label>
        <textarea id="user-input" v-model="userInput" placeholder="输入数学表达式或自然语言描述，如：画一个圆、sin函数、抛物线等" rows="3"
          class="user-input" @input="handleInputChange"></textarea>
      </div>

      <div class="example-buttons">
        <span class="example-label">示例：</span>
        <button v-for="example in examples" :key="example.text" @click="setExample(example)" class="example-btn">
          {{ example.text }}
        </button>
      </div>

      <div class="input-controls">
        <button @click="generatePlot" :disabled="!userInput.trim() || loading" class="generate-btn">
          <span v-if="loading" class="loading-spinner"></span>
          {{ loading ? '解析中...' : '绘制' }}
        </button>

        <div class="parse-mode-toggle">
          <label class="toggle-label">解析方式:</label>
          <div class="toggle-buttons">
            <button class="toggle-btn" :class="{ active: !useLLM }" @click="useLLM = false">
              本地解析
            </button>
            <button class="toggle-btn" :class="{ active: useLLM }" @click="useLLM = true">
              大模型解析
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-indicator">
      <div class="spinner"></div>
      <p>正在解析并生成函数图像...</p>
    </div>

    <div v-else-if="error" class="error-section">
      <div class="error-icon">⚠️</div>
      <h3>解析失败</h3>
      <p class="error-message">{{ error }}</p>
      <div v-if="suggestion" class="suggestion">
        <strong>建议：</strong>{{ suggestion }}
      </div>
      <div v-if="examples && examples.length > 0" class="error-examples">
        <p>试试这些示例：</p>
        <div class="example-list">
          <button v-for="example in examples.slice(0, 4)" :key="example.text" @click="setExample(example)"
            class="example-btn small">
            {{ example.text }}
          </button>
        </div>
      </div>
      <button @click="retryPlot" class="retry-button">重试</button>
    </div>

    <div v-else-if="result" class="result-section">
      <div class="result-header">
        <h3>{{ result.title }}</h3>
        <div class="result-badges">
          <span class="badge type-badge">{{ getFunctionTypeLabel(result.function_type) }}</span>
        </div>
      </div>

      <div class="result-details">
        <div class="detail-item">
          <label>原始输入：</label>
          <span class="original-input">{{ result.original_input }}</span>
        </div>

        <div class="detail-item">
          <label>函数表达式：</label>
          <div class="function-list">
            <code v-for="(fn, index) in result.functions" :key="index" class="function-code">
              y = {{ fn.fn }}
            </code>
          </div>
        </div>

        <div class="detail-item">
          <label>LaTeX格式：</label>
          <div class="latex-display" v-html="result.latex"></div>
        </div>
      </div>

      <div class="plot-section">
        <h4>函数图像</h4>
        <div ref="plotContainerRef" id="plot-container" class="function-plot-container plot-container"></div>
      </div>
    </div>

    <div v-else class="placeholder">
      <div class="placeholder-icon">📊</div>
      <p>输入数学表达式或自然语言描述，开始绘图</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { generateFrontendFunctionPlot } from '../services/api'

// 动态导入function-plot
let functionPlot: any = null

const loadFunctionPlot = async () => {
  try {
    const module = await import('function-plot')
    functionPlot = module.default
    console.log('function-plot loaded successfully')
  } catch (error) {
    console.error('Failed to load function-plot:', error)
  }
}

interface Example {
  text: string;
  description?: string;
}

const userInput = ref('')
const loading = ref(false)
const error = ref('')
const suggestion = ref('')
const result = ref<any>(null)
const plotContainerRef = ref(null)
const useLLM = ref(false)

const examples: Example[] = [
  { text: '画一个圆', description: '单位圆' },
  { text: 'sin(x)', description: '正弦函数' },
  { text: '抛物线', description: '二次函数' },
  { text: 'cos(x)', description: '余弦函数' },
  { text: '椭圆', description: '椭圆方程' },
  { text: '三次函数', description: '三次函数' },
  { text: '指数函数', description: '指数函数' },
  { text: '对数函数', description: '对数函数' }
]

const setExample = (example: Example) => {
  userInput.value = example.text
  error.value = ''
  suggestion.value = ''
  result.value = null
}

const handleInputChange = () => {
  error.value = ''
  suggestion.value = ''
  result.value = null
}

const generatePlot = async () => {
  console.log('userInput.value:', plotContainerRef.value)
  if (!userInput.value.trim()) {
    error.value = '请输入数学表达式或描述'
    return
  }

  loading.value = true
  error.value = ''
  suggestion.value = ''
  result.value = null

  try {
    const request = {
      input: userInput.value.trim(),
      useLLM: useLLM.value
    }

    const response = await generateFrontendFunctionPlot(request)

    if (response.success && response.data) {
      result.value = response.data
      console.log('前端函数绘制成功:', response)

      if (result.value.parse_method === 'llm') {
        const plotyModule = await import('../utils/func-plot')
        await nextTick()
        console.log('plotContainer.value:', plotContainerRef.value)
        setTimeout(() => {


          // functionPlot = plotyModule.default
          const plotter = new plotyModule.default('plot-container')
          plotter.smartPlot(result.value.expression);
          // const type = plotter.detectExpressionType(result.value.expression);
          // console.log('开始绘图，类型:', type, '表达式:', result.value.expression);

          // if (type === 'implicit') {
          //   plotter.smartPlot(result.value.expression, {
          //     xRange: [-5, 5],
          //     yRange: [-5, 5],
          //     resolution: 200,
          //     color: '#FF6B6B'
          //   });
          // } else if (type === '3d') {
          //   plotter.smartPlot(result.value.expression, {
          //     xRange: [-5, 5],
          //     yRange: [-5, 5],
          //     resolution: 50
          //   });
          // } else {
          //   plotter.smartPlot(result.value.expression);
          // }
        }, 1000);
      } else {
        // 等待DOM更新后绘制图表
        await nextTick()
        await renderPlot()
      }
    } else {
      error.value = response.error || '前端函数绘制失败'
      suggestion.value = response.suggestion || ''
    }
  } catch (err: any) {
    console.error('前端函数绘制失败:', err)
    error.value = err.message || '网络请求失败'
  } finally {
    loading.value = false
  }
}

const renderPlot = async () => {
  // debugger
  console.log('result.value:', result.value)
  console.log('plotContainer.value:', plotContainerRef.value)
  if (!result.value) return

  // debugger
  // 确保function-plot已加载
  if (!functionPlot) {
    await loadFunctionPlot()
  }

  if (!functionPlot) {
    error.value = 'function-plot库加载失败'
    return
  }

  try {
    // // 清空容器
    // plotContainer.value.innerHTML = ''

    // // 确保容器有正确的ID
    // plotContainer.value.id = 'function-plot-target'

    // 延迟执行，确保DOM完全准备好
    setTimeout(() => {
      try {
        // 获取容器尺寸
        const containerWidth = plotContainerRef.value?.clientWidth || 600
        const containerHeight = plotContainerRef.value?.clientHeight || 400

        // 准备绘图配置
        const plotConfig = {
          target: document.querySelector('.plot-container'),
          width: containerWidth,
          height: containerHeight,
          xAxis: {
            domain: result.value.xDomain,
            label: 'x'
          },
          yAxis: {
            domain: result.value.yDomain,
            label: 'y'
          },
          grid: true,
          data: result.value.functions.map((fn: any) => ({
            fn: fn.fn,
            color: fn.color,
            graphType: fn.graphType
          }))
        }

        console.log('绘图配置:', plotConfig)
        console.log('函数数据:', result.value.functions)

        // 绘制函数
        functionPlot(plotConfig)
      } catch (innerErr) {
        console.error('绘图执行失败:', innerErr)
        error.value = '绘图执行失败: ' + (innerErr as Error).message
      }
    }, 100)
  } catch (err) {
    console.error('绘图失败:', err)
    error.value = '绘图失败: ' + (err as Error).message
  }
}

const retryPlot = () => {
  generatePlot()
}

const getFunctionTypeLabel = (type: string) => {
  const typeLabels: Record<string, string> = {
    'implicit': '隐函数',
    'explicit': '显函数',
    'parametric': '参数方程',
    'polar': '极坐标'
  }
  return typeLabels[type] || type
}

onMounted(() => {
  // 组件挂载时预加载function-plot
  loadFunctionPlot()
})
</script>

<style scoped>
.frontend-function-plot-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem;
}

.input-section {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.input-group {
  margin-bottom: 1rem;
}

.input-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #333;
}

.user-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e1e5e9;
  border-radius: 6px;
  font-size: 1rem;
  resize: vertical;
  transition: border-color 0.3s;
}

.user-input:focus {
  outline: none;
  border-color: #3498db;
}

.example-buttons {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.example-label {
  font-size: 0.9rem;
  color: #666;
  margin-right: 0.5rem;
}

.example-btn {
  padding: 0.4rem 0.8rem;
  background: #e3f2fd;
  color: #1976d2;
  border: 1px solid #bbdefb;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.3s;
}

.example-btn:hover {
  background: #bbdefb;
  transform: translateY(-1px);
}

.example-btn.small {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
}

.input-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.generate-btn {
  padding: 0.75rem 1.5rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.parse-mode-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toggle-label {
  font-size: 0.9rem;
  color: #666;
  font-weight: 500;
}

.toggle-buttons {
  display: flex;
  background: #f1f3f4;
  border-radius: 6px;
  padding: 0.25rem;
}

.toggle-btn {
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  color: #666;
  transition: all 0.2s;
}

.toggle-btn.active {
  background: #3498db;
  color: white;
}

.toggle-btn:hover:not(.active) {
  background: #e1e5e9;
}

.generate-btn:hover:not(:disabled) {
  background: #2980b9;
}

.generate-btn:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #ffffff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.loading-indicator {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

.error-section {
  text-align: center;
  padding: 2rem;
  color: #e74c3c;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-section h3 {
  margin-bottom: 0.5rem;
  color: #c0392b;
}

.error-message {
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.suggestion {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
  text-align: left;
  color: #856404;
}

.error-examples {
  margin-bottom: 1.5rem;
}

.example-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.retry-button {
  padding: 0.75rem 1.5rem;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.retry-button:hover {
  background: #c0392b;
}

.result-section {
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  padding: 1.5rem;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e1e5e9;
}

.result-header h3 {
  margin: 0;
  color: #333;
}

.result-badges {
  display: flex;
  gap: 0.5rem;
}

.badge {
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.type-badge {
  background: #e8f5e8;
  color: #27ae60;
}

.result-details {
  margin-bottom: 1.5rem;
}

.detail-item {
  margin-bottom: 1rem;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.detail-item label {
  font-weight: 600;
  color: #333;
  min-width: 100px;
}

.original-input {
  color: #666;
  font-style: italic;
}

.function-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.function-code {
  background: #f8f9fa;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  color: #e74c3c;
}

.latex-display {
  background: #f8f9fa;
  padding: 0.5rem;
  border-radius: 4px;
  font-family: 'Times New Roman', serif;
}

.plot-section {
  margin-bottom: 1.5rem;
}

.plot-section h4 {
  margin-bottom: 1rem;
  color: #333;
}

.function-plot-container {
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background: white;
  overflow: hidden;
  width: 100%;
  height: 600px;
  /* min-width: 300px;
  min-height: 200px; */
}

.placeholder {
  text-align: center;
  padding: 3rem 2rem;
  color: #999;
}

.placeholder-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.placeholder p {
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .frontend-function-plot-container {
    padding: 0.5rem;
  }

  .input-section {
    padding: 1rem;
  }

  .result-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .example-buttons {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>