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
      dpi: options.dpi || 100
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
    const pythonScript = generatePythonScript(expression, plotOptions, imagePath);
    console.log('生成的Python脚本:', pythonScript);
    console.log('生成的Python脚本路径:', scriptPath);

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

      // 检查图像文件是否生成
      if (!fs.existsSync(imagePath)) {
        console.error('图像文件不存在:', imagePath);
        console.error('Python输出:', output);
        cleanupFiles();
        return res.status(500).json({ 
          error: '图像文件生成失败',
          details: output 
        });
      }

      // 读取图像文件并转换为base64
      try {
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        
        // 清理所有临时文件
        cleanupFiles();

        res.json({
          success: true,
          image: `data:image/png;base64,${base64Image}`,
          metadata: {
            expression,
            options: plotOptions
          }
        });
      } catch (e) {
        console.error('读取图像文件失败:', e);
        cleanupFiles();
        res.status(500).json({ error: '读取图像文件失败' });
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
function generatePythonScript(expression, options, outputPath) {
  // 转义特殊字符
  const escapedExpression = expression.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "\\'");
  const escapedTitle = options.title.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "\\'");
  
  return `
# -*- coding: utf-8 -*-
import matplotlib.pyplot as plt
import matplotlib
import numpy as np
import sys
import re
import io
import locale
from sympy import symbols, sympify, lambdify, sqrt, sin, cos, tan, log, exp, Abs
from sympy import sinh, cosh, tanh, coth, sech, csch

# 尝试导入SciPy的椭圆函数
try:
    from scipy.special import ellipj, ellipk, ellipe, ellipkinc, ellipeinc
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    print("Warning: SciPy not available, elliptic functions will be limited")

# 手动实现简化的雅可比椭圆函数（使用SciPy或近似）
def jacobi_sn_manual(x, k):
    """简化的雅可比SN函数实现"""
    if SCIPY_AVAILABLE:
        # 使用SciPy的ellipj函数
        sn, cn, dn, ph = ellipj(x, k**2)  # 注意：SciPy使用m=k^2
        return sn
    else:
        # 如果没有SciPy，使用正弦波近似（仅用于演示）
        import sympy
        return sympy.sin(x) * (1 - 0.5 * k**2)

def jacobi_cn_manual(x, k):
    """简化的雅可比CN函数实现"""
    if SCIPY_AVAILABLE:
        sn, cn, dn, ph = ellipj(x, k**2)
        return cn
    else:
        # 近似实现
        import sympy
        return sympy.cos(x) * (1 - 0.5 * k**2)

def jacobi_dn_manual(x, k):
    """简化的雅可比DN函数实现"""
    if SCIPY_AVAILABLE:
        sn, cn, dn, ph = ellipj(x, k**2)
        return dn
    else:
        # 近似实现
        import sympy
        return 1 - 0.5 * k**2 * (1 - sympy.cos(2*x))

# 椭圆积分函数
def elliptic_k_manual(k):
    """第一类完全椭圆积分"""
    if SCIPY_AVAILABLE:
        return ellipk(k**2)
    else:
        # 近似实现
        import sympy
        return sympy.pi/2 * (1 + k**2/4 + 9*k**4/64)

def elliptic_e_manual(k):
    """第二类完全椭圆积分"""
    if SCIPY_AVAILABLE:
        return ellipe(k**2)
    else:
        # 近似实现
        import sympy
        return sympy.pi/2 * (1 - k**2/4 - 3*k**4/64)

# 设置输出编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# 设置中文字体支持
matplotlib.rcParams['font.sans-serif'] = ['SimHei', 'DejaVu Sans', 'Arial Unicode MS', 'Microsoft YaHei']
matplotlib.rcParams['axes.unicode_minus'] = False
plt.rcParams['figure.figsize'] = (8, 6)

# 确保matplotlib使用正确的编码
matplotlib.font_manager.fontManager.addfont(matplotlib.get_data_path() + '/fonts/ttf/DejaVuSans.ttf')

print("开始生成函数图像...")

# 设置图像DPI
plt.figure(figsize=(${options.width/100}, ${options.height/100}), dpi=${options.dpi})

# 解析表达式
def parse_expression(expr):
    """解析数学表达式"""
    try:
        # 检查是否是隐式方程
        if '=' in expr:
            return parse_implicit_equation(expr)
        
        # 定义符号变量
        x = symbols('x')
        
        # 替换数学函数
        expr = expr.replace('sin', 'sin')
        expr = expr.replace('cos', 'cos')
        expr = expr.replace('tan', 'tan')
        expr = expr.replace('log', 'log')
        expr = expr.replace('ln', 'log')
        expr = expr.replace('sqrt', 'sqrt')
        expr = expr.replace('abs', 'Abs')
        expr = expr.replace('exp', 'exp')
        expr = expr.replace('sinh', 'sinh')
        expr = expr.replace('cosh', 'cosh')
        expr = expr.replace('tanh', 'tanh')
        expr = expr.replace('coth', 'coth')
        expr = expr.replace('sech', 'sech')
        expr = expr.replace('csch', 'csch')
        
        # 替换雅可比椭圆函数（使用lambda函数）
        if 'jacobiSN' in expr:
            expr = expr.replace('jacobiSN', 'jacobi_sn_lambda')
        if 'jacobiCN' in expr:
            expr = expr.replace('jacobiCN', 'jacobi_cn_lambda')
        if 'jacobiDN' in expr:
            expr = expr.replace('jacobiDN', 'jacobi_dn_lambda')
        if 'ellipticK' in expr:
            expr = expr.replace('ellipticK', 'elliptic_k_lambda')
        if 'ellipticE' in expr:
            expr = expr.replace('ellipticE', 'elliptic_e_lambda')
        
        # 替换指数表达式 e^x -> exp(x)
        expr = re.sub(r'e\^\s*([a-zA-Z]+|\([^)]+\))', r'exp(\g<1>)', expr)
        print(f"指数替换后: {expr}")
        
        # 替换常数
        expr = expr.replace('pi', 'pi')
        # 只替换单独的e，避免替换exp中的e
        expr = re.sub(r'\be\b', 'E', expr)
        
        # 替换指数运算符
        expr = expr.replace('^', '**')
        print(f"最终表达式: {expr}")
        
        # 解析表达式
        parsed_expr = sympify(expr)
        print(f"SymPy表达式: {parsed_expr}")
        
        # 为lambdify提供额外的函数
        additional_functions = {
            'jacobi_sn_lambda': jacobi_sn_manual,
            'jacobi_cn_lambda': jacobi_cn_manual,
            'jacobi_dn_lambda': jacobi_dn_manual,
            'elliptic_k_lambda': elliptic_k_manual,
            'elliptic_e_lambda': elliptic_e_manual
        }
        
        # 创建一个包含所有自定义函数的字典
        local_dict = {
            'jacobi_sn_manual': jacobi_sn_manual,
            'jacobi_cn_manual': jacobi_cn_manual,
            'jacobi_dn_manual': jacobi_dn_manual,
            'elliptic_k_manual': elliptic_k_manual,
            'elliptic_e_manual': elliptic_e_manual,
            'np': np
        }
        
        # 使用lambdify生成函数，然后手动包装
        lambdified_func = lambdify(x, parsed_expr, modules=['numpy'])
        
        def wrapped_func(x_val):
            return lambdified_func(x_val, local_dict)
        
        return wrapped_func
    except Exception as e:
        print(f"解析表达式失败: {e}")
        return None

def parse_implicit_equation(equation):
    """解析隐式方程"""
    try:
        # 处理双曲线方程 y^2/a^2 - x^2/b^2 = 1
        if 'y^2' in equation and 'x^2' in equation and '=' in equation:
            left_side, right_side = equation.split('=', 1)
            left_side = left_side.strip()
            right_side = right_side.strip()
            
            if 'y^2' in left_side and 'x^2' in left_side:
                # 提取参数a和b
                a = 1
                b = 1
                
                # 匹配 y^2/a^2 形式
                a_match = re.search(r'y\^2\/(\\d+(?:\\.\\d+)?)\^2', left_side)
                if a_match:
                    a = float(a_match.group(1))
                
                # 匹配 x^2/b^2 形式  
                b_match = re.search(r'x\^2\/(\\d+(?:\\.\\d+)?)\^2', left_side)
                if b_match:
                    b = float(b_match.group(1))
                
                return lambda x: np.sqrt(a**2 + (a**2/b**2) * x**2), 'hyperbola'
        
        # 处理椭圆方程 x^2/a^2 + y^2/b^2 = 1
        if 'x^2' in equation and 'y^2' in equation and '=' in equation:
            left_side, right_side = equation.split('=', 1)
            left_side = left_side.strip()
            
            if '+' in left_side:
                # 提取参数a和b
                a = 5  # 默认值
                b = 3  # 默认值
                
                # 匹配 x^2/a^2 形式
                a_match = re.search(r'x\^2\/(\\d+(?:\\.\\d+)?)\^2', left_side)
                if a_match:
                    a = float(a_match.group(1))
                
                # 匹配 y^2/b^2 形式
                b_match = re.search(r'y\^2\/(\\d+(?:\\.\\d+)?)\^2', left_side)
                if b_match:
                    b = float(b_match.group(1))
                
                return lambda x: np.sqrt(b**2 * (1 - x**2/a**2)), 'ellipse'
        
        return None, 'unknown'
    except Exception as e:
        print(f"解析隐式方程失败: {e}")
        return None, 'unknown'

# 主要绘图逻辑
try:
    expression = """${escapedExpression}"""
    print(f"解析表达式: {expression}")
    
    # 解析表达式
    result = parse_expression(expression)
    
    if result is None:
        print("无法解析表达式")
        sys.exit(1)
    
    # 检查返回类型
    if isinstance(result, tuple):
        func, plot_type = result
    else:
        func = result
        plot_type = 'function'
    
    # 创建x值范围
    x_min = ${options.xMin}
    x_max = ${options.xMax}
    y_min = ${options.yMin}
    y_max = ${options.yMax}
    
    x = np.linspace(x_min, x_max, 1000)
    
    # 创建图形
    fig, ax = plt.subplots(figsize=(${options.width/100}, ${options.height/100}))
    
    # 绘制网格
    if ${options.grid ? 'True' : 'False'}:
        ax.grid(True, alpha=0.3)
    
    # 设置坐标轴范围
    ax.set_xlim(x_min, x_max)
    ax.set_ylim(y_min, y_max)
    
    # 设置坐标轴标签
    ax.set_xlabel('x')
    ax.set_ylabel('y')
    
    # 设置标题
    ax.set_title('${escapedTitle}')
    
    # 绘制函数
    if plot_type == 'hyperbola':
        # 双曲线：绘制上下两部分
        try:
            y_upper = func(x)
            y_lower = -func(x)
            
            # 只绘制在范围内的点
            mask_upper = (y_upper >= y_min) & (y_upper <= y_max)
            mask_lower = (y_lower >= y_min) & (y_lower <= y_max)
            
            ax.plot(x[mask_upper], y_upper[mask_upper], color='${options.color}', linewidth=2)
            ax.plot(x[mask_lower], y_lower[mask_lower], color='${options.color}', linewidth=2)
        except Exception as e:
            print(f"绘制双曲线失败: {e}")
            sys.exit(1)
    elif plot_type == 'ellipse':
        # 椭圆：使用参数方程
        try:
            theta = np.linspace(0, 2*np.pi, 1000)
            x_ellipse = x  # 这里需要从解析中提取a和b参数
            y_ellipse = func(x)
            
            # 只绘制在范围内的点
            mask = (y_ellipse >= y_min) & (y_ellipse <= y_max)
            ax.plot(x[mask], y_ellipse[mask], color='${options.color}', linewidth=2)
        except Exception as e:
            print(f"绘制椭圆失败: {e}")
            sys.exit(1)
    else:
        # 普通函数
        try:
            y = func(x)
            
            # 确保y是numpy数组
            y = np.asarray(y, dtype=float)
            
            # 处理无穷大和NaN值 - 使用更安全的方法
            try:
                # 创建一个掩码来标识有限值
                finite_mask = np.isfinite(y)
                y = np.where(finite_mask, y, np.nan)
            except Exception as finite_error:
                print(f"处理有限值时出错: {finite_error}")
                # 如果isfinite失败，手动处理常见情况
                y = np.where(np.abs(y) < 1e10, y, np.nan)
                y = np.where(y != y, np.nan, y)  # 处理NaN
            
            # 绘制函数
            ax.plot(x, y, color='${options.color}', linewidth=2)
        except Exception as e:
            print(f"绘制函数失败: {e}")
            print(f"函数对象: {func}")
            print(f"尝试计算示例值: func(0) = {func(0) if hasattr(func, '__call__') else 'Not callable'}")
            # 尝试逐点计算以诊断问题
            try:
                test_values = [func(0), func(1), func(-1)]
                print(f"测试值: func(0)={test_values[0]}, func(1)={test_values[1]}, func(-1)={test_values[2]}")
                print(f"测试值类型: {[type(v) for v in test_values]}")
            except Exception as test_error:
                print(f"测试计算失败: {test_error}")
            sys.exit(1)
    
    # 添加零线
    ax.axhline(y=0, color='black', linewidth=0.5, alpha=0.5)
    ax.axvline(x=0, color='black', linewidth=0.5, alpha=0.5)
    
    # 保存图像
    plt.tight_layout()
    output_path = r'${outputPath.replace(/\\/g, '\\\\')}'
    plt.savefig(output_path, dpi=${options.dpi}, bbox_inches='tight')
    plt.close()
    print(f"图像已保存到: {output_path}")
    
    print("图像生成成功")
    
except Exception as e:
    print(f"生成图像时出错: {e}")
    sys.exit(1)
`;
}

module.exports = router;