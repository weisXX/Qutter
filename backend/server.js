const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const { testConnection, initDatabase } = require('./config/database');
const sessionService = require('./services/sessionService');
const { upload, FileProcessor } = require('./services/fileProcessor');
const { PromptManager } = require('./promptManager');
const { LangchainService } = require('./services/langchainService');
const functionPlotService = require('./services/functionPlotService');
// const smartFunctionPlotService = require('./services/smartFunctionPlotService');
const frontendFunctionPlotService = require('./services/frontendFunctionPlotService');
// 初始化提示词管理器
const promptManager = new PromptManager();
promptManager.loadTemplate();

// 初始化Langchain服务
const langchainService = new LangchainService();

// 活动请求管理 - 用于超时和手动停止
const activeRequests = new Map();
const REQUEST_TIMEOUT = 600000; // 10分钟超时

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
const DEFAULT_MODEL = process.env.DEFAULT_MODEL;

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
    const { question, model = DEFAULT_MODEL, sessionId } = req.body;
    
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

//     const prompt = `你是一位资深的技术专家，请详细、准确地回答提问到的技术问题。回答要专业、实用，并包含相关的代码示例或最佳实践建议。${contextPrompt}
// 当前问题：${question}

// 请用中文回答。`;

    const prompt = `你是一位资深的技术专家，请详细、准确地回答提问到的技术问题，回答要专业、实用，
                  如果回答内容涉及化学方程式、数学公式、物理公式等，请用标准的 LaTeX 数学公式格式输出，使用 $...$ 或 $$...$$ 包裹，
                  如果问题要求绘制图表或图像，请用标准的Mermaid语法。${contextPrompt}
                  当前问题：${question}
                  请用中文回答。`;

// “请用标准的 LaTeX 数学公式格式输出化学方程式，使用 $...$ 或 $$...$$ 包裹。

    let answer;
    if (langchainService.isUsingLangchain()) {
      // 使用LangChain API
      answer = await langchainService.answerQuestion(question, contextPrompt, model);
    } else {
      // 使用Ollama API
      const response = await axios.post(`${OLLAMA_API_URL}/api/generate`, {
        model: model,
        prompt: prompt,
        stream: false
      });
      answer = response.data.response;
    }

    // 保存用户问题和助手回答到数据库
    if (sessionId) {
      try {
        await sessionService.addMessage(sessionId, 'user', question);
        await sessionService.addMessage(sessionId, 'assistant', answer);
      } catch (error) {
        console.error('保存消息失败:', error);
      }
    }

    res.json({
      question: question,
      answer: answer,
      model: model,
      sessionId: sessionId
    });

  } catch (error) {
    console.error('处理问答请求失败:', error);
    
    // 检查是否是连接错误
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      res.status(503).json({ 
        error: '无法连接到Ollama服务，请确保Ollama服务已启动并正在运行',
        code: 'OLLAMA_CONNECTION_ERROR'
      });
    } else if (error.response) {
      // Ollama服务返回了错误响应
      res.status(error.response.status || 500).json({ 
        error: `Ollama服务错误: ${error.response.data?.error || error.message}`,
        code: 'OLLAMA_API_ERROR'
      });
    } else {
      // 其他错误
      res.status(500).json({ error: '处理请求时发生错误: ' + error.message });
    }
  }
});

// 流式技术问答接口
app.post('/api/ask-stream', async (req, res) => {
  try {
    const { question, model = DEFAULT_MODEL, sessionId, requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` } = req.body;
    
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
    const prompt = promptManager.generatePrompt(question);

    // 设置SSE响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // 创建请求对象并添加到活动请求列表
    const requestObj = { 
      stopped: false, 
      response: res,
      timeoutId: null
    };
    activeRequests.set(requestId, requestObj);

    // 设置超时定时器
    requestObj.timeoutId = setTimeout(() => {
      if (!requestObj.stopped && activeRequests.has(requestId)) {
        requestObj.stopped = true;
        res.write('data: [TIMEOUT]\n\n');
        res.end();
        activeRequests.delete(requestId);
        console.log(`请求 ${requestId} 超时结束`);
      }
    }, REQUEST_TIMEOUT);

    // 发送请求ID给客户端，用于停止请求
    res.write(`data: ${JSON.stringify({ requestId })}\n\n`);
    console.log('prompt:', langchainService.isUsingLangchain());
    if (langchainService.isUsingLangchain()) {
      console.log('使用LangChain流式API');
      // 使用LangChain流式API
      try {
        const { SystemMessage, HumanMessage } = require('@langchain/core/messages');
        const messages = [
          new SystemMessage("你是一位资深的技术专家，请详细、准确地回答提问到的技术问题，回答要专业、实用，如果回答内容涉及化学方程式、数学公式、物理公式等，请用标准的 LaTeX 数学公式格式输出，使用 $...$ 或 $...$ 包裹，如果问题要求绘制图表或图像，请用标准的Mermaid语法。请用中文回答。"),
          new HumanMessage(prompt)
        ];

        const chatInstance = langchainService.getChatInstance();
        const stream = await chatInstance.stream(messages);

        let fullAnswer = '';
        for await (const chunk of stream) {
          // 检查请求是否被停止
          if (requestObj.stopped) {
            console.log(`请求 ${requestId} 被手动停止`);
            break;
          }
          
          const content = chunk.content;
          if (content) {
            fullAnswer += content;
            // 发送SSE格式的数据
            res.write(`data: ${JSON.stringify({ content: content })}\n\n`);
          }
        }

        // 只有在未被停止的情况下才保存消息和发送完成信号
        if (!requestObj.stopped) {
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
        }
      } catch (streamError) {
        console.error('LangChain流式请求失败:', streamError);
        res.write(`data: ${JSON.stringify({ error: 'LangChain流式请求失败' })}\n\n`);
        res.end();
      } finally {
        // 清理活动请求
        if (activeRequests.has(requestId)) {
          if (requestObj.timeoutId) {
            clearTimeout(requestObj.timeoutId);
          }
          activeRequests.delete(requestId);
        }
      }
    } else {
      // 使用Ollama流式API
      try {
        const response = await axios.post(`${OLLAMA_API_URL}/api/generate`, {
          model: model,
          prompt: prompt,
          stream: true
        }, {
          responseType: 'stream'
        });

        response.data.on('data', (chunk) => {
          // 检查请求是否被停止
          if (requestObj.stopped) {
            console.log(`请求 ${requestId} 被手动停止`);
            return;
          }
          
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
                // 只有在未被停止的情况下才保存消息和发送完成信号
                if (!requestObj.stopped) {
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
                }
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
          
          // 清理活动请求
          if (activeRequests.has(requestId)) {
            if (requestObj.timeoutId) {
              clearTimeout(requestObj.timeoutId);
            }
            activeRequests.delete(requestId);
          }
        });

        response.data.on('end', () => {
          if (!requestObj.stopped) {
            res.write('data: [DONE]\n\n');
            res.end();
          }
          
          // 清理活动请求
          if (activeRequests.has(requestId)) {
            if (requestObj.timeoutId) {
              clearTimeout(requestObj.timeoutId);
            }
            activeRequests.delete(requestId);
          }
        });

      } catch (streamError) {
        console.error('创建流式请求失败:', streamError);
        
        // 检查是否是连接错误
        let errorMessage = '创建流式请求失败';
        let errorCode = 'STREAM_REQUEST_ERROR';
        
        if (streamError.code === 'ECONNREFUSED' || streamError.code === 'ENOTFOUND') {
          errorMessage = '无法连接到Ollama服务，请确保Ollama服务已启动并正在运行';
          errorCode = 'OLLAMA_CONNECTION_ERROR';
        } else if (streamError.response) {
          // Ollama服务返回了错误响应
          errorMessage = `Ollama服务错误: ${streamError.response.data?.error || streamError.message}`;
          errorCode = 'OLLAMA_API_ERROR';
        }
        
        res.write(`data: ${JSON.stringify({ error: errorMessage, code: errorCode })}\n\n`);
        res.end();
        
        // 清理活动请求
        if (activeRequests.has(requestId)) {
          if (requestObj.timeoutId) {
            clearTimeout(requestObj.timeoutId);
          }
          activeRequests.delete(requestId);
        }
      }
    }

  } catch (error) {
    console.error('处理流式问答请求失败:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: '处理请求时发生错误' });
    }
  }
});

// 文件上传和处理API
app.post('/api/upload', upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const results = await FileProcessor.processFiles(req.files);
    
    // 过滤出成功处理的文件
    const successfulFiles = results.filter(result => result.success);
    const failedFiles = results.filter(result => !result.success);
    
    if (failedFiles.length > 0) {
      console.error('部分文件处理失败:', failedFiles);
    }
    
    res.json({
      success: true,
      files: results,
      summary: {
        total: results.length,
        successful: successfulFiles.length,
        failed: failedFiles.length
      }
    });
  } catch (error) {
    console.error('文件上传处理失败:', error);
    res.status(500).json({ error: '文件处理失败: ' + error.message });
  }
});

// 带文件的流式问答API
app.post('/api/ask-stream-with-files', upload.array('files'), async (req, res) => {
  try {
    const { question, model = DEFAULT_MODEL, sessionId, requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: '请提供问题' });
    }

  let fullAnswer = '';
  let fileContents = '';

  // 处理上传的文件
  if (req.files && req.files.length > 0) {
    try {
      const results = await FileProcessor.processFiles(req.files);
      
      // 提取成功处理的文件内容
      const successfulFiles = results.filter(result => result.success);
      
      if (successfulFiles.length > 0) {
        fileContents = '\n\n--- 附件内容 ---\n';
        successfulFiles.forEach((result, index) => {
          fileContents += `\n附件${index + 1} (${result.fileName}):\n${result.text}\n`;
        });
        fileContents += '--- 附件内容结束 ---\n\n';
      }
      
      // 记录处理失败的文件
      const failedFiles = results.filter(result => !result.success);
      if (failedFiles.length > 0) {
        console.error('部分文件处理失败:', failedFiles);
      }
    } catch (error) {
      console.error('文件处理失败:', error);
      // 文件处理失败不影响问答流程，只是不包含文件内容
    }
  }

  // 获取会话上下文
  let contextPrompt = '';
  if (sessionId) {
    try {
      const messages = await sessionService.getSessionMessages(sessionId);
      if (messages && messages.length > 0) {
        contextPrompt = '\n历史对话上下文:\n';
        messages.slice(-6).forEach(msg => {
          const role = msg.message_type === 'user' ? '用户' : '助手';
          contextPrompt += `${role}: ${msg.content}\n`;
        });
        contextPrompt += '\n';
      }
    } catch (error) {
      console.error('获取会话上下文失败:', error);
    }
  }

  const enhancedQuestion = question + fileContents;
  const prompt = `你是一位资深的技术专家，请详细、准确地回答以下技术问题。回答要专业、实用，并包含相关的代码示例或最佳实践建议。${contextPrompt}
当前问题：${enhancedQuestion}

请用中文回答。`;

  // 设置SSE响应头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // 创建请求对象并添加到活动请求列表
  const requestObj = { 
    stopped: false, 
    response: res,
    timeoutId: null
  };
  activeRequests.set(requestId, requestObj);

  // 设置超时定时器
  requestObj.timeoutId = setTimeout(() => {
    if (!requestObj.stopped && activeRequests.has(requestId)) {
      requestObj.stopped = true;
      res.write('data: [TIMEOUT]\n\n');
      res.end();
      activeRequests.delete(requestId);
      console.log(`请求 ${requestId} 超时结束`);
    }
  }, REQUEST_TIMEOUT);

  // 发送请求ID给客户端，用于停止请求
  res.write(`data: ${JSON.stringify({ requestId })}\n\n`);

  if (langchainService.isUsingLangchain()) {
    // 使用LangChain流式API
    try {
      const { SystemMessage, HumanMessage } = require('@langchain/core/messages');
      const messages = [
        new SystemMessage("你是一位资深的技术专家，请详细、准确地回答提问到的技术问题，回答要专业、实用，如果回答内容涉及化学方程式、数学公式、物理公式等，请用标准的 LaTeX 数学公式格式输出，使用 $...$ 或 $...$ 包裹，如果问题要求绘制图表或图像，请用标准的Mermaid语法。请用中文回答。"),
        new HumanMessage(prompt)
      ];

      const chatInstance = langchainService.getChatInstance();
      const stream = await chatInstance.stream(messages);

      let fullAnswer = '';
      for await (const chunk of stream) {
        // 检查请求是否被停止
        if (requestObj.stopped) {
          console.log(`请求 ${requestId} 被手动停止`);
          break;
        }
        
        const content = chunk.content;
        if (content) {
          fullAnswer += content;
          // 发送SSE格式的数据
          res.write(`data: ${JSON.stringify({ content: content })}

`);
        }
      }

      // 只有在未被停止的情况下才保存消息和发送完成信号
      if (!requestObj.stopped) {
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
      }
    } catch (streamError) {
      console.error('LangChain流式请求失败:', streamError);
      res.write(`data: ${JSON.stringify({ error: 'LangChain流式请求失败' })}

`);
      res.end();
    } finally {
      // 清理活动请求
      if (activeRequests.has(requestId)) {
        if (requestObj.timeoutId) {
          clearTimeout(requestObj.timeoutId);
        }
        activeRequests.delete(requestId);
      }
    }
  } else {
    try {
      const response = await axios.post(`${OLLAMA_API_URL}/api/generate`, {
        model: model,
        prompt: prompt,
        stream: true
      }, {
        responseType: 'stream'
      });

      response.data.on('data', (chunk) => {
        // 检查请求是否被停止
        if (requestObj.stopped) {
          console.log(`请求 ${requestId} 被手动停止`);
          return;
        }
        
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
              // 只有在未被停止的情况下才保存消息和发送完成信号
              if (!requestObj.stopped) {
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
              }
            }
          } catch (parseError) {
            console.error('解析响应数据失败:', parseError);
          }
        }
      });

      response.data.on('error', (streamError) => {
      console.error('流式响应错误:', streamError);
      res.write(`data: ${JSON.stringify({ error: '流式响应错误' })}\n\n`);
      res.end();
      
      // 清理活动请求
      if (activeRequests.has(requestId)) {
        if (requestObj.timeoutId) {
          clearTimeout(requestObj.timeoutId);
        }
        activeRequests.delete(requestId);
      }
    });

    response.data.on('end', () => {
      if (!requestObj.stopped) {
        res.write('data: [DONE]\n\n');
        res.end();
      }
      
      // 清理活动请求
      if (activeRequests.has(requestId)) {
        if (requestObj.timeoutId) {
          clearTimeout(requestObj.timeoutId);
        }
        activeRequests.delete(requestId);
      }
    });

    } catch (streamError) {
      console.error('创建流式请求失败:', streamError);
      
      // 检查是否是连接错误
      let errorMessage = '创建流式请求失败';
      let errorCode = 'STREAM_REQUEST_ERROR';
      
      if (streamError.code === 'ECONNREFUSED' || streamError.code === 'ENOTFOUND') {
        errorMessage = '无法连接到Ollama服务，请确保Ollama服务已启动并正在运行';
        errorCode = 'OLLAMA_CONNECTION_ERROR';
      } else if (streamError.response) {
        // Ollama服务返回了错误响应
        errorMessage = `Ollama服务错误: ${streamError.response.data?.error || streamError.message}`;
        errorCode = 'OLLAMA_API_ERROR';
      }
      
      res.write(`data: ${JSON.stringify({ error: errorMessage, code: errorCode })}\n\n`);
      res.end();
      
      // 清理活动请求
      if (activeRequests.has(requestId)) {
        if (requestObj.timeoutId) {
          clearTimeout(requestObj.timeoutId);
        }
        activeRequests.delete(requestId);
      }
    }
  }

  } catch (error) {
    console.error('处理流式问答请求失败:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: '处理请求时发生错误' });
    }
  }
});

// API提供商管理端点

// 获取当前API提供商配置信息
app.get('/api/api-provider/config', async (req, res) => {
  try {
    const configInfo = langchainService.getConfigInfo();
    res.json(configInfo);
  } catch (error) {
    console.error('获取API提供商配置失败:', error);
    res.status(500).json({ error: '获取配置信息失败' });
  }
});

// 切换API提供商
app.post('/api/api-provider/switch', async (req, res) => {
  try {
    const { provider } = req.body;
    
    if (!provider) {
      return res.status(400).json({ error: '请提供API提供商名称' });
    }

    const success = langchainService.switchProvider(provider);
    console.log('切换到:', langchainService);
    if (success) {
      res.json({ 
        success: true, 
        message: `已切换到${provider} API`,
        config: langchainService.getConfigInfo()
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: `切换到${provider} API失败，请检查配置` 
      });
    }
  } catch (error) {
    console.error('切换API提供商失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取可用的API提供商列表
app.get('/api/api-provider/available', async (req, res) => {
  try {
    const availableProviders = langchainService.getAvailableProviders();
    res.json({ providers: availableProviders });
  } catch (error) {
    console.error('获取可用API提供商列表失败:', error);
    res.status(500).json({ error: '获取提供商列表失败' });
  }
});

// 函数图像生成API
app.use('/api/function-plot', functionPlotService);
// app.use('/api/smart-function-plot', smartFunctionPlotService);

// 前端函数绘图API
app.post('/api/frontend-function-plot', async (req, res) => {
  try {
    const { input, useLLM } = req.body;
    // const input = expression;
    console.log('前端函数绘图请求:', req.body);
    if (!input) {
      return res.status(400).json({
        success: false,
        error: '缺少输入参数',
        suggestion: '请提供要绘制的函数或描述'
      });
    }
    
    const serviceOptions = { useLLM: useLLM || false };
    const result = await frontendFunctionPlotService.frontendFunctionPlot(input, serviceOptions);
    console.log('前端函数绘图结果:', result);
    res.json(result);
  } catch (error) {
    console.error('前端函数绘图错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error.message
    });
  }
});

// 停止流式请求的API端点
app.post('/api/stop-request', (req, res) => {
  const { requestId } = req.body;
  
  if (!requestId) {
    return res.status(400).json({ error: '请提供请求ID' });
  }
  
  const request = activeRequests.get(requestId);
  if (request) {
    // 设置停止标志
    request.stopped = true;
    
    // 如果有超时定时器，清除它
    if (request.timeoutId) {
      clearTimeout(request.timeoutId);
    }
    
    // 结束响应
    if (request.response && !request.response.headersSent) {
      request.response.write('data: [STOPPED]\n\n');
      request.response.end();
    }
    
    // 从活动请求中移除
    activeRequests.delete(requestId);
    
    res.json({ success: true, message: '请求已停止' });
  } else {
    res.status(404).json({ error: '请求不存在或已结束' });
  }
});

// 启动服务器
app.listen(PORT, async () => {
  console.log(`技术专家解答API服务运行在端口 ${PORT}`);
  console.log(`Ollama API地址: ${OLLAMA_API_URL}`);
  
  // 初始化数据库
  await initializeApp();
});