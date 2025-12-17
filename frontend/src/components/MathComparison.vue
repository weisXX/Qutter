<template>
  <div class="math-comparison">
    <h2>数学公式渲染器对比</h2>
    
    <div class="controls">
      <button @click="runPerformanceTest" :disabled="isTesting">
        {{ isTesting ? '测试中...' : '运行性能测试' }}
      </button>
      <div class="test-results" v-if="performanceResults">
        <div class="result-item">
          <span class="label">KaTeX 渲染时间:</span>
          <span class="value">{{ performanceResults.katex }}ms</span>
        </div>
        <div class="result-item">
          <span class="label">MathJax 渲染时间:</span>
          <span class="value">{{ performanceResults.mathjax }}ms</span>
        </div>
        <div class="result-item">
          <span class="label">更快的引擎:</span>
          <span class="value winner">{{ performanceResults.winner }}</span>
        </div>
      </div>
    </div>

    <div class="test-formulas">
      <h3>测试用例选择</h3>
      <select v-model="selectedTest" @change="updateTestContent">
        <option v-for="(test, index) in testCases" :key="index" :value="index">
          {{ test.name }}
        </option>
      </select>
    </div>

    <div class="comparison-container">
      <div class="renderer-column">
        <div class="renderer-header">
          <h3>KaTeX 渲染器</h3>
          <div class="compatibility-indicator" :class="katexCompatibility.status">
            {{ katexCompatibility.text }}
          </div>
        </div>
        <div class="renderer-content">
          <EnhancedMarkdownRenderer :content="testContent" />
        </div>
        <div class="renderer-info">
          <p>特点: 速度快，支持功能有限</p>
          <p>兼容性: {{ katexCompatibility.details }}</p>
        </div>
      </div>

      <div class="renderer-column">
        <div class="renderer-header">
          <h3>MathJax 渲染器</h3>
          <div class="compatibility-indicator" :class="mathjaxCompatibility.status">
            {{ mathjaxCompatibility.text }}
          </div>
        </div>
        <div class="renderer-content">
          <MathJaxRenderer :content="testContent" />
        </div>
        <div class="renderer-info">
          <p>特点: 功能全面，速度较慢</p>
          <p>兼容性: {{ mathjaxCompatibility.details }}</p>
        </div>
      </div>
    </div>

    <div class="formula-summary">
      <h3>兼容性分析</h3>
      <table class="compatibility-table">
        <thead>
          <tr>
            <th>功能特性</th>
            <th>KaTeX</th>
            <th>MathJax</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(feature, index) in compatibilityFeatures" :key="index">
            <td>{{ feature.name }}</td>
            <td :class="feature.katex ? 'supported' : 'not-supported'">
              {{ feature.katex ? '✓' : '✗' }}
            </td>
            <td :class="feature.mathjax ? 'supported' : 'not-supported'">
              {{ feature.mathjax ? '✓' : '✗' }}
            </td>
            <td>{{ feature.description }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import EnhancedMarkdownRenderer from './EnhancedMarkdownRenderer.vue'
import MathJaxRenderer from './MathJaxRenderer.vue'

const selectedTest = ref(0)
const isTesting = ref(false)
const performanceResults = ref<any>(null)

const testCases = [
  {
    name: '基础数学公式',
    content: `# 基础数学公式测试

## 行内公式
这是一个行内公式 $E = mc^2$ 的例子。

还有另一个行内公式 $\\frac{a}{b} = \\frac{c}{d}$。

## 块级公式
下面是一个块级公式：

$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$

另一个块级公式：

$$\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}$$

## 复杂公式
$$\\begin{align}
\\nabla \\times \\vec{\\mathbf{B}} - \\frac{1}{c}\\frac{\\partial\\vec{\\mathbf{E}}}{\\partial t} &= \\frac{4\\pi}{c}\\vec{\\mathbf{j}} \\\\\\
abla \\cdot \\vec{\\mathbf{E}} &= 4 \\pi \\rho \\\\\\
abla \\times \\vec{\\mathbf{E}} + \\frac{1}{c}\\frac{\\partial\\vec{\\mathbf{B}}}{\\partial t} &= \\vec{\\mathbf{0}} \\\\\\
abla \\cdot \\vec{\\mathbf{B}} &= 0
\\end{align}$$`
  },
  {
    name: '矩阵和数组',
    content: `# 矩阵和数组测试

## 矩阵
$\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}$

## 增广矩阵
$\left[
\begin{array}{cc|c}
1 & 2 & 3 \\
4 & 5 & 6
\end{array}
\right]$

## 复杂矩阵
$\begin{bmatrix}
\frac{1}{2} & \frac{1}{3} & \frac{1}{4} \\
\frac{1}{5} & \frac{1}{6} & \frac{1}{7} \\
\frac{1}{8} & \frac{1}{9} & \frac{1}{10}
\end{bmatrix}$

## 对齐环境
$\begin{align}
a &= b + c \\
  &= d + e
\end{align}$`
  },
  {
    name: '高级数学符号',
    content: `# 高级数学符号测试

## 特殊符号
- 希腊字母: $\\alpha, \\beta, \\gamma, \\delta, \\epsilon, \\zeta, \\eta, \\theta$
- 集合符号: $\\in, \\notin, \\subset, \\subseteq, \\supset, \\supseteq$
- 逻辑符号: $\\forall, \\exists, \\neg, \\land, \\lor, \\implies, \\iff$

## 分式和根式
$$\\sqrt{\\frac{a^2 + b^2}{c^2 + d^2}}$$

$$\\sqrt[n]{x_1 x_2 \\cdots x_n}$$

## 极限和积分
$$\\lim_{x \\to \\infty} \\left(1 + \\frac{1}{x}\\right)^x = e$$

$$\\int_0^1 \\int_0^{\\sqrt{1-x^2}} \\sqrt{1-x^2-y^2} \\, dy \\, dx$$`
  },
  {
    name: '化学方程式',
    content: `# 化学方程式测试

## 化学反应
$$\\ce{2H2O -> 2H2 + O2}$$

## 平衡反应
$$\\ce{CO2 + H2O <=> H2CO3}$$

## 离子反应
$$\\ce{CaCO3 + 2HCl -> CaCl2 + H2O + CO2}$$

## 有机反应
$$\\ce{CH4 + 2O2 -> CO2 + 2H2O}$$`
  },
  {
    name: '边界情况测试',
    content: `# 边界情况测试

## 嵌套分式
$$\\frac{\\frac{a}{b}}{\\frac{c}{d}} = \\frac{ad}{bc}$$

## 深度嵌套
$$\\sqrt{1 + \\sqrt{1 + \\sqrt{1 + \\sqrt{1 + \\cdots}}}}$$

## 大型表达式
$$\\sum_{i=1}^{n}\\sum_{j=1}^{m}\\sum_{k=1}^{p} a_{ijk} b_{ijk} c_{ijk}$$

## 特殊字符
$$\\text{特殊字符: } \\$, \\&, \\%, \\#, \\_, \\{, \\}$$

## 错误公式（测试容错性）
$$\\begin{matrix}
1 & 2 \\\\
3 & 
\\end{matrix}$$`
  }
]

const testContent = computed(() => testCases[selectedTest.value].content)

const compatibilityFeatures = [
  {
    name: '基础数学符号',
    katex: true,
    mathjax: true,
    description: '加减乘除、分数、根号等基础符号'
  },
  {
    name: '希腊字母',
    katex: true,
    mathjax: true,
    description: 'α, β, γ 等希腊字母'
  },
  {
    name: '矩阵环境',
    katex: true,
    mathjax: true,
    description: 'matrix, pmatrix, bmatrix 等矩阵环境'
  },
  {
    name: '对齐环境',
    katex: true,
    mathjax: true,
    description: 'align, gather 等对齐环境'
  },
  {
    name: '化学方程式',
    katex: false,
    mathjax: true,
    description: 'mhchem 扩展支持的化学方程式'
  },
  {
    name: '自定义宏',
    katex: false,
    mathjax: true,
    description: '用户自定义的 LaTeX 宏命令'
  },
  {
    name: '复杂表格',
    katex: false,
    mathjax: true,
    description: '复杂的数学表格环境'
  },
  {
    name: '字体命令',
    katex: true,
    mathjax: true,
    description: 'mathbb, mathcal, mathfrak 等字体命令'
  },
  {
    name: '颜色支持',
    katex: false,
    mathjax: true,
    description: '数学公式中的颜色设置'
  },
  {
    name: '标签和引用',
    katex: false,
    mathjax: true,
    description: '公式标签和交叉引用'
  },
  {
    name: '自动编号',
    katex: false,
    mathjax: true,
    description: '公式自动编号和引用'
  },
  {
    name: '语音输出',
    katex: false,
    mathjax: true,
    description: '数学公式语音朗读功能'
  },
  {
    name: '可访问性',
    katex: false,
    mathjax: true,
    description: '屏幕阅读器支持等无障碍功能'
  }
]

const katexCompatibility = computed(() => {
  const supported = compatibilityFeatures.filter(f => f.katex).length
  const total = compatibilityFeatures.length
  const percentage = (supported / total) * 100
  
  if (percentage >= 80) {
    return {
      status: 'good',
      text: '良好',
      details: `支持 ${supported}/${total} 项功能`
    }
  } else if (percentage >= 60) {
    return {
      status: 'medium',
      text: '一般',
      details: `支持 ${supported}/${total} 项功能`
    }
  } else {
    return {
      status: 'poor',
      text: '较差',
      details: `支持 ${supported}/${total} 项功能`
    }
  }
})

const mathjaxCompatibility = computed(() => {
  const supported = compatibilityFeatures.filter(f => f.mathjax).length
  const total = compatibilityFeatures.length
  const percentage = (supported / total) * 100
  
  if (percentage >= 80) {
    return {
      status: 'good',
      text: '良好',
      details: `支持 ${supported}/${total} 项功能`
    }
  } else if (percentage >= 60) {
    return {
      status: 'medium',
      text: '一般',
      details: `支持 ${supported}/${total} 项功能`
    }
  } else {
    return {
      status: 'poor',
      text: '较差',
      details: `支持 ${supported}/${total} 项功能`
    }
  }
})

const updateTestContent = () => {
  // 清除之前的性能测试结果
  performanceResults.value = null
}

const runPerformanceTest = async () => {
  isTesting.value = true
  performanceResults.value = null
  
  try {
    // 测试 KaTeX 渲染时间
    const katexStart = performance.now()
    // 模拟多次渲染以获得更准确的结果
    for (let i = 0; i < 10; i++) {
      // 这里会触发 KaTeX 渲染
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    const katexEnd = performance.now()
    const katexTime = katexEnd - katexStart
    
    // 测试 MathJax 渲染时间
    const mathjaxStart = performance.now()
    // 模拟多次渲染
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    const mathjaxEnd = performance.now()
    const mathjaxTime = mathjaxEnd - mathjaxStart
    
    performanceResults.value = {
      katex: katexTime.toFixed(2),
      mathjax: mathjaxTime.toFixed(2),
      winner: katexTime < mathjaxTime ? 'KaTeX' : 'MathJax'
    }
  } catch (error) {
    console.error('性能测试失败:', error)
  } finally {
    isTesting.value = false
  }
}

onMounted(() => {
  updateTestContent()
})
</script>

<style scoped>
.math-comparison {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.controls {
  margin: 20px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 20px;
}

button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

button:hover:not(:disabled) {
  background: #0056b3;
}

button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.test-results {
  display: flex;
  gap: 20px;
}

.result-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.value {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.winner {
  color: #28a745;
}

.test-formulas {
  margin: 20px 0;
  padding: 15px;
  background: #e9ecef;
  border-radius: 8px;
}

select {
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
}

.comparison-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin: 20px 0;
}

.renderer-column {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.renderer-header {
  background: #f8f9fa;
  padding: 15px;
  border-bottom: 1px solid #ddd;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.renderer-header h3 {
  margin: 0;
  font-size: 18px;
}

.compatibility-indicator {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.compatibility-indicator.good {
  background: #d4edda;
  color: #155724;
}

.compatibility-indicator.medium {
  background: #fff3cd;
  color: #856404;
}

.compatibility-indicator.poor {
  background: #f8d7da;
  color: #721c24;
}

.renderer-content {
  padding: 20px;
  min-height: 300px;
  max-height: 500px;
  overflow-y: auto;
}

.renderer-info {
  background: #f8f9fa;
  padding: 15px;
  border-top: 1px solid #ddd;
}

.renderer-info p {
  margin: 5px 0;
  font-size: 14px;
  color: #666;
}

.formula-summary {
  margin-top: 30px;
}

.compatibility-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
  font-size: 14px;
}

.compatibility-table th,
.compatibility-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.compatibility-table th {
  background: #f8f9fa;
  font-weight: bold;
  color: #333;
}

.compatibility-table tr:hover {
  background: #f8f9fa;
}

.supported {
  color: #28a745;
  font-weight: bold;
  text-align: center;
}

.not-supported {
  color: #dc3545;
  font-weight: bold;
  text-align: center;
}

@media (max-width: 768px) {
  .comparison-container {
    grid-template-columns: 1fr;
  }
  
  .controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .test-results {
    flex-direction: column;
    gap: 10px;
  }
}
</style>