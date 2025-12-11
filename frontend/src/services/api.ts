import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

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
  model?: string
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/ask-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        model: model || 'gpt-oss:120b-cloud'
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

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') return
          
          try {
            const parsed = JSON.parse(data)
            if (parsed.content) {
              onChunk(parsed.content)
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  } catch (error) {
    console.error('流式提问失败:', error)
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error || '网络请求失败')
    }
    throw error
  }
}

export const askQuestion = async (question: string, model?: string): Promise<AskResponse> => {
  try {
    const response = await api.post('/ask', {
      question,
      model: model || 'gpt-oss:120b-cloud'
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

export default api