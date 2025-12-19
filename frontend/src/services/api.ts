import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
const DEFAULT_MODEL = import.meta.env.VITE_DEFAULT_MODEL || ''

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60秒超时
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface AskResponse {
  question: string
  answer: string
  model: string
  sessionId?: string
}

export interface ModelInfo {
  name: string
  size: number
  digest: string
  modified_at: string
}

export interface ModelsResponse {
  models: ModelInfo[]
}

export interface Session {
  id: number
  session_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: number
  session_id: string
  message_type: 'user' | 'assistant'
  content: string
  created_at: string
}

export const healthCheck = async () => {
  try {
    const response = await api.get('/health')
    return response.data
  } catch (error) {
    console.error('健康检查失败:', error)
    throw error
  }
}

export const getModels = async (): Promise<ModelsResponse> => {
  try {
    const response = await api.get('/models')
    return response.data
  } catch (error) {
    console.error('获取模型列表失败:', error)
    throw error
  }
}

export const askQuestionStream = async (
  question: string, 
  onChunk: (chunk: string) => void,
  model?: string,
  sessionId?: string
): Promise<{ requestId: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/ask-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        model: model || DEFAULT_MODEL,
        sessionId
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '请求失败')
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('无法读取响应流')
    }

    let requestId = '';

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') return { requestId }
          
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) {
              // 处理流中的错误消息
              throw new Error(parsed.error)
            }
            if (parsed.requestId) {
              requestId = parsed.requestId
            }
            if (parsed.content) {
              onChunk(parsed.content)
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
              // 如果是解析错误且不是JSON解析不完整，则抛出错误
              throw e
            }
            // 忽略JSON解析不完整的错误
          }
        }
      }
    }
    return { requestId }
  } catch (error) {
    console.error('流式提问失败:', error)
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error || '网络请求失败')
    }
    throw error
  }
}

export const askQuestionStreamWithFiles = async (
  question: string,
  files: File[],
  onChunk: (chunk: string) => void,
  model?: string,
  sessionId?: string
): Promise<{ requestId: string }> => {
  try {
    const formData = new FormData()
    formData.append('question', question)
    formData.append('model', model || DEFAULT_MODEL)
    if (sessionId) {
      formData.append('sessionId', sessionId)
    }
    
    // 添加文件
    files.forEach(file => {
      formData.append('files', file)
    })

    const response = await fetch(`${API_BASE_URL}/ask-stream-with-files`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '请求失败')
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('无法读取响应流')
    }

    let requestId = '';
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') return { requestId }
          
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) {
              // 处理流中的错误消息
              throw new Error(parsed.error)
            }
            if (parsed.requestId) {
              requestId = parsed.requestId
            }
            if (parsed.content) {
              onChunk(parsed.content)
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
              // 如果是解析错误且不是JSON解析不完整，则抛出错误
              throw e
            }
            // 忽略JSON解析不完整的错误
          }
        }
      }
    }
    
    return { requestId }
  } catch (error) {
    console.error('带文件的流式提问失败:', error)
    throw error
  }
}

export const uploadFiles = async (files: File[]) => {
  try {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    return response.data
  } catch (error) {
    console.error('文件上传失败:', error)
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error || '文件上传失败'
      throw new Error(errorMessage)
    }
    throw error
  }
}

export const askQuestion = async (question: string, model?: string, sessionId?: string): Promise<AskResponse> => {
  try {
    const response = await api.post('/ask', {
      question,
      model: model || DEFAULT_MODEL,
      sessionId
    })
    return response.data
  } catch (error) {
    console.error('提问失败:', error)
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error || '网络请求失败'
      throw new Error(errorMessage)
    }
    throw error
  }
}

// 会话管理API
export const getSessions = async (): Promise<Session[]> => {
  try {
    const response = await api.get('/sessions')
    return response.data
  } catch (error) {
    console.error('获取会话列表失败:', error)
    throw error
  }
}

export const createSession = async (title?: string): Promise<Session> => {
  try {
    const response = await api.post('/sessions', { title })
    return response.data
  } catch (error) {
    console.error('创建会话失败:', error)
    throw error
  }
}

export const getSession = async (sessionId: string): Promise<Session> => {
  try {
    const response = await api.get(`/sessions/${sessionId}`)
    return response.data
  } catch (error) {
    console.error('获取会话失败:', error)
    throw error
  }
}

export const updateSessionTitle = async (sessionId: string, title: string): Promise<boolean> => {
  try {
    const response = await api.put(`/sessions/${sessionId}`, { title })
    return response.data.success
  } catch (error) {
    console.error('更新会话标题失败:', error)
    throw error
  }
}

export const deleteSession = async (sessionId: string): Promise<boolean> => {
  try {
    const response = await api.delete(`/sessions/${sessionId}`)
    return response.data.success
  } catch (error) {
    console.error('删除会话失败:', error)
    throw error
  }
}

export const getSessionMessages = async (sessionId: string): Promise<Message[]> => {
  try {
    const response = await api.get(`/sessions/${sessionId}/messages`)
    return response.data
  } catch (error) {
    console.error('获取会话消息失败:', error)
    throw error
  }
}

// API提供商相关接口

export interface APIProviderConfig {
  useLangchain: boolean;
  apiProvider: string;
  isConfigured: boolean;
  availableProviders: string[];
}

export interface SwitchProviderRequest {
  provider: string;
}

export interface SwitchProviderResponse {
  success: boolean;
  message: string;
  config: APIProviderConfig;
}

export interface AvailableProvidersResponse {
  providers: string[];
}

export const getAPIProviderConfig = async (): Promise<APIProviderConfig> => {
  try {
    const response = await api.get('/api-provider/config');
    return response.data;
  } catch (error) {
    console.error('获取API提供商配置失败:', error);
    throw error;
  }
};

export const switchAPIProvider = async (provider: string): Promise<any> => {
  try {
    const response = await api.post('/api-provider/switch', { provider });
    return response.data;
  } catch (error) {
    console.error('切换API提供商失败:', error);
    throw error;
  }
}

export const stopRequest = async (requestId: string): Promise<any> => {
  try {
    const response = await api.post('/stop-request', { requestId });
    return response.data;
  } catch (error) {
    console.error('停止请求失败:', error);
    throw error;
  }
}

export const getAvailableAPIProviders = async (): Promise<AvailableProvidersResponse> => {
  try {
    const response = await api.get('/api-provider/available');
    return response.data;
  } catch (error) {
    console.error('获取可用API提供商失败:', error);
    throw error;
  }
};

export default api