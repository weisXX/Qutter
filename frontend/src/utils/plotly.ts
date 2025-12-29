import Plotly from 'plotly.js-dist-min';
// PlotlyPlotter 类定义 - 完整版
export default class PlotlyPlotter {
    container: any;
    constructor(containerId: string | HTMLElement) {
        if (!containerId) {
            throw new Error('容器ID不能为空');
        }
        if (typeof containerId === 'string') {
            if (containerId.indexOf('#') > -1) {
                this.container = document.getElementById(containerId.replace('#', ''));
            } else {
                if (containerId.indexOf('.') > -1) {
                    this.container = document.querySelector(containerId);
                } else {
                    this.container = document.getElementById(containerId);
                }
            }
        } else {
            this.container = containerId;
        }
        if (!this.container) {
            throw new Error(`未找到ID为${containerId}的元素`);
        }
    }

    // 安全计算函数
    evaluate(expr: string, variables = {}): number {
        try {
            if (typeof expr !== 'string') return NaN;

            // 清理表达式
            let cleanExpr = expr
                .replace(/\^/g, '**')
                .replace(/sin\(/gi, 'Math.sin(')
                .replace(/cos\(/gi, 'Math.cos(')
                .replace(/tan\(/gi, 'Math.tan(')
                .replace(/cot\(/gi, '1/Math.tan(')
                .replace(/sec\(/gi, '1/Math.cos(')
                .replace(/csc\(/gi, '1/Math.sin(')
                .replace(/sqrt\(/gi, 'Math.sqrt(')
                .replace(/log\(/gi, 'Math.log10(')
                .replace(/ln\(/gi, 'Math.log(')
                .replace(/exp\(/gi, 'Math.exp(')
                .replace(/abs\(/gi, 'Math.abs(')
                .replace(/pi/gi, 'Math.PI')
                .replace(/e/gi, 'Math.E');

            // 准备作用域
            const scope = { Math, ...variables };
            const argNames = Object.keys(scope);
            const argValues = Object.values(scope);

            // 使用 Function 构造函数
            const func = new Function(...argNames, `
            try {
              with(Math) {
                return eval(${JSON.stringify(cleanExpr)});
              }
            } catch(e) {
              return NaN;
            }
          `);

            const result = func(...argValues);
            return typeof result === 'number' ? result : NaN;
        } catch (error: any) {
            console.error('计算错误:', error.message, '表达式:', expr);
            return NaN;
        }
    }

    smartPlot(expression: string, options = {}) {
        try {
            const type = this.detectExpressionType(expression);
            console.log(`检测到表达式类型: ${type}`, expression);

            switch (type) {
                case 'explicit':
                    return this.plotExplicit(expression, options);
                case 'implicit':
                    return this.plotImplicit(expression, options);
                case 'parametric':
                    return this.plotParametric(expression, options);
                case 'polar':
                    return this.plotPolar(expression, options);
                case '3d':
                    return this.plot3D(expression, options);
                default:
                    return this.plotExplicit(expression, options);
            }
        } catch (error: any) {
            this.showError(`绘图错误: ${error.message}`);
        }
    }

    // 参数方程绘图
    plotParametric(expression: string, options: any = {}) {
        console.log('绘制参数方程:', expression);

        // 直接解析表达式
        let xExpr = '', yExpr = '';
        const expr = expression.trim();

        // 解析参数方程
        if (expr.includes('x=') && expr.includes('y=')) {
            // 格式: x=cos(t), y=sin(t)
            const parts: string[] = expr.split(',');
            parts.forEach(part => {
                if (part.includes('x=')) {
                    xExpr = part.replace('x=', '').trim();
                } else if (part.includes('y=')) {
                    yExpr = part.replace('y=', '').trim();
                }
            });
        } else if (expr.includes(',')) {
            // 格式: cos(t), sin(t)
            const parts: string[] = expr.split(',');
            if (parts.length >= 2) {
                xExpr = (parts[0] || '').trim();
                yExpr = (parts[1] || '').trim();
            }
        }

        if (!xExpr || !yExpr) {
            this.showError('无法解析参数方程');
            return;
        }

        console.log('解析结果:', { xExpr, yExpr });

        const tRange = options.tRange || [0, 2 * Math.PI];
        const samples = options.samples || 1000;

        const x = [], y = [];

        for (let i = 0; i < samples; i++) {
            const t = tRange[0] + (tRange[1] - tRange[0]) * i / (samples - 1);

            try {
                const xVal = this.evaluate(xExpr, { t });
                const yVal = this.evaluate(yExpr, { t });

                if (isFinite(xVal) && isFinite(yVal)) {
                    x.push(xVal);
                    y.push(yVal);
                }
            } catch (error: any) {
                console.warn('计算点失败:', error.message);
            }
        }

        console.log('生成点数量:', x.length);

        if (x.length === 0) {
            this.showError('未能生成任何有效点');
            return;
        }

        const trace = {
            x: x,
            y: y,
            type: 'scatter',
            mode: 'lines',
            line: {
                width: 3,
                color: options.color || '#FF6B6B'
            },
            name: expression
        };

        // 自动调整范围
        const xRange = this.autoRange(x);
        const yRange = this.autoRange(y);

        const layout = {
            title: `参数方程: ${expression}`,
            xaxis: {
                title: 'x',
                range: xRange,
                scaleanchor: 'y',
                scaleratio: 1
            },
            yaxis: {
                title: 'y',
                range: yRange,
                scaleanchor: 'x',
                scaleratio: 1
            },
            showlegend: true,
            width: 800,
            height: 600
        };

        Plotly.newPlot(this.container, [trace], layout);
    }

    // 极坐标绘图
    plotPolar(expression: string, options: any = {}) {
        console.log('绘制极坐标:', expression);

        // 解析极坐标表达式
        let rExpr = '';
        const expr = expression.trim();

        if (expr.includes('r=')) {
            // 格式: r=1+cos(theta)
            rExpr = expr.replace('r=', '').trim();
        } else {
            // 直接作为表达式
            rExpr = expr;
        }

        console.log('极坐标解析结果:', { rExpr });

        // 极坐标参数范围
        const thetaRange = options.thetaRange || [0, 2 * Math.PI];
        const samples = options.samples || 2000;

        const x = [], y = [];

        for (let i = 0; i < samples; i++) {
            const theta = thetaRange[0] + (thetaRange[1] - thetaRange[0]) * i / (samples - 1);

            try {
                // 计算 r 值
                const r = this.evaluate(rExpr, { theta });

                if (isFinite(r)) {
                    // 极坐标转直角坐标
                    const xVal = r * Math.cos(theta);
                    const yVal = r * Math.sin(theta);

                    x.push(xVal);
                    y.push(yVal);
                }
            } catch (error: any) {
                console.warn('计算极坐标点失败:', error.message);
            }
        }

        console.log('极坐标生成点数量:', x.length);

        if (x.length === 0) {
            this.showError('未能生成任何有效点');
            return;
        }

        const trace = {
            x: x,
            y: y,
            type: 'scatter',
            mode: 'lines',
            line: {
                width: 3,
                color: options.color || '#4ECDC4'
            },
            name: expression
        };

        const layout = {
            title: `极坐标: ${expression}`,
            xaxis: {
                title: 'x',
                scaleanchor: 'y',
                scaleratio: 1
            },
            yaxis: {
                title: 'y',
                scaleanchor: 'x',
                scaleratio: 1
            },
            showlegend: true,
            width: 800,
            height: 600
        };

        Plotly.newPlot(this.container, [trace], layout);
    }

    // 隐函数绘图
    plotImplicit(expression: string, options: any = {}) {
        const {
            xRange = [-5, 5],
            yRange = [-5, 5],
            resolution = 200,
            color = '#FF6B6B'
        } = options;

        // 清理表达式
        let cleanExpr: string = expression.trim() || '';
        if (cleanExpr.includes('=')) {
            const expr = cleanExpr.split('=') || [];
            cleanExpr = (expr[0] || '').trim();
        }

        // 生成网格数据
        const xValues = [];
        const yValues = [];

        // 生成 x 轴数据
        for (let i = 0; i < resolution; i++) {
            xValues[i] = xRange[0] + (xRange[1] - xRange[0]) * i / (resolution - 1);
        }

        // 生成 y 轴数据
        for (let i = 0; i < resolution; i++) {
            yValues[i] = yRange[0] + (yRange[1] - yRange[0]) * i / (resolution - 1);
        }

        // 计算 z 值矩阵
        const zValues: any[] = [];

        for (let i = 0; i < resolution; i++) {
            zValues[i] = new Array(resolution);
            for (let j = 0; j < resolution; j++) {
                const x = xValues[j];
                const y = yValues[i];

                try {
                    const val = this.evaluate(cleanExpr, { x, y });
                    zValues[i][j] = isFinite(val) ? val : NaN;
                } catch (e) {
                    zValues[i][j] = NaN;
                }
            }
        }

        const data = [{
            type: 'contour',
            x: xValues,
            y: yValues,
            z: zValues,
            contours: {
                coloring: 'lines',
                showlabels: false,
                start: 0,
                end: 0,
                size: 0
            },
            line: {
                width: 3,
                color: color
            },
            name: expression
        }];

        const layout = {
            title: `${expression} = 0`,
            xaxis: {
                title: 'x',
                scaleanchor: 'y',
                scaleratio: 1
            },
            yaxis: {
                title: 'y',
                scaleanchor: 'x',
                scaleratio: 1
            },
            showlegend: false,
            width: 600,
            height: 600
        };

        Plotly.newPlot(this.container, data, layout);
    }

    // 显函数绘图 - 支持tan(x)等奇点函数
    plotExplicit(expression: string, options: any = {}) {
        const xRange = options.xRange || [-10, 10];
        const yRange = options.yRange || [-10, 10];
        const samples = options.samples || 1000;

        const x = [], y = [];

        // 检测是否为tan函数
        const isTan = expression.toLowerCase().includes('tan(');

        for (let i = 0; i < samples; i++) {
            const xVal = xRange[0] + (xRange[1] - xRange[0]) * i / (samples - 1);

            // 对tan函数特殊处理
            if (isTan) {
                // 检查是否接近渐近线
                const pi = Math.PI;
                let isNearAsymptote = false;
                for (let k = -5; k <= 5; k++) {
                    const asymptote = pi / 2 + k * pi;
                    if (Math.abs(xVal - asymptote) < 0.01) {
                        isNearAsymptote = true;
                        break;
                    }
                }

                if (isNearAsymptote) {
                    x.push(xVal);
                    y.push(null);
                    continue;
                }
            }

            try {
                const yVal = this.evaluate(expression, { x: xVal });

                if (isFinite(yVal)) {
                    // 限制y值范围
                    if (Math.abs(yVal) > 10) {
                        x.push(xVal);
                        y.push(null); // 断开曲线
                    } else {
                        x.push(xVal);
                        y.push(yVal);
                    }
                } else {
                    x.push(xVal);
                    y.push(null);
                }
            } catch (e) {
                x.push(xVal);
                y.push(null);
            }
        }

        const trace = {
            x: x,
            y: y,
            type: 'scatter',
            mode: 'lines',
            line: {
                width: 3,
                color: options.color || '#340c66ff'
            },
            name: expression,
            connectgaps: false
        };

        const layout = {
            title: `y = ${expression}`,
            xaxis: {
                title: 'x',
                range: xRange
            },
            yaxis: {
                title: 'y',
                range: yRange
            },
            showlegend: true,
            width: 800,
            height: 600
        };

        Plotly.newPlot(this.container, [trace], layout);
    }

    // 3D函数绘图
    plot3D(expression: string, options: any = {}) {
        console.log('绘制3D曲面:', expression);

        const {
            xRange = [-5, 5],
            yRange = [-5, 5],
            resolution = 50
        } = options;

        // 清理表达式
        let cleanExpr: string = expression.trim() || '';
        if (cleanExpr.includes('z=')) {
            cleanExpr = cleanExpr.replace('z=', '').trim();
        }

        console.log('3D表达式:', cleanExpr);

        // 生成网格数据
        const x: any = [], y: any = [], z: any = [];

        // 生成 x 和 y 坐标
        for (let i = 0; i < resolution; i++) {
            x[i] = xRange[0] + (xRange[1] - xRange[0]) * i / (resolution - 1);
            y[i] = yRange[0] + (yRange[1] - yRange[0]) * i / (resolution - 1);
        }

        // 计算 z 值
        for (let i = 0; i < resolution; i++) {
            z[i] = new Array(resolution);
            for (let j = 0; j < resolution; j++) {
                try {
                    const zVal = this.evaluate(cleanExpr, {
                        x: x[i],
                        y: y[j]
                    });

                    z[i][j] = isFinite(zVal) ? zVal : 0;
                } catch (e: any) {
                    console.warn('计算3D点失败:', e.message);
                    z[i][j] = 0;
                }
            }
        }

        const data = [{
            type: 'surface',
            x: x,
            y: y,
            z: z,
            colorscale: 'Viridis',
            contours: {
                z: {
                    show: true,
                    usecolormap: true
                }
            }
        }];

        const layout = {
            title: `z = ${cleanExpr}`,
            scene: {
                xaxis: {
                    title: 'x',
                    range: xRange
                },
                yaxis: {
                    title: 'y',
                    range: yRange
                },
                zaxis: {
                    title: 'z'
                },
                camera: {
                    eye: { x: 1.5, y: 1.5, z: 1.5 }
                }
            },
            width: 800,
            height: 600
        };

        Plotly.newPlot(this.container, data, layout);
    }

    detectExpressionType(expression: string) {
        const expr = expression.toLowerCase().trim();

        console.log('检测表达式类型:', expr);

        // 清理空格
        const cleanExpr = expr.replace(/\s+/g, '');

        // 检查变量和特征
        const hasX = cleanExpr.includes('x');
        const hasY = cleanExpr.includes('y');
        const hasZ = cleanExpr.includes('z');
        const hasR = cleanExpr.includes('r');
        const hasTheta = cleanExpr.includes('θ') || cleanExpr.includes('theta');
        const hasT = cleanExpr.includes('t');
        const hasEquals = cleanExpr.includes('=');

        // 按优先级检测

        // 1. 3D检测（最高优先级）
        if (hasZ) {
            if (cleanExpr.startsWith('z=') && hasX && hasY) {
                return '3d'; // z=f(x,y)
            }
            if (hasX && hasY && hasZ) {
                return '3d'; // f(x,y,z)=0
            }
        }

        // 2. 参数方程检测
        // 格式: x=f(t), y=g(t)
        if ((cleanExpr.includes('x=') && cleanExpr.includes('y=') && hasT) ||
            (cleanExpr.includes('x:') && cleanExpr.includes('y:') && hasT)) {
            return 'parametric';
        }
        // 格式: (f(t), g(t))
        if (cleanExpr.startsWith('(') && cleanExpr.includes(',') &&
            cleanExpr.endsWith(')') && hasT) {
            return 'parametric';
        }

        // 3. 极坐标检测
        if (hasR) {
            if (cleanExpr.startsWith('r=') || cleanExpr.includes('r=')) {
                return 'polar';
            }
            if (hasTheta || (hasT && !hasX && !hasY)) {
                return 'polar';
            }
        }

        // 4. 隐函数检测
        if (hasX && hasY && !hasZ) {
            if (hasEquals) {
                // 检查是否是 y=f(x) 形式
                if (cleanExpr.startsWith('y=') ||
                    (cleanExpr.includes('y=') && !cleanExpr.includes('x='))) {
                    return 'explicit';
                }
                // 否则是隐函数
                return 'implicit';
            } else {
                // 没有等号，当作隐函数
                return 'implicit';
            }
        }

        // 5. 显函数检测
        if (hasX && !hasY && !hasZ) {
            return 'explicit';
        }

        // 6. 特殊情况：只有y=...
        if (cleanExpr.startsWith('y=')) {
            return 'explicit';
        }

        // 7. 默认
        return 'explicit';
    }

    autoRange(values: any[]) {
        if (!values || values.length === 0) return [-10, 10];

        const validValues = values.filter(v => isFinite(v) && v !== null);
        if (validValues.length === 0) return [-10, 10];

        const min = Math.min(...validValues);
        const max = Math.max(...validValues);

        const margin = Math.max((max - min) * 0.1, 0.1);
        return [min - margin, max + margin];
    }

    // // 快捷绘图方法
    // plotCircle(radius = 2, options: any = {}) {
    //     this.plotParametric(`${radius}*cos(t), ${radius}*sin(t)`, {
    //         ...options,
    //         color: options.color || '#FF6B6B'
    //     });
    // }

    // plotEllipse(a = 3, b = 2, options: any = {}) {
    //     this.plotParametric(`${a}*cos(t), ${b}*sin(t)`, {
    //         ...options,
    //         color: options.color || '#4ECDC4'
    //     });
    // }

    // plotCardioid(options: any = {}) {
    //     this.plotPolar('1 + cos(theta)', {
    //         ...options,
    //         color: options.color || '#FF4757',
    //         samples: 2000
    //     });
    // }

    // plotRose(k = 3, options: any = {}) {
    //     this.plotPolar(`cos(${k}*theta)`, {
    //         ...options,
    //         color: options.color || '#5352ed',
    //         thetaRange: [0, 2 * Math.PI]
    //     });
    // }

    // plotSpiral(options: any = {}) {
    //     this.plotParametric('t*cos(t), t*sin(t)', {
    //         tRange: [0, 8 * Math.PI],
    //         samples: 2000,
    //         ...options,
    //         color: options.color || '#2ed573'
    //     });
    // }

    // plotTanFunction(options: any = {}) {
    //     const xRange = options.xRange || [-2 * Math.PI, 2 * Math.PI];
    //     const yRange = options.yRange || [-5, 5];

    //     const x = [], y = [];
    //     const samples = 2000;

    //     for (let i = 0; i < samples; i++) {
    //         const xVal = xRange[0] + (xRange[1] - xRange[0]) * i / (samples - 1);

    //         // 检查是否接近渐近线
    //         const pi = Math.PI;
    //         let isNearAsymptote = false;
    //         for (let k = -3; k <= 3; k++) {
    //             if (Math.abs(xVal - (pi / 2 + k * pi)) < 0.01) {
    //                 isNearAsymptote = true;
    //                 break;
    //             }
    //         }

    //         if (isNearAsymptote) {
    //             x.push(xVal);
    //             y.push(null);
    //         } else {
    //             const yVal = Math.tan(xVal);
    //             x.push(xVal);
    //             if (Math.abs(yVal) > 10) {
    //                 y.push(null);
    //             } else {
    //                 y.push(yVal);
    //             }
    //         }
    //     }

    //     const trace = {
    //         x: x,
    //         y: y,
    //         type: 'scatter',
    //         mode: 'lines',
    //         line: {
    //             width: 3,
    //             color: '#FF6B6B'
    //         },
    //         name: 'y = tan(x)',
    //         connectgaps: false
    //     };

    //     const layout = {
    //         title: '正切函数 y = tan(x)',
    //         xaxis: {
    //             title: 'x (弧度)',
    //             range: xRange,
    //             tickvals: [-2 * Math.PI, -Math.PI, 0, Math.PI, 2 * Math.PI],
    //             ticktext: ['-2π', '-π', '0', 'π', '2π']
    //         },
    //         yaxis: {
    //             title: 'y',
    //             range: yRange
    //         },
    //         showlegend: true,
    //         width: 800,
    //         height: 600
    //     };

    //     Plotly.newPlot(this.container, [trace], layout);
    // }

    showError(message: string) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        } else {
            alert(message);
        }
    }
}