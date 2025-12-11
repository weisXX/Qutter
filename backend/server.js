const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// Ollama API配置
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: '技术专家解答API服务运行正常' });
});

// 获取可用模型列表
app.get('/api/models', async (req, res) => {
  try {
    const response = await axios.get(`${OLLAMA_API_URL}/api/tags`);
    res.json(response.data);
  } catch (error) {
    console.error('获取模型列表失败:', error.message);
    res.status(500).json({ error: '无法获取模型列表' });
  }
});

// 技术问答接口
app.post('/api/ask', async (req, res) => {
  try {
    const { question, model = 'gpt-oss:120b-cloud' } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: '请提供问题' });
    }

    const prompt = `你是一位资深的技术专家，请详细、准确地回答以下技术问题。回答要专业、实用，并包含相关的代码示例或最佳实践建议。

问题：${question}

请用中文回答。`;

    const response = await axios.post(`${OLLAMA_API_URL}/api/generate`, {
      model: model,
      prompt: prompt,
      stream: false
    });

    res.json({
      question: question,
      answer: response.data.response,
      model: model
    });

  } catch (error) {
    console.error('处理问答请求失败:', error.message);
    res.status(500).json({ error: '处理请求时发生错误' });
  }
});

// 流式技术问答接口
app.post('/api/ask-stream', async (req, res) => {
  try {
    const { question, model = 'gpt-oss:120b-cloud' } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: '请提供问题' });
    }

    const prompt = `你是一位资深的技术专家，请详细、准确地回答以下技术问题。回答要专业、实用，并包含相关的代码示例或最佳实践建议。

问题：${question}

请用中文回答。`;

    // 设置SSE响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    try {
      const response = await axios.post(`${OLLAMA_API_URL}/api/generate`, {
        model: model,
        prompt: prompt,
        stream: true
      }, {
        responseType: 'stream'
      });

      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              // 发送SSE格式的数据
              res.write(`data: ${JSON.stringify({ content: data.response })}\n\n`);
            }
            
            // 如果响应完成，发送结束信号
            if (data.done) {
              res.write('data: [DONE]\n\n');
              res.end();
              return;
            }
          } catch (e) {
            console.error('解析流数据失败:', e);
          }
        }
      });

      response.data.on('error', (error) => {
        console.error('流响应错误:', error);
        res.write(`data: ${JSON.stringify({ error: '流式响应发生错误' })}\n\n`);
        res.end();
      });

      response.data.on('end', () => {
        res.write('data: [DONE]\n\n');
        res.end();
      });

    } catch (streamError) {
      console.error('创建流式请求失败:', streamError);
      res.write(`data: ${JSON.stringify({ error: '创建流式请求失败' })}\n\n`);
      res.end();
    }

  } catch (error) {
    console.error('处理流式问答请求失败:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: '处理请求时发生错误' });
    }
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`技术专家解答API服务运行在端口 ${PORT}`);
  console.log(`Ollama API地址: ${OLLAMA_API_URL}`);
});