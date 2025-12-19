const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');

// 从环境变量获取API配置
const {
  USE_LANGCHAIN_API = 'false',
  API_PROVIDER = 'openai',  // 默认API提供商
  OLLAMA_API_URL = 'http://localhost:11434',
  DEFAULT_MODEL = 'llama3.1',
  // OpenAI配置
  OPENAI_API_MODEL = 'gpt-4o',
  OPENAI_API_BASE_URL = 'https://api.openai.com/v1',
  OPENAI_API_KEY = '',
  // DeepSeek配置
  DEEPSEEK_API_MODEL = 'deepseek-chat',
  DEEPSEEK_API_BASE_URL = 'https://api.deepseek.com',
  DEEPSEEK_API_KEY = '',
  // Qwen配置
  QWEN_API_MODEL = 'qwen-max',
  QWEN_API_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  QWEN_API_KEY = '',
  // GLM配置
  GLM_API_MODEL = 'glm-4-plus',
  GLM_API_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/',
  GLM_API_KEY = ''
} = process.env;
console.log('USE_LANGCHAIN_API:', USE_LANGCHAIN_API, API_PROVIDER);
class LangchainService {
  constructor() {
    console.log('USE_LANGCHAIN_API:', USE_LANGCHAIN_API.toLowerCase(), typeof USE_LANGCHAIN_API.toLowerCase());
    this.useLangchain = USE_LANGCHAIN_API.toLowerCase() === 'true';
    this.apiProvider = API_PROVIDER.toLowerCase();
    this.ollamaApiUrl = OLLAMA_API_URL;
    this.defaultModel = DEFAULT_MODEL;
    
    // 初始化对应API提供商的客户端
    if (this.useLangchain) {
      this.chat = this.initializeChatClient();
    }
  }

  // 根据API提供商初始化客户端
  initializeChatClient() {
    switch (this.apiProvider) {
      case 'openai':
        if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-openai-api-key-here') {
          console.warn('OpenAI API密钥未配置');
          return null;
        }
        return new ChatOpenAI({
          modelName: OPENAI_API_MODEL,
          openAIApiKey: OPENAI_API_KEY,
          configuration: {
            baseURL: OPENAI_API_BASE_URL
          }
        });

      case 'deepseek':
        if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'your-deepseek-api-key-here') {
          console.warn('DeepSeek API密钥未配置');
          return null;
        }
        return new ChatOpenAI({
          modelName: DEEPSEEK_API_MODEL,
          openAIApiKey: DEEPSEEK_API_KEY,
          configuration: {
            baseURL: DEEPSEEK_API_BASE_URL
          }
        });

      case 'qwen':
        if (!QWEN_API_KEY || QWEN_API_KEY === 'your-qwen-api-key-here') {
          console.warn('Qwen API密钥未配置');
          return null;
        }
        return new ChatOpenAI({
          modelName: QWEN_API_MODEL,
          openAIApiKey: QWEN_API_KEY,
          configuration: {
            baseURL: QWEN_API_BASE_URL
          }
        });

      case 'glm':
        if (!GLM_API_KEY || GLM_API_KEY === 'your-glm-api-key-here') {
          console.warn('GLM API密钥未配置');
          return null;
        }
        return new ChatOpenAI({
          modelName: GLM_API_MODEL,
          openAIApiKey: GLM_API_KEY,
          configuration: {
            baseURL: GLM_API_BASE_URL
          }
        });

      default:
        console.warn(`未知的API提供商: ${this.apiProvider}`);
        return null;
    }
  }

  // 检查是否使用LangChain API模式
  isUsingLangchain() {
    return this.useLangchain && this.chat !== null;
  }

  // 验证API提供商的密钥是否已配置
  isProviderKeyConfigured(provider = null) {
    const checkProvider = provider || this.apiProvider;
    switch (checkProvider) {
      case 'openai':
        return OPENAI_API_KEY && OPENAI_API_KEY !== 'your-openai-api-key-here';
      case 'deepseek':
        return DEEPSEEK_API_KEY && DEEPSEEK_API_KEY !== 'your-deepseek-api-key-here';
      case 'qwen':
        return QWEN_API_KEY && QWEN_API_KEY !== 'your-qwen-api-key-here';
      case 'glm':
        return GLM_API_KEY && GLM_API_KEY !== 'your-glm-api-key-here';
      default:
        return false;
    }
  }

  // 获取可用的API提供商列表
  getAvailableProviders() {
    const providers = [];
    if (this.isProviderKeyConfigured('openai')) providers.push('openai');
    if (this.isProviderKeyConfigured('deepseek')) providers.push('deepseek');
    if (this.isProviderKeyConfigured('qwen')) providers.push('qwen');
    if (this.isProviderKeyConfigured('glm')) providers.push('glm');
    return providers;
  }

  // 切换API提供商
  switchProvider(newProvider) {
    if (!['openai', 'deepseek', 'qwen', 'glm'].includes(newProvider)) {
      throw new Error(`不支持的API提供商: ${newProvider}`);
    }

    this.apiProvider = newProvider.toLowerCase();
    this.chat = this.initializeChatClient();
    return this.isUsingLangchain();
  }

  // 通过LangChain调用API
  async callLangchainAPI(prompt, options = {}) {
    if (!this.isUsingLangchain()) {
      throw new Error(`LangChain API未启用或${this.apiProvider} API密钥未设置`);
    }

    try {
      const messages = [
        new SystemMessage("你是一位资深的技术专家，请详细、准确地回答提问到的技术问题，回答要专业、实用，如果回答内容涉及化学方程式、数学公式、物理公式等，请用标准的 LaTeX 数学公式格式输出，使用 $...$ 或 $...$ 包裹，如果问题要求绘制图表或图像，请用标准的Mermaid语法。请用中文回答。"),
        new HumanMessage(prompt)
      ];

      const result = await this.chat.invoke(messages, {
        signal: options.signal || null
      });

      return result.content;
    } catch (error) {
      console.error(`${this.apiProvider} API调用失败:`, error);
      throw error;
    }
  }

  // 通过Ollama调用API
  async callOllamaAPI(prompt, model = this.defaultModel, options = {}) {
    const axios = require('axios');
    try {
      const response = await axios.post(`${this.ollamaApiUrl}/api/generate`, {
        model: model,
        prompt: prompt,
        stream: options.stream || false,
        options: options.options || {}
      }, {
        timeout: options.timeout || 60000
      });

      return response.data;
    } catch (error) {
      console.error('Ollama API调用失败:', error.message);
      throw error;
    }
  }

  // 统一的问答方法，根据配置选择API
  async answerQuestion(question, contextPrompt = '', model = this.defaultModel, options = {}) {
    const prompt = `你是一位资深的技术专家，请详细、准确地回答提问到的技术问题，回答要专业、实用，
                  如果回答内容涉及化学方程式、数学公式、物理公式等，请用标准的 LaTeX 数学公式格式输出，使用 $...$ 或 $...$ 包裹，
                  如果问题要求绘制图表或图像，请用标准的Mermaid语法。${contextPrompt}
                  当前问题：${question}
                  请用中文回答。`;

    if (this.isUsingLangchain()) {
      return await this.callLangchainAPI(prompt, options);
    } else {
      const response = await this.callOllamaAPI(prompt, model, options);
      return response.response || '';
    }
  }

  // 为server.js提供对chat实例的访问权限，以便进行流式处理
  getChatInstance() {
    if (!this.isUsingLangchain()) {
      return null;
    }
    return this.chat;
  }

  // 获取当前配置信息
  getConfigInfo() {
    return {
      useLangchain: this.useLangchain,
      apiProvider: this.apiProvider,
      isConfigured: this.isUsingLangchain(),
      availableProviders: this.getAvailableProviders()
    };
  }
}

module.exports = { LangchainService };