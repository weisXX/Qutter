<template>
  <div class="function-plot-container">
    <canvas ref="canvasRef" :width="options.width" :height="options.height"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

interface Props {
  expression: string
  options?: {
    xMin?: number
    xMax?: number
    yMin?: number
    yMax?: number
    width?: number
    height?: number
    title?: string
    color?: string
  }
}

const props = withDefaults(defineProps<Props>(), {
  options: () => ({
    xMin: -10,
    xMax: 10,
    yMin: -10,
    yMax: 10,
    width: 600,
    height: 400,
    title: '函数图像',
    color: '#1f77b4'
  })
})

const canvasRef = ref<HTMLCanvasElement>()

// 解析数学表达式
const parseFunctionExpression = (expr: string): string => {
  console.log('原始表达式:', expr)

  let result = expr.trim()
  console.log('去除空格后的表达式:', result)

  // 检查是否是隐式方程
  const equalsIndex = result.indexOf('=')
  if (equalsIndex !== -1) {
    const leftSide = result.substring(0, equalsIndex).trim()
    const rightSide = result.substring(equalsIndex + 1).trim()
    
    console.log('检测到等式方程:', { leftSide, rightSide });
    
    // 处理标准双曲线方程 y^2/a^2-x^2/b^2=1
    if (leftSide.includes('y^2') && leftSide.includes('x^2')) {
      console.log('匹配双曲线方程模式');
      
      // 提取a和b的值
      let a = 1, b = 1;
      
      // 尝试匹配 y^2/a^2-x^2/b^2 的形式
      const aMatch = leftSide.match(/y\^2\/(\d+(?:\.\d+)?)\^2/);
      const bMatch = leftSide.match(/x\^2\/(\d+(?:\.\d+)?)\^2/);
      
      console.log('参数匹配结果:', { aMatch, bMatch });
      
      if (aMatch) {
        a = parseFloat(aMatch[1]);
        console.log('提取到a值:', a);
      }
      if (bMatch) {
        b = parseFloat(bMatch[1]);
        console.log('提取到b值:', b);
      }
      
      // 计算双曲线公式: y = ±sqrt(a^2 + (a^2/b^2)*x^2)
      const aSquared = a * a;
      const bSquared = b * b;
      const coefficient = aSquared / bSquared;
      
      result = `sqrt(${aSquared} + ${coefficient}*x*x)`;
      console.log('使用带参数的双曲线公式，转换为:', result);
    } else if (leftSide === 'y' || leftSide.startsWith('y ')) {
      // 标准显式方程 y = f(x)
      console.log('检测到标准显式方程');
      result = rightSide;
    } else {
      // 其他隐式方程，暂时不支持，返回空字符串
      console.warn('不支持的隐式方程类型:', result);
      console.warn('左侧:', leftSide, '右侧:', rightSide);
      console.warn('左侧包含y^2:', leftSide.includes('y^2'));
      console.warn('左侧包含x^2:', leftSide.includes('x^2'));
      result = '';
    }
    
    console.log('等式处理完成，最终结果:', result);
  }

  console.log('等号处理后:', result)

  // 保存函数调用的临时标记，避免在处理隐式乘法时破坏函数调用
  const functionPatterns: { [key: string]: string } = {}
  let functionCounter = 0

  // 替换各种数学函数，同时保存原始形式
  const functionsToReplace = [
    { regex: /\bsin\(/g, replacement: 'Math.sin(' },
    { regex: /\bcos\(/g, replacement: 'Math.cos(' },
    { regex: /\btan\(/g, replacement: 'Math.tan(' },
    { regex: /\blog\(/g, replacement: 'Math.log10(' },
    { regex: /\blog10\(/g, replacement: 'Math.log10(' },
    { regex: /\bln\(/g, replacement: 'Math.log(' },
    { regex: /\bsqrt\(/g, replacement: 'Math.sqrt(' },
    { regex: /\babs\(/g, replacement: 'Math.abs(' },
    { regex: /\bexp\(/g, replacement: 'Math.exp(' },
    // 双曲函数（不替换，保留原始名称，在函数内部定义）
    // { regex: /\bsinh\(/g, replacement: 'sinh(' },
    // { regex: /\bcosh\(/g, replacement: 'cosh(' },
    // { regex: /\btanh\(/g, replacement: 'tanh(' },
    // { regex: /\bcoth\(/g, replacement: 'coth(' },
    // { regex: /\bsech\(/g, replacement: 'sech(' },
    // { regex: /\bcsch\(/g, replacement: 'csch(' }
  ]

  for (const func of functionsToReplace) {
    result = result.replace(func.regex, (match) => {
      const key = `__FUNC_${functionCounter++}__`
      functionPatterns[key] = func.replacement
      return key
    })
  }

  console.log('函数替换后:', result)

  // 处理常数
  result = result
    .replace(/\bpi\b/g, 'Math.PI')
    .replace(/\be\b/g, 'Math.E')

  console.log('常数替换后:', result)

  // 处理隐式乘法，但要特别注意避免影响函数名
  // 只处理数字和字母之间的隐式乘法，以及右括号和字母之间的乘法
  result = result.replace(/(\d)([a-zA-Z])/g, '$1*$2')  // 数字+字母
  result = result.replace(/([a-zA-Z])(\d)/g, '$1*$2')  // 字母+数字
  result = result.replace(/(\))([a-zA-Z\(])/g, '$1*$2')  // 右括号+字母或左括号
  // 仅处理特定的物理变量组合，避免影响函数名
  result = result.replace(/\b(vt|at|kt|wt|ft|st|vt)\b/g, (match) => {
    // 将变量组合插入*号，如vt变成v*t
    return match.replace(/([a-zA-Z])([a-zA-Z])/g, '$1*$2');
  });

  console.log('隐式乘法处理后:', result)

  // 恢复函数调用（修复因为上面正则表达式导致的破坏）
  for (const [key, value] of Object.entries(functionPatterns)) {
    result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value)
  }

  console.log('函数恢复后:', result)

  // 处理指数运算符
  result = result.replace(/\^/g, '**')

  console.log('指数处理后:', result)

  return result
}

// 绘制函数图像
const drawFunction = () => {
  if (!canvasRef.value) return
  
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // 设置画布样式
  ctx.strokeStyle = '#ccc'
  ctx.lineWidth = 1
  
  // 绘制网格
  drawGrid(ctx, canvas.width, canvas.height)
  
  // 绘制坐标轴
  drawAxes(ctx, canvas.width, canvas.height)
  
  // 绘制函数
  drawFunctionGraph(ctx, canvas.width, canvas.height)
}

// 绘制网格
const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const xMin = props.options.xMin!
  const xMax = props.options.xMax!
  const yMin = props.options.yMin!
  const yMax = props.options.yMax!
  
  // 计算像素与坐标之间的转换
  const xScale = width / (xMax - xMin)
  const yScale = height / (yMax - yMin)
  
  // 绘制垂直网格线
  ctx.strokeStyle = '#eee'
  ctx.lineWidth = 1
  for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
    const pixelX = (x - xMin) * xScale
    ctx.beginPath()
    ctx.moveTo(pixelX, 0)
    ctx.lineTo(pixelX, height)
    ctx.stroke()
  }
  
  // 绘制水平网格线
  for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
    const pixelY = height - (y - yMin) * yScale
    ctx.beginPath()
    ctx.moveTo(0, pixelY)
    ctx.lineTo(width, pixelY)
    ctx.stroke()
  }
}

// 绘制坐标轴
const drawAxes = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const xMin = props.options.xMin!
  const xMax = props.options.xMax!
  const yMin = props.options.yMin!
  const yMax = props.options.yMax!
  
  // 计算像素与坐标之间的转换
  const xScale = width / (xMax - xMin)
  const yScale = height / (yMax - yMin)
  
  // 绘制 x 轴
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 2
  const xAxisY = height - (0 - yMin) * yScale
  if (yMin <= 0 && yMax >= 0) { // 如果 x 轴在画布范围内
    ctx.beginPath()
    ctx.moveTo(0, xAxisY)
    ctx.lineTo(width, xAxisY)
    ctx.stroke()
  }
  
  // 绘制 y 轴
  const yAxisX = (0 - xMin) * xScale
  if (xMin <= 0 && xMax >= 0) { // 如果 y 轴在画布范围内
    ctx.beginPath()
    ctx.moveTo(yAxisX, 0)
    ctx.lineTo(yAxisX, height)
    ctx.stroke()
  }
  
  // 绘制刻度标签
  drawAxisLabels(ctx, width, height)
}

// 绘制坐标轴标签
const drawAxisLabels = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const xMin = props.options.xMin!
  const xMax = props.options.xMax!
  const yMin = props.options.yMin!
  const yMax = props.options.yMax!
  
  // 计算像素与坐标之间的转换
  const xScale = width / (xMax - xMin)
  const yScale = height / (yMax - yMin)
  
  // 设置文字样式
  ctx.fillStyle = '#000'
  ctx.font = '12px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  
  // 绘制 x 轴标签
  for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
    if (x === 0) continue // 跳过原点，避免与 y 轴标签重叠
    const pixelX = (x - xMin) * xScale
    const yAxisY = height - (0 - yMin) * yScale
    if (yMin <= 0 && yMax >= 0) { // 如果 x 轴在画布范围内
      ctx.fillText(x.toString(), pixelX, yAxisY + 5)
    }
  }
  
  // 绘制 y 轴标签
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
    if (y === 0) continue // 跳过原点，避免与 x 轴标签重叠
    const pixelY = height - (y - yMin) * yScale
    const yAxisX = (0 - xMin) * xScale
    if (xMin <= 0 && xMax >= 0) { // 如果 y 轴在画布范围内
      ctx.fillText(y.toString(), yAxisX - 5, pixelY)
    }
  }
}

// 绘制函数图像
const drawFunctionGraph = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const xMin = props.options.xMin!
  const xMax = props.options.xMax!
  const yMin = props.options.yMin!
  const yMax = props.options.yMax!
  
  // 计算像素与坐标之间的转换
  const xScale = width / (xMax - xMin)
  const yScale = height / (yMax - yMin)
  
  // 解析表达式
  const parsedExpr = parseFunctionExpression(props.expression)
  console.log('解析后的表达式:', parsedExpr)
  
  // 检查是否是双曲线方程
  const isHyperbola = props.expression.includes('y^2') && props.expression.includes('x^2') && props.expression.includes('=');
  console.log('是否检测为双曲线:', isHyperbola, '原始表达式:', props.expression);
  
  // 设置线条样式
  ctx.strokeStyle = props.options.color
  ctx.lineWidth = 2
  ctx.beginPath()
  
  let firstPoint = true
  let validPointsDrawn = false
  const numPoints = width // 每个像素一个点
  
  // 检查表达式是否包含多个变量，如果是，需要特别处理
  const hasMultipleVariables = checkMultipleVariables(parsedExpr);
  
  // 计算并绘制函数
  const drawCurve = (yMultiplier: number = 1) => {
    let localFirstPoint = true
    
    for (let i = 0; i <= numPoints; i++) {
      const x = xMin + (i / numPoints) * (xMax - xMin)
      
      try {
        // 创建安全的函数来计算 y 值
        let y: number
        try {
          // 确保表达式是有效的
          if (!parsedExpr || parsedExpr.trim() === '') {
            console.error('表达式为空');
            continue;
          }
          
          // 为处理物理表达式，我们假设x是自变量，其他变量使用默认值
          let fn;
          try {
            // 创建一个安全的函数，带错误处理，为其他变量设置默认值
          const functionBody = `
            "use strict";
            // 定义Math对象中不存在的函数
            var log10 = function(x) { return Math.log(x) / Math.log(10); };
            // 定义双曲函数（Math对象中不存在的函数）
            var sinh = function(x) { return (Math.exp(x) - Math.exp(-x)) / 2; };
            var cosh = function(x) { return (Math.exp(x) + Math.exp(-x)) / 2; };
            var tanh = function(x) { return (Math.exp(x) - Math.exp(-x)) / (Math.exp(x) + Math.exp(-x)); };
            var coth = function(x) { return (Math.exp(x) + Math.exp(-x)) / (Math.exp(x) - Math.exp(-x)); };
            var sech = function(x) { return 2 / (Math.exp(x) + Math.exp(-x)); };
            var csch = function(x) { return 2 / (Math.exp(x) - Math.exp(-x)); };
              
              // 为物理变量设置默认值
              var t = x;  // 假设t是时间，等于x
              var v = 1;  // 速度默认为1
              var k = 0.5; // 衰减系数默认为0.5
              var a = 1;  // 加速度默认为1
              var b = 1;  // 阻尼系数默认为1
              var m = 1;  // 质量默认为1
              var g = 9.8; // 重力加速度
              var C = 1;  // 任意常数
              var mu = 0.5; // 摩擦系数默认为0.5
              var sigma = 1; // 标准差默认为1
              var lambda = 1; // 波长默认为1
              var omega = 1; // 角频率默认为1
              var phi = 0; // 相位默认为0
              var A = 1; // 振幅默认为1
              
              try {
                return ${parsedExpr};
              } catch (e) {
                console.error('表达式计算错误:', e, '表达式:', "${parsedExpr}");
                return NaN;
              }
            `;
            
            fn = new Function('x', functionBody);
            y = fn(x) * yMultiplier;
          } catch (e) {
            console.error('函数创建失败:', e, '表达式:', parsedExpr);
            continue;
          }
          
          // 再次检查结果
          if (typeof y !== 'number') {
            console.error('函数返回值不是数字:', y, '表达式:', parsedExpr, 'x值:', x);
            continue;
          }
        } catch (e) {
          console.error('函数创建失败:', e, '表达式:', parsedExpr)
          continue
        }
        
        // 检查结果是否为有限数
        if (!isFinite(y) || isNaN(y)) {
          // 如果结果不是有限数，移动到下一个点但不绘制线
          localFirstPoint = true
          continue
        }
        
        // 将坐标转换为像素
        const pixelX = (x - xMin) * xScale
        const pixelY = height - (y - yMin) * yScale
        
        // 检查点是否在画布范围内
        if (pixelX >= 0 && pixelX <= width && pixelY >= 0 && pixelY <= height) {
          if (localFirstPoint) {
            ctx.moveTo(pixelX, pixelY)
            localFirstPoint = false
            validPointsDrawn = true
          } else {
            ctx.lineTo(pixelX, pixelY)
            validPointsDrawn = true
          }
        } else {
          // 如果点超出范围，移动到下一个点但不绘制线
          localFirstPoint = true
        }
      } catch (error) {
        console.error(`计算 x=${x} 时出错:`, error)
        localFirstPoint = true
        continue
      }
    }
  };
  
  // 如果是双曲线，绘制上下两部分
  if (isHyperbola) {
    drawCurve(1);   // 上半部分
    drawCurve(-1);  // 下半部分
  } else {
    drawCurve();    // 普通函数
  }
  
  // 检查是否绘制了任何有效点
  if (!validPointsDrawn) {
    console.log('没有绘制任何有效点，表达式:', props.expression, '解析后:', parsedExpr)
    
    // 检查是否是特殊函数（如椭圆等隐式函数）
    if (isImplicitFunction(props.expression)) {
      drawImplicitFunction(ctx, width, height)
    } else {
      // 尝试直接评估表达式，看是否为常数
      if (isConstantExpression(parsedExpr)) {
        drawConstantFunction(ctx, width, height, parsedExpr)
      } else {
        // 显示错误信息
        ctx.font = '14px Arial'
        ctx.fillStyle = 'red'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('函数无法绘制', width / 2, height / 2)
        console.error('函数表达式无法绘制:', props.expression, '解析后:', parsedExpr)
      }
    }
  } else {
    ctx.stroke()
  }
}

// 检查表达式是否包含多个变量
const checkMultipleVariables = (expr: string): boolean => {
  // 匹配所有变量名（字母序列）
  const variableMatches = expr.match(/[a-zA-Z]+/g) || [];
  // 过滤掉函数名和常数
  const functions = ['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'abs', 'exp'];
  const constants = ['PI', 'E'];
  const variables = variableMatches.filter(v => 
    !functions.includes(v) && 
    !constants.includes(v) && 
    v !== 'x' &&
    v !== 'Math' // 过滤掉Math对象
  );
  return new Set(variables).size > 1;
}

// 检查是否是常数表达式
const isConstantExpression = (expr: string): boolean => {
  // 尝试评估表达式是否为常数
  try {
    // 创建一个不依赖 x 的函数
    const fn = new Function(`
      "use strict";
      try {
        return ${expr};
      } catch (e) {
        return NaN;
      }
    `);
    const result = fn();
    return isFinite(result);
  } catch (e) {
    return false;
  }
}

// 绘制常数函数
const drawConstantFunction = (ctx: CanvasRenderingContext2D, width: number, height: number, expr: string) => {
  const xMin = props.options.xMin!
  const xMax = props.options.xMax!
  const yMin = props.options.yMin!
  const yMax = props.options.yMax!
  
  const xScale = width / (xMax - xMin)
  const yScale = height / (yMax - yMin)
  
  try {
    // 计算常数值
    const fn = new Function(`
      "use strict";
      try {
        return ${expr};
      } catch (e) {
        return NaN;
      }
    `);
    const yValue = fn();
    
    if (isFinite(yValue)) {
      // 检查常数 y 值是否在范围内
      if (yValue >= yMin && yValue <= yMax) {
        const pixelY = height - (yValue - yMin) * yScale
        
        // 绘制水平线
        ctx.strokeStyle = props.options.color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(0, pixelY)
        ctx.lineTo(width, pixelY)
        ctx.stroke()
      } else {
        // 常数值超出范围，显示提示
        ctx.font = '14px Arial'
        ctx.fillStyle = 'red'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`y=${yValue} 超出显示范围`, width / 2, height / 2)
      }
    }
  } catch (e) {
    console.error('计算常数表达式失败:', e)
  }
}

// 检查是否是隐式函数（如椭圆、圆等）
const isImplicitFunction = (expr: string): boolean => {
  const lowerExpr = expr.toLowerCase()
  // 检查是否包含等号，这通常表示隐式方程
  return lowerExpr.includes('=') && 
         (lowerExpr.includes('x^2') || lowerExpr.includes('y^2')) // 例如椭圆或圆
}

// 绘制隐式函数（如椭圆、圆等）
const drawImplicitFunction = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const expr = props.expression.toLowerCase()
  const xMin = props.options.xMin!
  const xMax = props.options.xMax!
  const yMin = props.options.yMin!
  const yMax = props.options.yMax!
  
  const xScale = width / (xMax - xMin)
  const yScale = height / (yMax - yMin)
  
  // 检查是否是椭圆或圆方程
  if (expr.includes('x^2') && expr.includes('y^2') && expr.includes('=')) {
    drawEllipse(ctx, width, height)
  } else {
    // 显示不支持的函数类型
    ctx.font = '14px Arial'
    ctx.fillStyle = 'red'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('不支持的函数类型', width / 2, height / 2)
  }
}

// 绘制椭圆函数
const drawEllipse = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const xMin = props.options.xMin!
  const xMax = props.options.xMax!
  const yMin = props.options.yMin!
  const yMax = props.options.yMax!
  
  const xScale = width / (xMax - xMin)
  const yScale = height / (yMax - yMin)
  
  // 默认椭圆参数
  let a = 5 // x半轴
  let b = 3 // y半轴
  
  // 从表达式中提取参数（简化处理）
  const expr = props.expression.toLowerCase()
  const aMatch = expr.match(/x\^2[\/\*](\d+\.?\d*)/)
  if (aMatch && aMatch[1]) {
    a = Math.sqrt(parseFloat(aMatch[1]))
  }
  
  const bMatch = expr.match(/y\^2[\/\*](\d+\.?\d*)/)
  if (bMatch && bMatch[1]) {
    b = Math.sqrt(parseFloat(bMatch[1]))
  }
  
  // 绘制椭圆（参数方程 x = a*cos(t), y = b*sin(t)）
  ctx.strokeStyle = props.options.color
  ctx.lineWidth = 2
  ctx.beginPath()
  
  const numPoints = 300
  let firstPoint = true
  
  for (let i = 0; i <= numPoints; i++) {
    const t = (i / numPoints) * 2 * Math.PI
    
    const x = a * Math.cos(t)
    const y = b * Math.sin(t)
    
    // 将坐标转换为像素
    const pixelX = (x - xMin) * xScale
    const pixelY = height - (y - yMin) * yScale
    
    if (pixelX >= 0 && pixelX <= width && pixelY >= 0 && pixelY <= height) {
      if (firstPoint) {
        ctx.moveTo(pixelX, pixelY)
        firstPoint = false
      } else {
        ctx.lineTo(pixelX, pixelY)
      }
    }
  }
  
  ctx.stroke()
}

onMounted(() => {
  drawFunction()
})

watch([() => props.expression, () => props.options], () => {
  drawFunction()
}, { deep: true })
</script>

<style scoped>
.function-plot-container {
  position: relative;
  margin: 1rem 0;
  display: flex;
  justify-content: center;
}

canvas {
  max-width: 100%;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>