const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const { testConnection, initDatabase } = require('./config/database');
const sessionService = require('./services/sessionService');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 初始化数据库
async function initializeApp() {
  const connected = await testConnection();
  if (connected) {
    await initDatabase();
  }
}

// Ollama API配置
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: '技术专家解答API服务运行正常' });
});

// 会话管理API
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await sessionService.getAllSessions();
    res.json(sessions);
  } catch (error) {
    console.error('获取会话列表失败:', error);
    res.status(500).json({ error: '无法获取会话列表' });
  }
});

app.post('/api/sessions', async (req, res) => {
  try {
    const { title } = req.body;
    const session = await sessionService.createSession(title);
    res.json(session);
  } catch (error) {
    console.error('创建会话失败:', error);
    res.status(500).json({ error: '无法创建会话' });
  }
});

app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await sessionService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }
    res.json(session);
  } catch (error) {
    console.error('获取会话失败:', error);
    res.status(500).json({ error: '无法获取会话' });
  }
});

app.put('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title } = req.body;
    const success = await sessionService.updateSessionTitle(sessionId, title);
    if (!success) {
      return res.status(404).json({ error: '会话不存在' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('更新会话失败:', error);
    res.status(500).json({ error: '无法更新会话' });
  }
});

app.delete('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const success = await sessionService.deleteSession(sessionId);
    if (!success) {
      return res.status(404).json({ error: '会话不存在' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('删除会话失败:', error);
    res.status(500).json({ error: '无法删除会话' });
  }
});

app.get('/api/sessions/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const messages = await sessionService.getSessionMessages(sessionId);
    res.json(messages);
  } catch (error) {
    console.error('获取会话消息失败:', error);
    res.status(500).json({ error: '无法获取会话消息' });
  }
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
    const { question, model = 'gpt-oss:120b-cloud', sessionId } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: '请提供问题' });
    }

    let contextPrompt = '';
    
    // 如果提供了sessionId，获取会话上下文
    if (sessionId) {
      try {
        const context = await sessionService.getSessionContext(sessionId, 10);
        if (context.length > 0) {
          contextPrompt = '\n以下是之前的对话历史，请参考这些历史来回答当前的问题：\n';
          context.forEach(msg => {
            const role = msg.message_type === 'user' ? '用户' : '助手';
            contextPrompt += `${role}: ${msg.content}\n`;
          });
          contextPrompt += '\n';
        }
      } catch (error) {
        console.error('获取会话上下文失败:', error);
      }
    }

    const prompt = `你是一位资深的技术专家，请详细、准确地回答以下技术问题。回答要专业、实用，并包含相关的代码示例或最佳实践建议。${contextPrompt}
当前问题：${question}

请用中文回答。`;

    const response = await axios.post(`${OLLAMA_API_URL}/api/generate`, {
      model: model,
      prompt: prompt,
      stream: false
    });

    // 保存用户问题和助手回答到数据库
    if (sessionId) {
      try {
        await sessionService.addMessage(sessionId, 'user', question);
        await sessionService.addMessage(sessionId, 'assistant', response.data.response);
      } catch (error) {
        console.error('保存消息失败:', error);
      }
    }

    res.json({
      question: question,
      answer: response.data.response,
      model: model,
      sessionId: sessionId
    });

  } catch (error) {
    console.error('处理问答请求失败:', error.message);
    res.status(500).json({ error: '处理请求时发生错误' });
  }
});

// 流式技术问答接口
app.post('/api/ask-stream', async (req, res) => {
  try {
    const { question, model = 'gpt-oss:120b-cloud', sessionId } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: '请提供问题' });
    }

    let contextPrompt = '';
    let fullAnswer = '';
    
    // 如果提供了sessionId，获取会话上下文
    if (sessionId) {
      try {
        const context = await sessionService.getSessionContext(sessionId, 10);
        if (context.length > 0) {
          contextPrompt = '\n以下是之前的对话历史，请参考这些历史来回答当前的问题：\n';
          context.forEach(msg => {
            const role = msg.message_type === 'user' ? '用户' : '助手';
            contextPrompt += `${role}: ${msg.content}\n`;
          });
          contextPrompt += '\n';
        }
      } catch (error) {
        console.error('获取会话上下文失败:', error);
      }
    }

    const prompt = `你是一位资深的技术专家，请详细、准确地回答以下技术问题。回答要专业、实用，并包含相关的代码示例或最佳实践建议。${contextPrompt}
当前问题：${question}

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
              fullAnswer += data.response;
              // 发送SSE格式的数据
              res.write(`data: ${JSON.stringify({ content: data.response })}\n\n`);
            }
            
            // 如果响应完成，发送结束信号并保存消息
            if (data.done) {
              // 保存用户问题和助手回答到数据库
              if (sessionId) {
                sessionService.addMessage(sessionId, 'user', question).catch(err => {
                  console.error('保存用户消息失败:', err);
                });
                sessionService.addMessage(sessionId, 'assistant', fullAnswer).catch(err => {
                  console.error('保存助手消息失败:', err);
                });
              }
              
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
app.listen(PORT, async () => {
  console.log(`技术专家解答API服务运行在端口 ${PORT}`);
  console.log(`Ollama API地址: ${OLLAMA_API_URL}`);
  
  // 初始化数据库
  await initializeApp();
});