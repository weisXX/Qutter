export interface AppError {
  code: string
  message: string
  details?: any
}

export class ErrorHandler {
  static handle(error: any): AppError {
    console.error('应用错误:', error)
    
    if (error.response) {
      // 服务器响应错误
      const status = error.response.status
      const data = error.response.data
      
      switch (status) {
        case 400:
          return {
            code: 'BAD_REQUEST',
            message: data.error || '请求参数错误',
            details: data
          }
        case 500:
          return {
            code: 'SERVER_ERROR',
            message: data.error || '服务器内部错误',
            details: data
          }
        case 503:
          return {
            code: 'SERVICE_UNAVAILABLE',
            message: '服务暂时不可用，请稍后再试',
            details: data
          }
        default:
          return {
            code: 'HTTP_ERROR',
            message: `请求失败 (${status})`,
            details: data
          }
      }
    } else if (error.request) {
      // 网络错误
      return {
        code: 'NETWORK_ERROR',
        message: '网络连接失败，请检查网络设置',
        details: error.message
      }
    } else {
      // 应用内部错误
      return {
        code: 'APP_ERROR',
        message: error.message || '应用发生未知错误',
        details: error
      }
    }
  }
  
  static getUserFriendlyMessage(error: AppError): string {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return '🌐 网络连接失败，请检查您的网络设置'
      case 'SERVICE_UNAVAILABLE':
        return '🔧 AI服务暂时不可用，请稍后再试'
      case 'SERVER_ERROR':
        return '💥 服务器出现错误，请稍后再试'
      case 'BAD_REQUEST':
        return '⚠️ 输入内容有误，请检查后重试'
      default:
        return '❌ 发生错误，请稍后再试'
    }
  }
}

export default ErrorHandler