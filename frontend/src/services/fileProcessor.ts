import Tesseract from 'tesseract.js'
import * as pdfLib from 'pdf-lib'
import mammoth from 'mammoth'
import CloudOCRService from './cloudOCR'
import OCRConfigManager from './ocrConfig'
import type { OCRConfig } from './ocrConfig'

export interface FileProcessResult {
  fileName: string
  fileType: string
  text: string
  error?: string
  preview?: string
}

export class FileProcessor {
  // 支持的图片格式
  private static readonly IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp', 'image/webp']
  
  // 支持的文档格式
  private static readonly DOCUMENT_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/plain', // .txt
    'text/markdown', // .md
    'application/json', // .json
    'text/csv' // .csv
  ]

  /**
   * 检查文件类型是否支持
   */
  static isSupportedType(fileType: string): boolean {
    return this.IMAGE_TYPES.includes(fileType) || this.DOCUMENT_TYPES.includes(fileType)
  }

  /**
   * 获取文件类型分类
   */
  static getFileCategory(fileType: string): 'image' | 'document' | 'unsupported' {
    if (this.IMAGE_TYPES.includes(fileType)) return 'image'
    if (this.DOCUMENT_TYPES.includes(fileType)) return 'document'
    return 'unsupported'
  }

  /**
   * 处理文件并提取文本
   */
  static async processFile(file: File): Promise<FileProcessResult> {
    const fileType = file.type
    const fileName = file.name
    
    try {
      let text = ''
      let preview = ''

      if (this.IMAGE_TYPES.includes(fileType)) {
        // 图片OCR识别
        const result = await this.extractTextFromImage(file)
        text = result.text
        preview = `图片识别结果：${result.text.substring(0, 100)}${result.text.length > 100 ? '...' : ''}`
      } else if (fileType === 'application/pdf') {
        // PDF文件处理
        const result = await this.extractTextFromPDF(file)
        text = result.text
        preview = `PDF文档内容：${result.text.substring(0, 100)}${result.text.length > 100 ? '...' : ''}`
      } else if (fileType.includes('word') || fileType.includes('document')) {
        // Word文档处理
        const result = await this.extractTextFromWord(file)
        text = result.text
        preview = `Word文档内容：${result.text.substring(0, 100)}${result.text.length > 100 ? '...' : ''}`
      } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
        // Excel文件处理
        const result = await this.extractTextFromExcel(file)
        text = result.text
        preview = `Excel表格内容：${result.text.substring(0, 100)}${result.text.length > 100 ? '...' : ''}`
      } else if (fileType.startsWith('text/')) {
        // 纯文本文件
        const result = await this.extractTextFromText(file)
        text = result.text
        preview = `文本内容：${result.text.substring(0, 100)}${result.text.length > 100 ? '...' : ''}`
      } else {
        throw new Error(`不支持的文件类型: ${fileType}`)
      }

      return {
        fileName,
        fileType,
        text,
        preview
      }
    } catch (error) {
      console.error(`处理文件 ${fileName} 失败:`, error)
      return {
        fileName,
        fileType,
        text: '',
        error: error instanceof Error ? error.message : '文件处理失败'
      }
    }
  }

  /**
   * 从图片中提取文本（OCR）- 智能选择最佳方案
   */
  private static async extractTextFromImage(file: File): Promise<{ text: string }> {
    const config = OCRConfigManager.getConfig()
    let lastError: Error | null = null
    
    // 根据配置选择OCR引擎
    const bestEngine = OCRConfigManager.getBestEngine(file)
    console.log(`使用OCR引擎: ${bestEngine}`)
    
    if (bestEngine === 'cloud') {
      // 优先使用云端OCR
      try {
        console.log('使用云端OCR服务进行识别...')
        const cloudResult = await this.extractTextWithCloud(file, config.cloudProvider)
        if (cloudResult.text && cloudResult.text.length > 5) {
          return cloudResult
        }
      } catch (error) {
        lastError = error as Error
        console.warn('云端OCR失败，回退到本地OCR:', error)
      }
    }
    
    // 使用本地Tesseract.js
    try {
      console.log('使用本地 Tesseract.js 进行OCR识别...')
      const result = await this.extractTextWithTesseract(file, config)
      if (result.text && result.text.length > 5) {
        return result
      }
    } catch (error) {
      lastError = error as Error
      console.warn('Tesseract.js 识别失败:', error)
    }
    
    // 备用方案：尝试不同的Tesseract配置
    try {
      console.log('尝试备用 Tesseract 配置...')
      const fallbackResult = await this.extractTextWithFallbackTesseract(file, config)
      if (fallbackResult.text && fallbackResult.text.length > 3) {
        return fallbackResult
      }
    } catch (error) {
      console.warn('备用配置也失败:', error)
    }
    
    // 如果所有方案都失败
    if (lastError) {
      throw new Error(`图片OCR识别失败: ${lastError.message}`)
    }
    
    return { text: '' }
  }

  /**
   * 使用云端OCR服务
   */
  private static async extractTextWithCloud(file: File, provider: string): Promise<{ text: string }> {
    switch (provider) {
      case 'baidu':
        return { text: await CloudOCRService.recognizeWithBaidu(file) }
      case 'tencent':
        return { text: await CloudOCRService.recognizeWithTencent(file) }
      default:
        throw new Error(`不支持的云端OCR提供商: ${provider}`)
    }
  }

  /**
   * 使用优化配置的 Tesseract.js
   */
  private static async extractTextWithTesseract(file: File, config: OCRConfig): Promise<{ text: string }> {
    // 预处理图片以提高识别率
    const processedImage = config.enablePreprocessing ? await this.preprocessImage(file) : file
    
    const result = await Tesseract.recognize(
      processedImage,
      config.language, // 使用配置的语言
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR进度: ${Math.round(m.progress * 100)}%`)
          }
        },
        // 优化配置以提高中文识别率
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK, // 假设是单一文本块
        preserve_interword_spaces: '1',
        tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY, // 使用LSTM引擎
        tessedit_create_hocr: '0', // 不创建hOCR
        tessedit_create_tsv: '0', // 不创建TSV
        tessedit_create_txt: '1', // 创建TXT
        tessedit_create_alto: '0', // 不创建ALTO
        tessedit_create_lstmbox: '0', // 不创建LSTM box
        tessedit_create_wordstrbox: '0', // 不创建wordstr box
      }
    )
    
    // 后处理识别结果
    const cleanedText = config.enablePostProcessing ? 
      this.postProcessOcrResult(result.data.text) : 
      result.data.text.trim()
    
    return {
      text: cleanedText
    }
  }

  /**
   * 备用 Tesseract 配置
   */
  private static async extractTextWithFallbackTesseract(file: File, config: OCRConfig): Promise<{ text: string }> {
    const result = await Tesseract.recognize(
      file,
      config.language,
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`备用OCR进度: ${Math.round(m.progress * 100)}%`)
          }
        },
        // 更宽松的配置
        tessedit_pageseg_mode: Tesseract.PSM.AUTO, // 自动检测页面分割
        tessedit_ocr_engine_mode: Tesseract.OEM.DEFAULT, // 默认引擎
        preserve_interword_spaces: '1',
      }
    )
    
    const cleanedText = config.enablePostProcessing ? 
      this.postProcessOcrResult(result.data.text) : 
      result.data.text.trim()
    
    return {
      text: cleanedText
    }
  }

  /**
   * 预处理图片以提高OCR识别率
   */
  private static async preprocessImage(file: File): Promise<File | string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        // 设置合适的尺寸 - 适当的缩放可以提高识别率
        const scaleFactor = Math.max(2, Math.min(3000 / img.width, 3000 / img.height))
        canvas.width = img.width * scaleFactor
        canvas.height = img.height * scaleFactor
        
        // 绘制并应用图像增强
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        // 获取图像数据并进行处理
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        
        // 增强对比度和清晰度
        for (let i = 0; i < data.length; i += 4) {
          // 灰度化
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
          
          // 增强对比度
          const contrast = 1.5
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
          const enhanced = factor * (gray - 128) + 128
          
          // 应用阈值处理，使文字更清晰
          const threshold = 128
          const final = enhanced > threshold ? 255 : 0
          
          data[i] = final     // R
          data[i + 1] = final // G
          data[i + 2] = final // B
          // Alpha 保持不变
        }
        
        ctx.putImageData(imageData, 0, 0)
        
        // 转换为blob或dataURL
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/png' }))
          } else {
            resolve(canvas.toDataURL())
          }
        }, 'image/png', 1.0)
      }
      
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * 后处理OCR结果以提高准确性
   */
  private static postProcessOcrResult(text: string): string {
    if (!text) return ''
    
    return text
      // 清理多余的空白字符
      .replace(/\s+/g, ' ')
      // 清理行首行尾空白
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n')
      // 修复常见的中文识别错误
      .replace(/0/g, '零')
      .replace(/1/g, '一')
      .replace(/2/g, '二')
      .replace(/3/g, '三')
      .replace(/4/g, '四')
      .replace(/5/g, '五')
      .replace(/6/g, '六')
      .replace(/7/g, '七')
      .replace(/8/g, '八')
      .replace(/9/g, '九')
      // 修复标点符号
      .replace(/\./g, '。')
      .replace(/,/g, '，')
      .replace(/\?/g, '？')
      .replace(/!/g, '！')
      .trim()
  }

  /**
   * 从PDF中提取文本
   */
  private static async extractTextFromPDF(file: File): Promise<{ text: string }> {
    try {
      // 将File转换为ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfLib.PDFDocument.load(arrayBuffer)
      
      // 注意：pdf-lib主要用于创建和修改PDF，提取文本需要其他方法
      // 这里我们使用后端API来处理PDF
      throw new Error('PDF文件需要在后端处理')
    } catch (error) {
      throw new Error(`PDF文件处理失败: ${error}`)
    }
  }

  /**
   * 从Word文档中提取文本
   */
  private static async extractTextFromWord(file: File): Promise<{ text: string }> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      
      return {
        text: result.value
      }
    } catch (error) {
      throw new Error(`Word文档处理失败: ${error}`)
    }
  }

  /**
   * 从Excel文件中提取文本
   */
  private static async extractTextFromExcel(file: File): Promise<{ text: string }> {
    try {
      // Excel文件需要在后端处理，使用xlsx库
      throw new Error('Excel文件需要在后端处理')
    } catch (error) {
      throw new Error(`Excel文件处理失败: ${error}`)
    }
  }

  /**
   * 从文本文件中提取文本
   */
  private static async extractTextFromText(file: File): Promise<{ text: string }> {
    try {
      const text = await file.text()
      return {
        text
      }
    } catch (error) {
      throw new Error(`文本文件处理失败: ${error}`)
    }
  }

  /**
   * 批量处理文件
   */
  static async processFiles(files: File[]): Promise<FileProcessResult[]> {
    const results: FileProcessResult[] = []
    
    for (const file of files) {
      const result = await this.processFile(file)
      results.push(result)
    }
    
    return results
  }

  /**
   * 创建文件预览URL
   */
  static createPreviewURL(file: File): string {
    return URL.createObjectURL(file)
  }

  /**
   * 释放预览URL
   */
  static revokePreviewURL(url: string): void {
    URL.revokeObjectURL(url)
  }
}

export default FileProcessor