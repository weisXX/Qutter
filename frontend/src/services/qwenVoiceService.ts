import axios from 'axios'

export interface VoiceRecognitionRequest {
  audio: Blob
  language?: string
  format?: string
}

export interface VoiceRecognitionResponse {
  text: string
  confidence: number
  duration: number
}

export interface VoiceSynthesisRequest {
  text: string
  voice?: string
  language?: string
  speed?: number
}

export interface VoiceSynthesisResponse {
  audio: Blob
  format: string
  duration: number
}

class QwenVoiceService {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string = 'https://dashscope.aliyuncs.com/api/v1', apiKey: string = '') {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  // 语音识别
  async recognizeVoice(audio: Blob, options: {
    language?: string
    format?: string
  } = {}): Promise<VoiceRecognitionResponse> {
    try {
      const formData = new FormData()
      formData.append('audio', audio, 'audio.wav')
      formData.append('model', 'qwen-audio-turbo')
      
      if (options.language) {
        formData.append('language', options.language)
      }
      
      if (options.format) {
        formData.append('format', options.format)
      }

      const response = await axios.post(
        `${this.baseUrl}/audio/transcriptions`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'multipart/form-data'
          },
          timeout: 30000
        }
      )

      return response.data
    } catch (error) {
      console.error('语音识别失败:', error)
      throw new Error('语音识别失败')
    }
  }

  // 实时语音识别
  async createRealtimeSession(): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/realtime/sessions`,
        {
          model: 'qwen-audio-turbo',
          input: {
            audio: {
              format: 'wav',
              sample_rate: 16000
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      return response.data.session_id
    } catch (error) {
      console.error('创建实时语音会话失败:', error)
      throw new Error('创建实时语音会话失败')
    }
  }

  // 语音合成
  async synthesizeVoice(text: string, options: {
    voice?: string
    language?: string
    speed?: number
  } = {}): Promise<VoiceSynthesisResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/audio/speech`,
        {
          model: 'qwen-audio-turbo',
          input: text,
          voice: options.voice || 'zh-CN-female-1',
          language: options.language || 'zh-CN',
          speed: options.speed || 1.0,
          response_format: 'wav'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'blob',
          timeout: 30000
        }
      )

      return {
        audio: response.data,
        format: 'wav',
        duration: 0 // 需要从响应头或其他地方获取
      }
    } catch (error) {
      console.error('语音合成失败:', error)
      throw new Error('语音合成失败')
    }
  }

  // 实时语音识别WebSocket连接
  createRealtimeConnection(sessionId: string): WebSocket {
    const wsUrl = `wss://dashscope.aliyuncs.com/realtime?session_id=${sessionId}`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('实时语音连接已建立')
      // 发送配置消息
      ws.send(JSON.stringify({
        type: 'config',
        config: {
          sample_rate: 16000,
          format: 'wav',
          language: 'zh-CN'
        }
      }))
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log('收到实时语音数据:', data)
    }

    ws.onerror = (error) => {
      console.error('实时语音连接错误:', error)
    }

    ws.onclose = () => {
      console.log('实时语音连接已关闭')
    }

    return ws
  }

  // 发送音频数据到实时连接
  sendAudioData(ws: WebSocket, audioData: Blob): void {
    if (ws.readyState === WebSocket.OPEN) {
      const reader = new FileReader()
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer
        ws.send(arrayBuffer)
      }
      reader.readAsArrayBuffer(audioData)
    }
  }

  // 设置API密钥
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  // 获取API密钥
  getApiKey(): string {
    return this.apiKey
  }
}

// 创建单例实例
const qwenVoiceService = new QwenVoiceService()

export default qwenVoiceService