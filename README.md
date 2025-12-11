# 技术专家解答应用

基于Vue3+Vite+Node.js+Ollama构建的智能技术问答系统。

## 功能特点

- 🤖 基于Ollama大语言模型的智能问答
- 💬 现代化的聊天界面
- 🎨 优雅的UI设计和用户体验
- ⚡ 响应式设计，支持移动端
- 🔧 完善的错误处理机制

## 技术栈

### 前端
- Vue 3 + TypeScript
- Vite
- Axios
- CSS3 (渐变背景、动画效果)

### 后端
- Node.js + Express
- CORS支持
- Ollama API集成
- 环境变量配置

## 项目结构

```
Qutter/
├── frontend/          # Vue3前端应用
│   ├── src/
│   │   ├── components/
│   │   │   └── ChatInterface.vue    # 聊天界面组件
│   │   ├── services/
│   │   │   └── api.ts              # API服务封装
│   │   ├── utils/
│   │   │   └── errorHandler.ts     # 错误处理工具
│   │   ├── router/
│   │   │   └── index.ts            # 路由配置
│   │   └── App.vue                 # 主应用组件
│   └── package.json
├── backend/           # Node.js后端API
│   ├── server.js      # 主服务器文件
│   ├── .env           # 环境变量配置
│   └── package.json
└── README.md
```

## 快速开始

### 前置要求

1. **Ollama服务**: 确保已安装并运行Ollama服务
   ```bash
   # 下载并安装Ollama
   # https://ollama.ai/
   
   # 拉取模型（示例使用qwen2.5:7b）
   ollama pull qwen2.5:7b
   ```

2. **Node.js**: 版本 >= 16.0.0

### 安装与运行

1. **克隆项目并安装依赖**

   ```bash
   # 后端依赖
   cd backend
   npm install
   
   # 前端依赖
   cd ../frontend
   npm install
   ```

2. **配置环境变量**

   后端配置 (`backend/.env`):
   ```
   PORT=3001
   OLLAMA_API_URL=http://localhost:11434
   ```

   前端配置 (`frontend/.env`):
   ```
   VITE_API_BASE_URL=http://localhost:3001/api
   ```

3. **启动服务**

   ```bash
   # 启动后端服务 (端口3001)
   cd backend
   npm start
   
   # 启动前端服务 (端口5173)
   cd ../frontend
   npm run dev
   ```

4. **访问应用**

   打开浏览器访问: http://localhost:5173

## API接口

### 健康检查
```
GET /api/health
```

### 获取模型列表
```
GET /api/models
```

### 技术问答
```
POST /api/ask
Content-Type: application/json

{
  "question": "你的技术问题",
  "model": "qwen2.5:7b"  // 可选，默认使用qwen2.5:7b
}
```

## 使用说明

1. 启动应用后，在聊天界面输入您的技术问题
2. 系统会调用Ollama模型生成专业的技术解答
3. 支持多轮对话和上下文理解
4. 提供友好的错误提示和加载状态

## 自定义配置

### 更换Ollama模型

1. 在`backend/.env`中修改默认模型
2. 或在前端调用API时指定模型名称

### 调整UI样式

修改`frontend/src/components/ChatInterface.vue`中的样式配置

### 扩展功能

- 添加对话历史存储
- 集成更多Ollama模型
- 添加文件上传功能
- 实现用户认证系统

## 故障排除

1. **Ollama连接失败**: 检查Ollama服务是否正常运行
2. **模型不存在**: 使用`ollama pull`下载所需模型
3. **端口冲突**: 修改`.env`文件中的端口配置
4. **网络错误**: 检查防火墙和网络设置

## 开发说明

### 添加新功能

1. 后端: 在`backend/server.js`中添加新的路由
2. 前端: 在`frontend/src/services/api.ts`中添加对应的API调用
3. UI: 在`frontend/src/components/`中创建新组件

### 调试

- 前端: 使用浏览器开发者工具
- 后端: 查看控制台日志输出

## 许可证

MIT License