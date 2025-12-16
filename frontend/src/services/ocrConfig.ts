// OCR配置管理
export interface OCRConfig {
  engine: 'tesseract' | 'cloud' | 'auto'
  language: 'chi_sim+eng' | 'chi_sim' | 'eng'
  enablePreprocessing: boolean
  enablePostProcessing: boolean
  cloudProvider: 'baidu' | 'tencent' | 'aliyun'
}

export class OCRConfigManager {
  private static readonly CONFIG_KEY = 'ocr_config'
  
  // 默认配置
  private static defaultConfig: OCRConfig = {
    engine: 'auto',
    language: 'chi_sim+eng',
    enablePreprocessing: true,
    enablePostProcessing: true,
    cloudProvider: 'baidu'
  }
  
  /**
   * 获取OCR配置
   */
  static getConfig(): OCRConfig {
    try {
      const saved = localStorage.getItem(this.CONFIG_KEY)
      if (saved) {
        return { ...this.defaultConfig, ...JSON.parse(saved) }
      }
    } catch (error) {
      console.warn('读取OCR配置失败，使用默认配置:', error)
    }
    return this.defaultConfig
  }
  
  /**
   * 保存OCR配置
   */
  static saveConfig(config: Partial<OCRConfig>): void {
    try {
      const currentConfig = this.getConfig()
      const newConfig = { ...currentConfig, ...config }
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(newConfig))
    } catch (error) {
      console.warn('保存OCR配置失败:', error)
    }
  }
  
  /**
   * 重置为默认配置
   */
  static resetConfig(): void {
    try {
      localStorage.removeItem(this.CONFIG_KEY)
    } catch (error) {
      console.warn('重置OCR配置失败:', error)
    }
  }
  
  /**
   * 根据配置获取最佳OCR方案
   */
  static getBestEngine(file: File): 'tesseract' | 'cloud' {
    const config = this.getConfig()
    
    if (config.engine === 'cloud') {
      return 'cloud'
    }
    
    if (config.engine === 'tesseract') {
      return 'tesseract'
    }
    
    // auto模式：根据文件大小和类型选择
    const fileSizeMB = file.size / (1024 * 1024)
    
    // 大文件优先使用云端OCR
    if (fileSizeMB > 5) {
      return 'cloud'
    }
    
    // 小文件使用本地OCR
    return 'tesseract'
  }
}

export default OCRConfigManager