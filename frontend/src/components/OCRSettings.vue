<template>
  <div class="ocr-settings">
    <h3>OCR 设置</h3>
    
    <div class="setting-group">
      <label class="setting-label">OCR 引擎</label>
      <select v-model="localConfig.engine" @change="saveConfig" class="setting-select">
        <option value="auto">自动选择</option>
        <option value="tesseract">本地 Tesseract.js</option>
        <option value="cloud">云端 OCR</option>
      </select>
      <small class="setting-hint">
        自动模式会根据文件大小智能选择最佳引擎
      </small>
    </div>

    <div class="setting-group">
      <label class="setting-label">识别语言</label>
      <select v-model="localConfig.language" @change="saveConfig" class="setting-select">
        <option value="chi_sim+eng">中文简体 + 英文</option>
        <option value="chi_sim">仅中文简体</option>
        <option value="eng">仅英文</option>
      </select>
    </div>

    <div v-if="localConfig.engine === 'cloud'" class="setting-group">
      <label class="setting-label">云端服务提供商</label>
      <select v-model="localConfig.cloudProvider" @change="saveConfig" class="setting-select">
        <option value="baidu">百度 OCR</option>
        <option value="tencent">腾讯 OCR</option>
        <option value="aliyun">阿里云 OCR</option>
      </select>
      <small class="setting-hint">
        需要配置相应的 API Key 才能使用云端服务
      </small>
    </div>

    <div class="setting-group">
      <label class="checkbox-label">
        <input 
          type="checkbox" 
          v-model="localConfig.enablePreprocessing" 
          @change="saveConfig"
          class="setting-checkbox"
        />
        启用图像预处理
      </label>
      <small class="setting-hint">
        提高识别准确率，但会增加处理时间
      </small>
    </div>

    <div class="setting-group">
      <label class="checkbox-label">
        <input 
          type="checkbox" 
          v-model="localConfig.enablePostProcessing" 
          @change="saveConfig"
          class="setting-checkbox"
        />
        启用结果后处理
      </label>
      <small class="setting-hint">
        自动修正常见的识别错误
      </small>
    </div>

    <div class="setting-actions">
      <button @click="testOCR" :disabled="isTesting" class="test-button">
        {{ isTesting ? '测试中...' : '测试 OCR' }}
      </button>
      <button @click="resetConfig" class="reset-button">重置设置</button>
    </div>

    <div v-if="testResult" class="test-result">
      <h4>测试结果</h4>
      <div class="test-image" v-if="testImage">
        <img :src="testImage" alt="测试图片" />
      </div>
      <div class="test-text">
        <strong>识别结果：</strong>
        <p>{{ testResult }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import OCRConfigManager from '../services/ocrConfig'
import type { OCRConfig } from '../services/ocrConfig'
import FileProcessor from '../services/fileProcessor'

const localConfig = ref<OCRConfig>(OCRConfigManager.getConfig())
const isTesting = ref(false)
const testResult = ref('')
const testImage = ref('')

const saveConfig = () => {
  OCRConfigManager.saveConfig(localConfig.value)
}

const resetConfig = () => {
  OCRConfigManager.resetConfig()
  localConfig.value = OCRConfigManager.getConfig()
}

const testOCR = async () => {
  isTesting.value = true
  testResult.value = ''
  
  try {
    // 创建一个简单的测试图片
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = 200
    canvas.height = 100
    
    // 绘制测试文本
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'black'
    ctx.font = '20px Arial'
    ctx.fillText('测试OCR识别123', 10, 50)
    
    // 转换为文件
    canvas.toBlob(async (blob) => {
      if (blob) {
        testImage.value = URL.createObjectURL(blob)
        const testFile = new File([blob], 'test.png', { type: 'image/png' })
        
        try {
          const result = await FileProcessor.processFile(testFile)
          testResult.value = result.text || '识别失败'
        } catch (error) {
          testResult.value = `错误: ${error}`
        }
      }
      isTesting.value = false
    }, 'image/png')
  } catch (error) {
    testResult.value = `测试失败: ${error}`
    isTesting.value = false
  }
}

onMounted(() => {
  // 初始化时保存当前配置
  saveConfig()
})
</script>

<style scoped>
.ocr-settings {
  padding: 20px;
  max-width: 500px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.ocr-settings h3 {
  margin: 0 0 20px 0;
  color: #1f2937;
  font-size: 18px;
}

.setting-group {
  margin-bottom: 20px;
}

.setting-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.setting-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 14px;
}

.setting-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
}

.setting-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #3b82f6;
}

.setting-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}

.setting-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.test-button, .reset-button {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.test-button {
  background: #3b82f6;
  color: white;
  border: none;
}

.test-button:hover:not(:disabled) {
  background: #2563eb;
}

.test-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.reset-button {
  background: transparent;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.reset-button:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.test-result {
  margin-top: 20px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.test-result h4 {
  margin: 0 0 12px 0;
  color: #1f2937;
  font-size: 14px;
}

.test-image {
  margin-bottom: 12px;
}

.test-image img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  border: 1px solid #d1d5db;
}

.test-text strong {
  color: #374151;
}

.test-text p {
  margin: 8px 0 0 0;
  color: #1f2937;
  font-family: monospace;
  font-size: 13px;
  background: white;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #d1d5db;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>