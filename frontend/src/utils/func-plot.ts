// function-plotter.ts
import functionPlot, { FunctionPlotOptions } from 'function-plot';

export interface PlotOptions {
    /** X轴范围 [最小值, 最大值] */
    xRange?: [number, number];
    /** Y轴范围 [最小值, 最大值] */
    yRange?: [number, number];
    /** 线条颜色 */
    color?: string;
    /** 采样点数 */
    samples?: number;
    /** 图表宽度 */
    width?: number;
    /** 图表高度 */
    height?: number;
    /** 是否禁用缩放 */
    disableZoom?: boolean;
}

export interface ImplicitOptions extends PlotOptions {
    /** 阈值 */
    threshold?: number;
}

export interface ParametricOptions extends PlotOptions {
    /** 参数 t 的范围 */
    tRange?: [number, number];
}

export interface PolarOptions extends PlotOptions {
    /** θ 的范围 */
    thetaRange?: [number, number];
}

export class FunctionPlotter {
    private container: HTMLElement;
    private plotInstance: any;

    /**
     * 创建函数绘图器
     * @param containerId 容器元素的ID或HTMLElement
     * @throws 如果容器不存在则抛出错误
     */
    constructor(containerId: string | HTMLElement) {
        if (!containerId) {
            throw new Error('容器ID不能为空');
        }

        if (!containerId) {
            throw new Error('容器ID不能为空');
        }

        if (typeof containerId === 'string') {
            if (containerId.indexOf('#') > -1) {
                this.container = document.getElementById(containerId.replace('#', ''))!;
            } else if (containerId.indexOf('.') > -1) {
                this.container = document.querySelector(containerId)!;
            } else {
                this.container = document.getElementById(containerId)!;
            }
        } else {
            this.container = containerId;
        }

        if (!this.container) {
            throw new Error(`未找到ID为${containerId}的元素`);
        }

        // 确保容器有默认尺寸
        if (!this.container.style.width) {
            this.container.style.width = '800px';
        }
        if (!this.container.style.height) {
            this.container.style.height = '600px';
        }

        console.log('FunctionPlotter 初始化成功，容器:', this.container);
    }

    /**
     * 清理表达式，确保符合 function-plot 语法
     * @param expression 原始表达式
     * @returns 清理后的表达式
     */
    private cleanExpression(expression: string): string {
        let cleaned = expression.trim();

        cleaned = this.fixExponent(cleaned);
        // 替换常见的错误写法
        cleaned = cleaned.replace(/Math\./g, ''); // 移除 Math. 前缀

        // 确保函数调用有括号
        const functionPatterns = [
            'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
            'sinh', 'cosh', 'tanh', 'sqrt', 'exp', 'log',
            'log10', 'abs', 'floor', 'ceil', 'round'
        ];

        functionPatterns.forEach(func => {
            const regex = new RegExp(`\\b${func}\\s+([^\\s(])`, 'g');
            cleaned = cleaned.replace(regex, `${func}($1)`);
        });
        return cleaned;
    }

    /**
     * 修复指数表示 e^x → exp(x)
     * @param expression 原始表达式
     * @returns 修复后的表达式
     */
    private fixExponent(expression: string): string {
         // 专门修复 e 指数问题的方法
        let result = expression;
        
        // 模式1: e^x 或 e**(x)
        const eExponentPattern = /e\^|e\*\*/g;
        
        // 找到所有 e^ 或 e** 的位置
        let match;
        const positions: {start: number, end: number}[] = [];
        
        while ((match = eExponentPattern.exec(expression)) !== null) {
            positions.push({
                start: match.index,
                end: match.index + match[0].length
            });
        }
        
        // 从后往前处理，避免索引变化
        for (let i = positions.length - 1; i >= 0; i--) {
            const { start, end } = positions[i];
            const before: string = result.substring(0, start);
            const after: string = result.substring(end);
            
            // 找到指数部分
            let exponent = '';
            let parenCount = 0;
            let j = 0;
            
            // 跳过可能的空白
            while (j < after.length && /\s/.test(after[j])) j++;
            
            // 检查括号
            if (j < after.length && after[j] === '(') {
                parenCount = 1;
                let k = j + 1;
                while (k < after.length && parenCount > 0) {
                    if (after[k] === '(') parenCount++;
                    if (after[k] === ')') parenCount--;
                    k++;
                }
                exponent = after.substring(j, k);
            } else {
                // 没有括号，取到下一个运算符或结束
                let k = j;
                while (k < after.length && /[\w\.]/.test(after[k])) {
                    k++;
                }
                exponent = after.substring(j, k);
                if (exponent) {
                    exponent = `(${exponent})`;
                }
            }
            
            if (exponent) {
                result = before + `exp${exponent}` + after.substring(j + exponent.length);
            }
        }
        return result;
    }

    /**
     * 绘制显函数 y = f(x)
     * @param expression 函数表达式，使用 function-plot 语法
     * @param options 绘图选项
     */
    plotExplicit(expression: string, options: PlotOptions = {}): void {
        try {
            console.log('绘制显函数:', expression);

            // 清理表达式
            const cleanedExpr = this.cleanExpression(expression);

            // 清空容器
            this.container.innerHTML = '';

            // 设置默认范围
            const xRange = options.xRange || [-10, 10];
            const yRange = options.yRange || [-10, 10];
            const color = options.color || '#007bff';
            const samples = options.samples || 1000;

            // 创建绘图配置
            const config: FunctionPlotOptions = {
                target: this.container,
                width: options.width || this.container.clientWidth,
                height: options.height || this.container.clientHeight,
                xAxis: {
                    domain: xRange,
                    label: 'x'
                },
                yAxis: {
                    domain: yRange,
                    label: 'y'
                },
                grid: true,
                disableZoom: options.disableZoom || false,
                tip: {
                    renderer: (x: number, y: number) => {
                        return `(${x.toFixed(3)}, ${y.toFixed(3)})`;
                    }
                },
                data: [{
                    fn: cleanedExpr,
                    graphType: 'polyline' as const,
                    color: color,
                    nSamples: samples
                }]
            };

            // 创建绘图
            this.plotInstance = functionPlot(config);

            console.log('显函数绘图成功');

        } catch (error: any) {
            console.error('显函数绘图错误:', error);
            throw new Error(`显函数绘图失败: ${error.message}`);
        }
    }

    /**
     * 绘制隐函数 f(x, y) = 0
     * @param expression 隐函数表达式
     * @param options 绘图选项
     */
    plotImplicit(expression: string, options: ImplicitOptions = {}): void {
        try {
            console.log('绘制隐函数:', expression);

            // 清理表达式
            const cleanedExpr = this.cleanExpression(expression);

            // 清空容器
            this.container.innerHTML = '';

            // 设置默认范围
            const xRange = options.xRange || [-5, 5];
            const yRange = options.yRange || [-5, 5];
            const color = options.color || '#28a745';
            const samples = options.samples || 2000;

            // 创建绘图配置
            const config: FunctionPlotOptions = {
                target: this.container,
                width: options.width || this.container.clientWidth,
                height: options.height || 500,
                xAxis: {
                    domain: xRange,
                    label: 'x'
                },
                yAxis: {
                    domain: yRange,
                    label: 'y'
                },
                grid: true,
                disableZoom: options.disableZoom || false,
                data: [{
                    fn: cleanedExpr,
                    fnType: 'implicit' as const,
                    color: color,
                    nSamples: samples
                }]
            };

            // 创建绘图
            this.plotInstance = functionPlot(config);

            console.log('隐函数绘图成功');

        } catch (error: any) {
            console.error('隐函数绘图错误:', error);
            throw new Error(`隐函数绘图失败: ${error.message}`);
        }
    }

    /**
     * 绘制参数方程
     * @param xExpression x = f(t)
     * @param yExpression y = g(t)
     * @param options 绘图选项
     */
    plotParametric(xExpression: string, yExpression: string, options: ParametricOptions = {}): void {
        try {
            console.log('绘制参数方程:', xExpression, yExpression);

            // 清理表达式
            const cleanedXExpr = this.cleanExpression(xExpression);
            const cleanedYExpr = this.cleanExpression(yExpression);

            // 清空容器
            this.container.innerHTML = '';

            // 设置默认范围
            const tRange = options.tRange || [0, 2 * Math.PI];
            const color = options.color || '#dc3545';
            const samples = options.samples || 1000;

            // 自动计算显示范围
            const autoRange = this.estimateParametricRange(cleanedXExpr, cleanedYExpr, tRange);

            // 创建绘图配置
            const config: FunctionPlotOptions = {
                target: this.container,
                width: options.width || this.container.clientWidth,
                height: options.height || 500,
                xAxis: {
                    domain: options.xRange || autoRange.xRange,
                    label: 'x'
                },
                yAxis: {
                    domain: options.yRange || autoRange.yRange,
                    label: 'y'
                },
                grid: true,
                disableZoom: options.disableZoom || false,
                data: [{
                    fn: cleanedYExpr,
                    fnType: 'parametric' as const,
                    t: cleanedXExpr,
                    range: tRange,
                    color: color,
                    nSamples: samples
                }]
            };

            // 创建绘图
            this.plotInstance = functionPlot(config);

            console.log('参数方程绘图成功');

        } catch (error: any) {
            console.error('参数方程绘图错误:', error);
            throw new Error(`参数方程绘图失败: ${error.message}`);
        }
    }

    /**
     * 绘制极坐标函数 r = f(θ)
     * @param expression 极坐标表达式
     * @param options 绘图选项
     */
    plotPolar(expression: string, options: PolarOptions = {}): void {
        try {
            console.log('绘制极坐标函数:', expression);

            // 清理表达式
            const cleanedExpr = this.cleanExpression(expression);

            // 清空容器
            this.container.innerHTML = '';

            // 设置默认范围
            const thetaRange = options.thetaRange || [0, 2 * Math.PI];
            const color = options.color || '#ffc107';
            const samples = options.samples || 2000;

            // 创建绘图配置
            const config: FunctionPlotOptions = {
                target: this.container,
                width: options.width || this.container.clientWidth,
                height: options.height || 500,
                xAxis: {
                    domain: options.xRange || [-5, 5],
                    label: 'x'
                },
                yAxis: {
                    domain: options.yRange || [-5, 5],
                    label: 'y'
                },
                grid: true,
                disableZoom: options.disableZoom || false,
                data: [{
                    r: cleanedExpr,
                    fnType: 'polar' as const,
                    range: thetaRange,
                    color: color,
                    nSamples: samples
                }]
            };

            // 创建绘图
            this.plotInstance = functionPlot(config);

            console.log('极坐标绘图成功');

        } catch (error: any) {
            console.error('极坐标绘图错误:', error);
            throw new Error(`极坐标绘图失败: ${error.message}`);
        }
    }

    /**
     * 智能绘图 - 自动检测表达式类型
     * @param expression 函数表达式
     * @param options 绘图选项
     */
    smartPlot(expression: string, options: PlotOptions = {}): void {
        try {
            const type = this.detectExpressionType(expression);
            console.log(`检测到表达式类型: ${type}`, expression);

            switch (type) {
                case 'explicit':
                    this.plotExplicit(expression, options);
                    break;
                case 'implicit':
                    this.plotImplicit(expression, options);
                    break;
                case 'parametric':
                    this.plotParametricFromString(expression, options);
                    break;
                case 'polar':
                    this.plotPolar(expression, options);
                    break;
                default:
                    this.plotExplicit(expression, options);
            }

        } catch (error: any) {
            console.error('智能绘图错误:', error);
            throw new Error(`智能绘图失败: ${error.message}`);
        }
    }

    /**
     * 绘制多个函数
     * @param expressions 函数表达式数组
     * @param options 绘图选项
     */
    plotMultiple(expressions: Array<{
        expression: string;
        color?: string;
        type?: 'explicit' | 'implicit' | 'parametric' | 'polar';
        options?: any;
    }>, commonOptions: PlotOptions = {}): void {
        try {
            console.log('绘制多个函数:', expressions.length);

            // 清空容器
            this.container.innerHTML = '';

            // 设置默认范围
            const xRange = commonOptions.xRange || [-10, 10];
            const yRange = commonOptions.yRange || [-10, 10];

            // 准备数据
            const data: any[] = [];
            const colors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6c757d'];

            expressions.forEach((item, index) => {
                const expression = this.cleanExpression(item.expression);
                const color = item.color || colors[index % colors.length];
                const type = item.type || this.detectExpressionType(item.expression);

                let plotData: any = {
                    color: color
                };

                switch (type) {
                    case 'implicit':
                        plotData.fn = expression;
                        plotData.fnType = 'implicit';
                        plotData.nSamples = 2000;
                        break;
                    case 'parametric':
                        // 解析参数方程
                        const parametric = this.parseParametricExpression(expression);
                        if (parametric) {
                            plotData.fn = parametric.y;
                            plotData.fnType = 'parametric';
                            plotData.t = parametric.x;
                            plotData.range = [0, 2 * Math.PI];
                        }
                        break;
                    case 'polar':
                        plotData.r = expression;
                        plotData.fnType = 'polar';
                        plotData.range = [0, 2 * Math.PI];
                        break;
                    default:
                        plotData.fn = expression;
                        plotData.graphType = 'polyline';
                }

                data.push(plotData);
            });

            // 创建绘图配置
            const config: FunctionPlotOptions = {
                target: this.container,
                width: commonOptions.width || this.container.clientWidth,
                height: commonOptions.height || 500,
                xAxis: {
                    domain: xRange,
                    label: 'x'
                },
                yAxis: {
                    domain: yRange,
                    label: 'y'
                },
                grid: true,
                disableZoom: commonOptions.disableZoom || false,
                tip: {
                    renderer: (x: number, y: number) => {
                        return `(${x.toFixed(3)}, ${y.toFixed(3)})`;
                    }
                },
                data: data
            };

            // 创建绘图
            this.plotInstance = functionPlot(config);

            console.log('多函数绘图成功');

        } catch (error: any) {
            console.error('多函数绘图错误:', error);
            throw new Error(`多函数绘图失败: ${error.message}`);
        }
    }

    /**
     * 绘制常见图形
     */

    /** 绘制直线 y = mx + b */
    plotLine(m: number = 1, b: number = 0, options: PlotOptions = {}): void {
        const expression = `${m} * x + ${b}`;
        this.plotExplicit(expression, {
            color: '#007bff',
            xRange: [-10, 10],
            yRange: [-10, 10],
            ...options
        });
    }

    /** 绘制抛物线 y = ax² + bx + c */
    plotParabola(a: number = 1, b: number = 0, c: number = 0, options: PlotOptions = {}): void {
        const expression = `${a} * x^2 + ${b} * x + ${c}`;
        this.plotExplicit(expression, {
            color: '#28a745',
            xRange: [-5, 5],
            yRange: [-2, 10],
            ...options
        });
    }

    /** 绘制正弦函数 y = A·sin(ωx + φ) */
    plotSine(A: number = 1, omega: number = 1, phi: number = 0, options: PlotOptions = {}): void {
        const expression = `${A} * sin(${omega} * x + ${phi})`;
        this.plotExplicit(expression, {
            color: '#dc3545',
            xRange: [-10, 10],
            yRange: [-A - 1, A + 1],
            ...options
        });
    }

    /** 绘制余弦函数 y = A·cos(ωx + φ) */
    plotCosine(A: number = 1, omega: number = 1, phi: number = 0, options: PlotOptions = {}): void {
        const expression = `${A} * cos(${omega} * x + ${phi})`;
        this.plotExplicit(expression, {
            color: '#ffc107',
            xRange: [-10, 10],
            yRange: [-A - 1, A + 1],
            ...options
        });
    }

    /** 绘制指数函数 y = a^x */
    plotExponential(base: number = Math.E, options: PlotOptions = {}): void {
        const expression = base === Math.E ? 'exp(x)' : `${base}^x`;
        this.plotExplicit(expression, {
            color: '#17a2b8',
            xRange: [-3, 3],
            yRange: [0, 20],
            ...options
        });
    }

    /** 绘制圆 (x - h)² + (y - k)² = r² */
    plotCircle(radius: number = 1, centerX: number = 0, centerY: number = 0, options: ImplicitOptions = {}): void {
        const expression = `(x - ${centerX})^2 + (y - ${centerY})^2 - ${radius * radius}`;
        const range = radius + 2;
        this.plotImplicit(expression, {
            color: '#007bff',
            xRange: [centerX - range, centerX + range],
            yRange: [centerY - range, centerY + range],
            ...options
        });
    }

    /** 绘制椭圆 (x - h)²/a² + (y - k)²/b² = 1 */
    plotEllipse(a: number = 2, b: number = 1, centerX: number = 0, centerY: number = 0, options: ImplicitOptions = {}): void {
        const expression = `(x - ${centerX})^2/${a * a} + (y - ${centerY})^2/${b * b} - 1`;
        this.plotImplicit(expression, {
            color: '#28a745',
            xRange: [centerX - a - 2, centerX + a + 2],
            yRange: [centerY - b - 2, centerY + b + 2],
            ...options
        });
    }

    /** 绘制参数圆 */
    plotParametricCircle(radius: number = 1, centerX: number = 0, centerY: number = 0, options: ParametricOptions = {}): void {
        const xExpr = `${centerX} + ${radius} * cos(t)`;
        const yExpr = `${centerY} + ${radius} * sin(t)`;
        this.plotParametric(xExpr, yExpr, {
            color: '#dc3545',
            tRange: [0, 2 * Math.PI],
            ...options
        });
    }

    /** 绘制玫瑰线 r = a·cos(kθ) */
    plotRose(a: number = 1, k: number = 3, options: PolarOptions = {}): void {
        const expression = `${a} * cos(${k} * theta)`;
        this.plotPolar(expression, {
            color: '#ffc107',
            thetaRange: [0, 2 * Math.PI],
            ...options
        });
    }

    /**
     * 清除绘图
     */
    clear(): void {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.plotInstance = null;
    }

    /**
     * 重新绘制
     */
    redraw(): void {
        if (this.plotInstance) {
            this.plotInstance.draw();
        }
    }

    /**
     * 获取当前绘图实例
     */
    getPlotInstance(): any {
        return this.plotInstance;
    }

    /**
     * 检测表达式类型
     */
    private detectExpressionType(expression: string): 'explicit' | 'implicit' | 'parametric' | 'polar' {
        const expr = expression.toLowerCase().trim();

        // 检查极坐标
        if (expr.includes('theta') || expr.includes('r=')) {
            return 'polar';
        }

        // 检查参数方程
        if ((expr.includes('x=') && expr.includes('y=') && expr.includes('t')) ||
            (expr.startsWith('(') && expr.includes(',') && expr.endsWith(')') && expr.includes('t'))) {
            return 'parametric';
        }

        // 检查隐函数
        if (expr.includes('x') && expr.includes('y') && !expr.includes('=')) {
            return 'implicit';
        }

        // 检查显函数中的隐函数写法
        if (expr.includes('=')) {
            const parts: string[] = expr.split('=');
            if (parts.length === 2) {
                const left = parts[0]?.trim() || '';
                const right = parts[1]?.trim() || '';
                if (left.includes('y') && !left.includes('x')) {
                    return 'explicit';
                }
                if (left.includes('x') && left.includes('y') ||
                    right.includes('x') && right.includes('y')) {
                    return 'implicit';
                }
            }
        }

        // 默认认为是显函数
        return 'explicit';
    }

    /**
     * 从字符串解析参数方程
     */
    private parseParametricExpression(expression: string): { x: string, y: string } | null {
        const expr = expression.trim();

        // 格式1: x=f(t), y=g(t)
        if (expr.includes('x=') && expr.includes('y=')) {
            const parts = expr.split(',').map(p => p.trim());
            let xExpr = '', yExpr = '';

            parts.forEach(part => {
                if (part.startsWith('x=')) {
                    xExpr = part.substring(2).trim();
                } else if (part.startsWith('y=')) {
                    yExpr = part.substring(2).trim();
                }
            });

            if (xExpr && yExpr) {
                return { x: xExpr, y: yExpr };
            }
        }

        // 格式2: f(t), g(t)
        if (expr.includes(',') && !expr.includes('=')) {
            const parts = expr.split(',').map(p => p.trim());
            if (parts.length >= 2) {
                return { x: parts[0] || '', y: parts[1] || '' };
            }
        }

        // 格式3: (f(t), g(t))
        if (expr.startsWith('(') && expr.endsWith(')') && expr.includes(',')) {
            const inner = expr.substring(1, expr.length - 1).trim();
            const parts = inner.split(',').map(p => p.trim());
            if (parts.length >= 2) {
                return { x: parts[0] || '', y: parts[1] || '' };
            }
        }

        return null;
    }

    /**
     * 从字符串绘制参数方程
     */
    private plotParametricFromString(expression: string, options: PlotOptions = {}): void {
        const parametric = this.parseParametricExpression(expression);
        if (!parametric) {
            throw new Error('无法解析参数方程');
        }

        this.plotParametric(parametric.x, parametric.y, options as ParametricOptions);
    }

    /**
     * 估计参数方程的范围
     */
    private estimateParametricRange(xExpr: string, yExpr: string, tRange: [number, number]): { xRange: [number, number], yRange: [number, number] } {
        // 简单估计：采样几个点
        const samples = 8;
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        for (let i = 0; i <= samples; i++) {
            const t = tRange[0] + (tRange[1] - tRange[0]) * i / samples;

            try {
                // 使用 eval 计算（注意安全性，这里只用于内部估计）
                const scope = { t, Math };
                const x = eval(xExpr.replace(/sin\(/g, 'Math.sin(')
                    .replace(/cos\(/g, 'Math.cos(')
                    .replace(/tan\(/g, 'Math.tan(')
                    .replace(/sqrt\(/g, 'Math.sqrt(')
                    .replace(/exp\(/g, 'Math.exp(')
                    .replace(/log\(/g, 'Math.log(')
                    .replace(/abs\(/g, 'Math.abs(')
                    .replace(/\^/g, '**'));
                const y = eval(yExpr.replace(/sin\(/g, 'Math.sin(')
                    .replace(/cos\(/g, 'Math.cos(')
                    .replace(/tan\(/g, 'Math.tan(')
                    .replace(/sqrt\(/g, 'Math.sqrt(')
                    .replace(/exp\(/g, 'Math.exp(')
                    .replace(/log\(/g, 'Math.log(')
                    .replace(/abs\(/g, 'Math.abs(')
                    .replace(/\^/g, '**'));

                if (typeof x === 'number' && isFinite(x)) {
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                }

                if (typeof y === 'number' && isFinite(y)) {
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            } catch (e) {
                // 忽略计算错误
            }
        }

        // 添加边距
        const marginX = Math.max((maxX - minX) * 0.1, 0.5);
        const marginY = Math.max((maxY - minY) * 0.1, 0.5);

        return {
            xRange: [minX - marginX, maxX + marginX] as [number, number],
            yRange: [minY - marginY, maxY + marginY] as [number, number]
        };
    }
}

// 导出快捷创建函数
export function createPlotter(containerId: string | HTMLElement): FunctionPlotter {
    return new FunctionPlotter(containerId);
}

// 导出默认实例
export default FunctionPlotter;