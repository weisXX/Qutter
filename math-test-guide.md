# 数学公式测试指南

## 测试内容

请在 Qutter 应用中输入以下数学公式来测试渲染功能：

### 1. 行内公式测试
```
这是一个行内公式测试：$\frac{d}{dx}\Bigl(\int_{a}^{x} f(t)\,dt\Bigr)=f(x)$
```

### 2. 块级公式测试
```
这是一个块级公式测试：

$$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$
```

### 3. 复杂公式测试
```
巴塞尔问题：

$$\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}$$
```

### 4. 矩阵测试
```
矩阵公式：

$$\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
$$
```

### 5. 希腊字母测试
```
希腊字母：$\alpha, \beta, \gamma, \delta, \epsilon, \theta, \lambda, \mu, \pi, \sigma, \phi, \omega$
```

## 预期结果

- 行内公式应该与文本在同一行显示
- 块级公式应该居中显示并占据独立行
- 所有数学符号应该正确渲染
- 公式应该有正确的字体和样式

## 故障排除

如果公式不显示：

1. 确保选择了 "markdown-it" 渲染器
2. 检查浏览器控制台是否有错误
3. 确保使用了正确的 LaTeX 语法
4. 行内公式使用 `$...$`，块级公式使用 `$$...$$`

## 依赖检查

确保以下依赖已安装：
- markdown-it-texmath
- katex
- katex/dist/katex.min.css