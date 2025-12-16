const multer = require('multer')
const path = require('path')
const fs = require('fs').promises
const Tesseract = require('tesseract.js')
const pdfParse = require('pdf-parse')
const mammoth = require('mammoth')
const XLSX = require('xlsx')

// 配置multer存储
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads')
    try {
      await fs.mkdir(uploadDir, { recursive: true })
      cb(null, uploadDir)
    } catch (error) {
      cb(error)
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB限制
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      // 图片类型
      'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp', 'image/webp',
      // 文档类型
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/markdown',
      'application/json',
      'text/csv'
    ]
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype}`), false)
    }
  }
})

class FileProcessor {
  /**
   * 从图片中提取文本（OCR）- 优化配置提高中文识别率
   */
  static async extractTextFromImage(filePath) {
    try {
      console.log('开始OCR识别:', filePath)
      const result = await Tesseract.recognize(
        filePath,
        'chi_sim+eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              console.log(`OCR进度: ${Math.round(m.progress * 100)}%`)
            }
          },
          // 优化配置以提高中文识别率
          tessedit_pageseg_mode: '6', // SINGLE_BLOCK - 假设是单一文本块
          preserve_interword_spaces: '1',
          tessedit_ocr_engine_mode: '1', // LSTM_ONLY - 使用LSTM引擎
          tessedit_create_hocr: '0',
          tessedit_create_tsv: '0',
          tessedit_create_txt: '1',
          tessedit_create_alto: '0',
          tessedit_create_lstmbox: '0',
          tessedit_create_wordstrbox: '0',
          // 图像预处理参数
          image_default_resolution: '300',
          image_resized_width: '3000',
          image_resized_height: '3000'
        }
      )
      
      // 后处理识别结果
      const cleanedText = this.postProcessOcrResult(result.data.text)
      
      return {
        success: true,
        text: cleanedText
      }
    } catch (error) {
      console.error('OCR识别失败:', error)
      return {
        success: false,
        error: `图片OCR识别失败: ${error.message}`
      }
    }
  }

  /**
   * 后处理OCR结果以提高准确性
   */
  static postProcessOcrResult(text) {
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
  static async extractTextFromPDF(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath)
      const data = await pdfParse(dataBuffer)
      
      return {
        success: true,
        text: data.text
      }
    } catch (error) {
      console.error('PDF处理失败:', error)
      return {
        success: false,
        error: `PDF文件处理失败: ${error.message}`
      }
    }
  }

  /**
   * 从Word文档中提取文本
   */
  static async extractTextFromWord(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath })
      
      return {
        success: true,
        text: result.value
      }
    } catch (error) {
      console.error('Word文档处理失败:', error)
      return {
        success: false,
        error: `Word文档处理失败: ${error.message}`
      }
    }
  }

  /**
   * 从Excel文件中提取文本
   */
  static async extractTextFromExcel(filePath) {
    try {
      const workbook = XLSX.readFile(filePath)
      let text = ''
      
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName]
        const sheetText = XLSX.utils.sheet_to_txt(worksheet)
        text += `工作表 "${sheetName}":\n${sheetText}\n\n`
      })
      
      return {
        success: true,
        text
      }
    } catch (error) {
      console.error('Excel文件处理失败:', error)
      return {
        success: false,
        error: `Excel文件处理失败: ${error.message}`
      }
    }
  }

  /**
   * 从文本文件中提取文本
   */
  static async extractTextFromText(filePath) {
    try {
      const text = await fs.readFile(filePath, 'utf-8')
      
      return {
        success: true,
        text
      }
    } catch (error) {
      console.error('文本文件处理失败:', error)
      return {
        success: false,
        error: `文本文件处理失败: ${error.message}`
      }
    }
  }

  /**
   * 处理文件并提取文本
   */
  static async processFile(file) {
    const filePath = file.path
    const mimeType = file.mimetype
    const originalName = file.originalname
    
    try {
      let result = {}
      
      if (mimeType.startsWith('image/')) {
        result = await this.extractTextFromImage(filePath)
      } else if (mimeType === 'application/pdf') {
        result = await this.extractTextFromPDF(filePath)
      } else if (mimeType.includes('word') || mimeType.includes('document')) {
        result = await this.extractTextFromWord(filePath)
      } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
        result = await this.extractTextFromExcel(filePath)
      } else if (mimeType.startsWith('text/')) {
        result = await this.extractTextFromText(filePath)
      } else {
        result = {
          success: false,
          error: `不支持的文件类型: ${mimeType}`
        }
      }
      
      // 清理临时文件
      await fs.unlink(filePath).catch(err => console.error('清理临时文件失败:', err))
      
      return {
        fileName: originalName,
        fileType: mimeType,
        ...result
      }
    } catch (error) {
      // 清理临时文件
      await fs.unlink(filePath).catch(err => console.error('清理临时文件失败:', err))
      
      return {
        fileName: originalName,
        fileType: mimeType,
        success: false,
        error: `文件处理失败: ${error.message}`
      }
    }
  }

  /**
   * 批量处理文件
   */
  static async processFiles(files) {
    const results = []
    
    for (const file of files) {
      const result = await this.processFile(file)
      results.push(result)
    }
    
    return results
  }
}

module.exports = {
  upload,
  FileProcessor
}