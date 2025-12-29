const path = require('path');
const fs = require('fs');
/**
 * 前端函数绘图服务
 * 使用function-plot库在前端实现数学函数绘图
 */

// 解析用户输入的函数
function parseFunction(userInput) {
  const input = userInput.toLowerCase().trim();
  console.log('原始输入:', input);
  try {
    // 圆形检测 - x^2 + y^2 = 1
    if (input.includes('圆') || input.includes('circle')) {
      return {
        success: true,
        data: {
          original_input: userInput,
          function_type: "implicit",
          functions: [
            {
              fn: '(sqrt(1 - x * x))',
              color: '#1f77b4',
              graphType: 'polyline'
            },
            {
              fn: '(-sqrt(1 - x * x))',
              color: '#1f77b4',
              graphType: 'polyline'
            }
          ],
          title: '单位圆: x² + y² = 1',
          xDomain: [-1.2, 1.2],
          yDomain: [-1.2, 1.2],
          latex: "$x^2 + y^2 = 1$"
        },
        message: "成功解析圆形方程"
      };
    }
    
    // 椭圆检测 - x^2/4 + y^2/9 = 1
    if (input.includes('椭圆') || input.includes('ellipse')) {
      return {
        success: true,
        data: {
          original_input: userInput,
          function_type: "implicit",
          functions: [
            {
              fn: '(sqrt(9 * (1 - x * x / 4)))',
              color: '#1f77b4',
              graphType: 'polyline'
            },
            {
              fn: '(-sqrt(9 * (1 - x * x / 4)))',
              color: '#1f77b4',
              graphType: 'polyline'
            }
          ],
          title: '椭圆: x²/4 + y²/9 = 1',
          xDomain: [-2.5, 2.5],
          yDomain: [-3.5, 3.5],
          latex: "$\\frac{x^2}{4} + \\frac{y^2}{9} = 1$"
        },
        message: "成功解析椭圆方程"
      };
    }
    
    // 正弦函数检测
    if (input.includes('sin') || input.includes('正弦')) {
      return {
        success: true,
        data: {
          original_input: userInput,
          function_type: "explicit",
          functions: [
            {
              fn: 'sin(x)',
              color: '#1f77b4',
              graphType: 'polyline'
            }
          ],
          title: '正弦函数: sin(x)',
          xDomain: [-10, 10],
          yDomain: [-2, 2],
          latex: "$\\sin(x)$"
        },
        message: "成功解析正弦函数"
      };
    }
    
    // 余弦函数检测
    if (input.includes('cos') || input.includes('余弦')) {
      return {
        success: true,
        data: {
          original_input: userInput,
          function_type: "explicit",
          functions: [
            {
              fn: 'cos(x)',
              color: '#1f77b4',
              graphType: 'polyline'
            }
          ],
          title: '余弦函数: cos(x)',
          xDomain: [-10, 10],
          yDomain: [-2, 2],
          latex: "$\\cos(x)$"
        },
        message: "成功解析余弦函数"
      };
    }
    
    // 抛物线检测
    if (input.includes('抛物线') || input.includes('parabola')) {
      return {
        success: true,
        data: {
          original_input: userInput,
          function_type: "explicit",
          functions: [
            {
              fn: 'x^2',
              color: '#1f77b4',
              graphType: 'polyline'
            }
          ],
          title: '抛物线: y = x²',
          xDomain: [-5, 5],
          yDomain: [-1, 10],
          latex: "$y = x^2$"
        },
        message: "成功解析抛物线"
      };
    }
    
    // 三次函数检测
    if (input.includes('三次') || input.includes('cubic')) {
      return {
        success: true,
        data: {
          original_input: userInput,
          function_type: "explicit",
          functions: [
            {
              fn: 'x^3',
              color: '#1f77b4',
              graphType: 'polyline'
            }
          ],
          title: '三次函数: y = x³',
          xDomain: [-3, 3],
          yDomain: [-10, 10],
          latex: "$y = x^3$"
        },
        message: "成功解析三次函数"
      };
    }
    
    // 指数函数检测
    if (input.includes('指数') || input.includes('exp') || input.includes('e^')) {
      return {
        success: true,
        data: {
          original_input: userInput,
          function_type: "explicit",
          functions: [
            {
              fn: 'exp(x)',
              color: '#1f77b4',
              graphType: 'polyline'
            }
          ],
          title: '指数函数: y = eˣ',
          xDomain: [-3, 3],
          yDomain: [-1, 10],
          latex: "$y = e^x$"
        },
        message: "成功解析指数函数"
      };
    }
    
    // 对数函数检测
    if (input.includes('对数') || input.includes('log')) {
      return {
        success: true,
        data: {
          original_input: userInput,
          function_type: "explicit",
          functions: [
            {
              fn: 'log(x)',
              color: '#1f77b4',
              graphType: 'polyline'
            }
          ],
          title: '对数函数: y = ln(x)',
          xDomain: [0.1, 10],
          yDomain: [-3, 3],
          latex: "$y = \\ln(x)$"
        },
        message: "成功解析对数函数"
      };
    }
    
    // 尝试解析数学表达式
    const mathExpr = extractMathExpression(userInput);
    if (mathExpr) {
      const processed = preprocessExpression(mathExpr);
      const exprType = detectExpressionType(processed);
      
      if (exprType === 'implicit') {
        // 隐函数处理 - 简单情况
        const parts = processed.split('=');
        if (parts.length === 2) {
          const leftSide = parts[0].trim();
          const rightSide = parts[1].trim();
          
          // 尝试解出y
          if (leftSide.includes('y') && !rightSide.includes('y')) {
            // 形式如 y = f(x)
            const fn = rightSide;
            return {
              success: true,
              data: {
                original_input: userInput,
                function_type: "explicit",
                functions: [
                  {
                    fn: fn,
                    color: '#1f77b4',
                    graphType: 'polyline'
                  }
                ],
                title: `函数: ${processed}`,
                xDomain: [-10, 10],
                yDomain: [-10, 10],
                latex: `$${processed.replace(/\*/g, ' \\cdot ')}$`
              },
              message: "成功解析数学表达式"
            };
          }
        }
      } else {
        // 显函数处理
        return {
          success: true,
          data: {
            original_input: userInput,
            function_type: "explicit",
            functions: [
              {
                fn: processed,
                color: '#1f77b4',
                graphType: 'polyline'
              }
            ],
            title: `函数: y = ${processed}`,
            xDomain: [-10, 10],
            yDomain: [-10, 10],
            latex: `$y = ${processed.replace(/\*/g, ' \\cdot ')}$`
          },
          message: "成功解析数学表达式"
        };
      }
    }
    
    // 无法解析的情况
    return {
      success: false,
      error: "无法识别的数学表达式",
      suggestion: "请输入标准的数学表达式或自然语言描述，如：画一个圆、sin(x)、x^2、抛物线等"
    };
    
  } catch (error) {
    console.error('解析用户输入失败:', error);
    return {
      success: false,
      error: "解析过程出现错误",
      message: error.message
    };
  }
}

// 提取数学表达式
function extractMathExpression(input) {
  const patterns = [
    /y\s*=\s*([^\s]+)/,
    /([a-zA-Z]+\s*[=]\s*[^\s]+)/,
    /([a-zA-Z]+\^[0-9]+)/,
    /(sin|cos|tan|log|exp|sqrt)\s*\([^)]+\)/,
    /([0-9]*[a-zA-Z]+\s*[+\-*/]\s*[0-9]*[a-zA-Z]+)/
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// 检测表达式类型
function detectExpressionType(expr) {
  if (expr.includes('=')) {
    const parts = expr.split('=');
    if (parts.length === 2 && (parts[0].includes('y') || parts[1].includes('y'))) {
      return 'implicit';
    }
  }
  return 'explicit';
}

// 预处理表达式
function preprocessExpression(expr) {
  return expr
    .replace(/\^/g, '^')  // 保持^符号，function-plot支持
    .replace(/π/g, 'PI')
    .replace(/pi/g, 'PI')
    .replace(/e(?![xp])/g, 'E');
}

// 生成前端绘图配置
function generatePlotConfig(parseData) {
  const { functions, title, xDomain, yDomain } = parseData;
  
  return {
    title: title,
    target: '#plot',
    width: 600,
    height: 400,
    xAxis: {
      domain: xDomain,
      label: 'x'
    },
    yAxis: {
      domain: yDomain,
      label: 'y'
    },
    grid: true,
    data: [{
      fn: functions[0].fn,
      color: functions[0].color,
      graphType: functions[0].graphType
    }]
  };
}

// 使用大模型解析用户输入
async function parseWithLLM(userInput) {
  // try {
    // 这里调用您的大模型服务
    const { LangchainService } = require('./langchainService');
    const langchainService = new LangchainService();
    
    // const templatePath = path.join(__dirname, '..', 'prompt_template_func.txt');
    // const template = fs.readFileSync(templatePath, 'utf8');
      
    // // 替换模板中的变量
    // const prompt = template.replace('{{user_input}}', userInput);
    const prompt = `请将以下数学描述转换为标准的数学表达式，只返回表达式，不要任何解释或额外文字。

          输入: "${userInput}"

          要求:
          1. 如果是自然语言描述，转换为数学表达式
          2. 如果已经是表达式，先检查是不是标准的数学表达式，如果不是则先转换为标准的数学表达式再返回，否则直接返回
          3. 对于隐函数如圆形、椭圆，返回适合绘制的表达式形式
          4. 只返回表达式本身，不要其他内容
          5. 不要返回Latex表达式，只返回标准的数学表达式
          6. 对于复杂描述，如“画一个椭圆”，返回“(x/a)^2 + (y/b)^2 = 1”，其中a和b为椭圆的半轴长度，要用具体的数值替换
          7. 返回的表达式如果有a、b、c等变量，则都需要转换成数字，不能用字母表示，如y = a*x^3 + b*x^2 + c*x + d中的a、b、c、d都需要用具体的数值替换
          8. 如果是隐函数，不能返回类似“(x/2)^2 + (y/4)^2 = 1”的形式，而要返回如“(x/2)^2 + (y/4)^2 - 1”的形式

          示例:
          输入: "画一个圆" -> 输出: "x^2 + y^2 = 1"
          输入: "sin函数" -> 输出: "sin(x)"
          输入: "抛物线" -> 输出: "x^2"

          请直接返回表达式:`;

    const response = await langchainService.answerQuestionOfFunc(prompt);
    console.log('大模型原始响应:', response);
    const expression = response.trim();
    return expression;
}

// 主函数 - 前端函数绘图服务
async function frontendFunctionPlot(userInput, options = {}) {
  try {
    // 输入验证
    if (!userInput || typeof userInput !== 'string' || userInput.trim().length === 0) {
      return {
        success: false,
        error: '用户输入不能为空',
        suggestion: '请输入数学表达式或自然语言描述，如"画一个圆"或"sin(x)"'
      };
    }

    const trimmedInput = userInput.trim();
    console.log(`[${new Date().toISOString()}] 接收到用户输入: "${trimmedInput}"`);

    // 选择解析方式
    const useLLM = options.useLLM || false;
    let parseResult;
    
    if (useLLM) {
      console.log('使用大模型解析');
      parseResult = await parseWithLLM(trimmedInput);
      console.log('大模型解析结果:', parseResult);
      return {
        success: true,
        data: {
          expression: parseResult,
          original_input: trimmedInput,
          parse_method: 'llm'
        },
        message: '大模型解析成功'
      };
    } else {
      console.log('使用本地解析');
      parseResult = parseFunction(trimmedInput);
    }
    
    if (!parseResult.success) {
      return parseResult;
    }

    // 生成前端绘图配置
    const plotConfig = generatePlotConfig(parseResult.data);
    
    // 返回配置给前端使用
    return {
      success: true,
      data: {
        ...parseResult.data,
        plot_config: plotConfig,
        plot_method: useLLM ? 'frontend_function_plot_llm' : 'frontend_function_plot'
      },
      message: parseResult.message || '前端函数绘图配置生成成功'
    };

  } catch (error) {
    console.error('前端函数绘图服务错误:', error);
    return {
      success: false,
      error: '服务内部错误',
      message: error.message
    };
  }
}

module.exports = {
  frontendFunctionPlot,
  parseFunction,
  generatePlotConfig
};