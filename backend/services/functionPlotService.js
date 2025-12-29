const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// 生成函数图像的路由
router.post('/generate-function-plot', async (req, res) => {
  try {
    const { expression, options = {} } = req.body;
    
    if (!expression) {
      return res.status(400).json({ error: '表达式不能为空' });
    }

    // 检查是否为表达式数组
    let expressions = [];
    if (Array.isArray(expression)) {
      expressions = expression;
    } else if (typeof expression === 'string') {
      // 尝试解析JSON字符串
      try {
        const parsed = JSON.parse(expression);
        if (Array.isArray(parsed)) {
          expressions = parsed;
        } else if (parsed.expressions && Array.isArray(parsed.expressions)) {
          expressions = parsed.expressions;
          // 如果解析出的对象包含其他选项，合并到options中
          if (parsed.xMin !== undefined) options.xMin = parsed.xMin;
          if (parsed.xMax !== undefined) options.xMax = parsed.xMax;
          if (parsed.yMin !== undefined) options.yMin = parsed.yMin;
          if (parsed.yMax !== undefined) options.yMax = parsed.yMax;
          if (parsed.title !== undefined) options.title = parsed.title;
        } else {
          expressions = [expression];
        }
      } catch (e) {
        expressions = [expression];
      }
    } else {
      expressions = [expression];
    }

    // 设置默认选项
    const plotOptions = {
      xMin: options.xMin || -10,
      xMax: options.xMax || 10,
      yMin: options.yMin || -10,
      yMax: options.yMax || 10,
      width: options.width || 800,
      height: options.height || 600,
      title: options.title || '函数图像',
      color: options.color || '#1f77b4',
      grid: options.grid !== false,
      dpi: options.dpi || 100,
      useEnhanced: options.useEnhanced !== false  // 默认使用增强版
    };

    // 创建临时目录（如果不存在）
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 生成唯一的文件名
    const timestamp = Date.now();
    const scriptPath = path.join(tempDir, `plot_${timestamp}.py`);
    const imagePath = path.join(tempDir, `plot_${timestamp}.png`);

    // 创建Python脚本
    const pythonScript = generatePythonScript(expressions, plotOptions, imagePath, plotOptions.useEnhanced);
    console.log('生成的Python脚本路径:', scriptPath);
    console.log('使用增强版:', plotOptions.useEnhanced);
    console.log('表达式数量:', expressions.length);

    // 写入Python脚本文件
    fs.writeFileSync(scriptPath, pythonScript);

    // 执行Python脚本 - 使用虚拟环境中的Python
    const pythonPath = path.join(__dirname, '..', '..', '.venv', 'Scripts', 'python.exe');
    console.log('使用Python路径:', pythonPath);
    
    // 设置环境变量以解决中文编码问题
    const env = { ...process.env };
    env.PYTHONIOENCODING = 'utf-8';
    env.LANG = 'zh_CN.UTF-8';
    
    const python = spawn(pythonPath, [scriptPath], { env });
    
    let output = '';
    let error = '';
    let isCompleted = false;

    // 设置超时机制（30秒）
    const timeout = setTimeout(() => {
      if (!isCompleted) {
        console.error('Python脚本执行超时');
        python.kill('SIGTERM');
        cleanupFiles();
        if (!res.headersSent) {
          res.status(500).json({ 
            error: '函数图像生成超时', 
            details: 'Python脚本执行超过30秒'
          });
        }
      }
    }, 30000);

    python.stdout.on('data', (data) => {
      console.log('Python stdout:', data.toString());
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      error += data.toString();
      console.error('Python stderr:', data.toString());
    });

    // 清理函数
    const cleanupFiles = () => {
      try {
        if (fs.existsSync(scriptPath)) {
          fs.unlinkSync(scriptPath);
        }
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (e) {
        console.error('清理临时文件失败:', e);
      }
    };

    python.on('error', (err) => {
      console.error('Python进程启动失败:', err);
      cleanupFiles();
      return res.status(500).json({ 
        error: 'Python进程启动失败', 
        details: err.message 
      });
    });

    python.on('close', (code) => {
      isCompleted = true;
      clearTimeout(timeout);

      if (code !== 0) {
        console.error('Python脚本执行错误:', error);
        console.error('Python输出:', output);
        console.error('退出代码:', code);
        cleanupFiles();
        return res.status(500).json({ 
          error: '函数图像生成失败', 
          details: error,
          output: output,
          exitCode: code
        });
      }

      try {
        // 尝试从输出中解析base64图像和额外信息
        const lines = output.split('\n');
        let base64Image = null;
        let expressionInfo = null;
        let method = 'unknown';
        
        for (const line of lines) {
          if (line.startsWith('SUCCESS:')) {
            // 查找base64图像数据
            const imageMatch = output.match(/'image': '([^']+)'/);
            if (imageMatch) {
              base64Image = imageMatch[1];
            }
          } else if (line.startsWith('EXPRESSION_INFO:')) {
            // 解析表达式信息
            try {
              const infoStr = line.replace('EXPRESSION_INFO:', '').trim();
              expressionInfo = JSON.parse(infoStr);
            } catch (e) {
              console.warn('解析表达式信息失败:', e);
            }
          } else if (line.startsWith('METHOD:')) {
            // 解析使用的方法
            method = line.replace('METHOD:', '').trim();
          }
        }
        
        if (base64Image) {
          // 清理所有临时文件
          cleanupFiles();
          
          const response = {
            success: true,
            image: `data:image/png;base64,${base64Image}`,
            metadata: {
              expression: expressions.length === 1 ? expressions[0] : expressions,
              expressions: expressions,
              options: plotOptions,
              method: method,
              isMultiple: expressions.length > 1
            }
          };
          
          // 添加表达式信息（如果有）
          if (expressionInfo) {
            response.expressionInfo = expressionInfo;
          }
          
          res.json(response);
        } else {
          // 回退到文件读取方式
          if (!fs.existsSync(imagePath)) {
            console.error('图像文件不存在:', imagePath);
            console.error('Python输出:', output);
            cleanupFiles();
            return res.status(500).json({ 
              error: '图像文件生成失败',
              details: output 
            });
          }

          const imageBuffer = fs.readFileSync(imagePath);
          const base64ImageFromFile = imageBuffer.toString('base64');
          
          // 清理所有临时文件
          cleanupFiles();

          res.json({
            success: true,
            image: `data:image/png;base64,${base64ImageFromFile}`,
            metadata: {
              expression: expressions.length === 1 ? expressions[0] : expressions,
              expressions: expressions,
              options: plotOptions,
              isMultiple: expressions.length > 1
            }
          });
        }
      } catch (e) {
        console.error('处理图像失败:', e);
        cleanupFiles();
        res.status(500).json({ error: '处理图像失败' });
      }
    });

  } catch (error) {
    console.error('生成函数图像时出错:', error);
    // 确保清理临时文件
    try {
      if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    } catch (e) {
      console.error('清理临时文件失败:', e);
    }
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 生成Python脚本内容
function generatePythonScript(expressions, options, outputPath, useEnhanced = true) {
  try {
    // 选择模板文件
    const templateFile = useEnhanced ? 'enhanced_function_plot_template.py' : 'function_plot_template.py';
    const templatePath = path.join(__dirname, '..', 'templates', templateFile);
    let template = fs.readFileSync(templatePath, 'utf8');
    
    // 转义特殊字符
    const escapedExpressions = JSON.stringify(expressions);
    const escapedTitle = options.title.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "\\'");
    const escapedOutputPath = outputPath.replace(/\\/g, '\\\\');
    
    // 创建简化的Python脚本
    const script = `
# -*- coding: utf-8 -*-
import sys
sys.path.append('${path.join(__dirname, '..', 'templates').replace(/\\/g, '\\\\')}')

from ${useEnhanced ? 'enhanced_function_plot_template' : 'function_plot_template'} import ${useEnhanced ? 'EnhancedFunctionPlotter' : 'SimpleFunctionPlotter'}
import json

# 创建绘图器
plotter = ${useEnhanced ? 'EnhancedFunctionPlotter()' : 'SimpleFunctionPlotter()'}

# 解析表达式数组
expressions = ${escapedExpressions}
print(f"接收到 {len(expressions)} 个表达式: {expressions}")

# 绘制函数
if len(expressions) == 1:
    # 单表达式使用原有方法
    result = plotter.plot_function(
        expression=expressions[0],
        x_range=(${options.xMin}, ${options.xMax}),
        title="${escapedTitle}",
        save_path="${escapedOutputPath}",
        color="${options.color}",
        grid=${options.grid ? 'True' : 'False'},
        use_sympy=${useEnhanced ? 'True' : 'False'}
    )
else:
    # 多表达式使用多函数绘制方法
    functions = [(expr, f"y{i+1} = {expr}") for i, expr in enumerate(expressions)]
    result = plotter.plot_multiple_functions(
        functions=functions,
        x_range=(${options.xMin}, ${options.xMax}),
        title="${escapedTitle}",
        save_path="${escapedOutputPath}",
        grid=${options.grid ? 'True' : 'False'},
        use_sympy=${useEnhanced ? 'True' : 'False'}
    )

# 输出结果
if result['success']:
    print("SUCCESS: 函数绘制成功")
    # 输出表达式信息（仅增强版）
    if 'expression_info' in result:
        print(f"EXPRESSION_INFO: {json.dumps(result['expression_info'])}")
    print(f"METHOD: {result.get('method', 'unknown')}")
else:
    print(f"ERROR: {result['message']}")
    sys.exit(1)
`;
    
    return script;
  } catch (error) {
    console.error('生成Python脚本失败:', error);
    throw new Error('无法生成Python脚本');
  }
}

// 增强版函数图像生成路由
router.post('/generate-enhanced-function-plot', async (req, res) => {
  try {
    const { expression, options = {} } = req.body;
    
    if (!expression) {
      return res.status(400).json({ error: '表达式不能为空' });
    }

    // 检查是否为表达式数组
    let expressions = [];
    if (Array.isArray(expression)) {
      expressions = expression;
    } else if (typeof expression === 'string') {
      // 尝试解析JSON字符串
      try {
        const parsed = JSON.parse(expression);
        if (Array.isArray(parsed)) {
          expressions = parsed;
        } else if (parsed.expressions && Array.isArray(parsed.expressions)) {
          expressions = parsed.expressions;
          // 如果解析出的对象包含其他选项，合并到options中
          if (parsed.xMin !== undefined) options.xMin = parsed.xMin;
          if (parsed.xMax !== undefined) options.xMax = parsed.xMax;
          if (parsed.yMin !== undefined) options.yMin = parsed.yMin;
          if (parsed.yMax !== undefined) options.yMax = parsed.yMax;
          if (parsed.title !== undefined) options.title = parsed.title;
        } else {
          expressions = [expression];
        }
      } catch (e) {
        expressions = [expression];
      }
    } else {
      expressions = [expression];
    }

    // 强制使用增强版选项
    const enhancedOptions = {
      ...options,
      useEnhanced: true
    };

    // 设置默认选项
    const plotOptions = {
      xMin: enhancedOptions.xMin || -10,
      xMax: enhancedOptions.xMax || 10,
      yMin: enhancedOptions.yMin || -10,
      yMax: enhancedOptions.yMax || 10,
      width: enhancedOptions.width || 800,
      height: enhancedOptions.height || 600,
      title: enhancedOptions.title || '函数图像',
      color: enhancedOptions.color || '#1f77b4',
      grid: enhancedOptions.grid !== false,
      dpi: enhancedOptions.dpi || 100,
      useEnhanced: true
    };

    // 创建临时目录（如果不存在）
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 生成唯一的文件名
    const timestamp = Date.now();
    const scriptPath = path.join(tempDir, `enhanced_plot_${timestamp}.py`);
    const imagePath = path.join(tempDir, `enhanced_plot_${timestamp}.png`);

    // 创建Python脚本
    const pythonScript = generatePythonScript(expressions, plotOptions, imagePath, true);
    console.log('生成的增强版Python脚本路径:', scriptPath);
    console.log('表达式数量:', expressions.length);

    // 写入Python脚本文件
    fs.writeFileSync(scriptPath, pythonScript);

    // 执行Python脚本 - 使用虚拟环境中的Python
    const pythonPath = path.join(__dirname, '..', '..', '.venv', 'Scripts', 'python.exe');
    
    // 设置环境变量以解决中文编码问题
    const env = { ...process.env };
    env.PYTHONIOENCODING = 'utf-8';
    env.LANG = 'zh_CN.UTF-8';
    
    const python = spawn(pythonPath, [scriptPath], { env });
    
    let output = '';
    let error = '';
    let isCompleted = false;

    // 设置超时机制（30秒）
    const timeout = setTimeout(() => {
      if (!isCompleted) {
        console.error('增强版Python脚本执行超时');
        python.kill('SIGTERM');
        cleanupFiles();
        if (!res.headersSent) {
          res.status(500).json({ 
            error: '函数图像生成超时', 
            details: 'Python脚本执行超过30秒'
          });
        }
      }
    }, 30000);

    python.stdout.on('data', (data) => {
      console.log('增强版Python stdout:', data.toString());
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      error += data.toString();
      console.error('增强版Python stderr:', data.toString());
    });

    // 清理函数
    const cleanupFiles = () => {
      try {
        if (fs.existsSync(scriptPath)) {
          fs.unlinkSync(scriptPath);
        }
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (e) {
        console.error('清理增强版临时文件失败:', e);
      }
    };

    python.on('error', (err) => {
      console.error('增强版Python进程启动失败:', err);
      cleanupFiles();
      return res.status(500).json({ 
        error: 'Python进程启动失败', 
        details: err.message 
      });
    });

    python.on('close', (code) => {
      isCompleted = true;
      clearTimeout(timeout);

      if (code !== 0) {
        console.error('增强版Python脚本执行错误:', error);
        console.error('增强版Python输出:', output);
        console.error('退出代码:', code);
        cleanupFiles();
        return res.status(500).json({ 
          error: '函数图像生成失败', 
          details: error,
          output: output,
          exitCode: code
        });
      }

      try {
        // 尝试从输出中解析base64图像和额外信息
        const lines = output.split('\n');
        let base64Image = null;
        let expressionInfo = null;
        let method = 'unknown';
        
        for (const line of lines) {
          if (line.startsWith('SUCCESS:')) {
            // 查找base64图像数据
            const imageMatch = output.match(/'image': '([^']+)'/);
            if (imageMatch) {
              base64Image = imageMatch[1];
            }
          } else if (line.startsWith('EXPRESSION_INFO:')) {
            // 解析表达式信息
            try {
              const infoStr = line.replace('EXPRESSION_INFO:', '').trim();
              expressionInfo = JSON.parse(infoStr);
            } catch (e) {
              console.warn('解析表达式信息失败:', e);
            }
          } else if (line.startsWith('METHOD:')) {
            // 解析使用的方法
            method = line.replace('METHOD:', '').trim();
          }
        }
        
        if (base64Image) {
          // 清理所有临时文件
          cleanupFiles();
          
          const response = {
            success: true,
            image: `data:image/png;base64,${base64Image}`,
            metadata: {
              expression: expressions.length === 1 ? expressions[0] : expressions,
              expressions: expressions,
              options: plotOptions,
              method: method,
              enhanced: true,
              isMultiple: expressions.length > 1
            }
          };
          
          // 添加表达式信息（如果有）
          if (expressionInfo) {
            response.expressionInfo = expressionInfo;
          }
          
          res.json(response);
        } else {
          // 回退到文件读取方式
          if (!fs.existsSync(imagePath)) {
            console.error('增强版图像文件不存在:', imagePath);
            console.error('增强版Python输出:', output);
            cleanupFiles();
            return res.status(500).json({ 
              error: '图像文件生成失败',
              details: output 
            });
          }

          const imageBuffer = fs.readFileSync(imagePath);
          const base64ImageFromFile = imageBuffer.toString('base64');
          
          // 清理所有临时文件
          cleanupFiles();

          res.json({
            success: true,
            image: `data:image/png;base64,${base64ImageFromFile}`,
            metadata: {
              expression: expressions.length === 1 ? expressions[0] : expressions,
              expressions: expressions,
              options: plotOptions,
              method: 'file',
              enhanced: true,
              isMultiple: expressions.length > 1
            }
          });
        }
      } catch (e) {
        console.error('处理增强版图像失败:', e);
        cleanupFiles();
        res.status(500).json({ error: '处理图像失败' });
      }
    });

  } catch (error) {
    console.error('生成增强版函数图像时出错:', error);
    // 确保清理临时文件
    try {
      if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    } catch (e) {
      console.error('清理增强版临时文件失败:', e);
    }
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;