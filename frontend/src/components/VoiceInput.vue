<template>
  <div class="voice-input-container">
    <div class="input-mode-toggle">
      <button 
        @click="setMode('text')" 
        :class="['mode-btn', { active: inputMode === 'text' }]"
        title="文本输入"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
        文本
      </button>
      <button 
        @click="setMode('voice')" 
        :class="['mode-btn', { active: inputMode === 'voice' }]"
        title="语音输入"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        </svg>
        语音
      </button>
    </div>

    <!-- 文本输入模式 -->
    <div v-if="inputMode === 'text'" class="text-input-section">
      <textarea
        v-model="textContent"
        @input="onTextInput"
        placeholder="请输入您的问题..."
        class="text-input"
        rows="4"
      ></textarea>
    </div>

    <!-- 语音输入模式 -->
    <div v-if="inputMode === 'voice'" class="voice-input-section">
      <div class="voice-controls">
        <button
          @click="toggleRecording"
          :class="['record-btn', { recording: isRecording }]"
          :disabled="isProcessing"
        >
          <svg v-if="!isRecording" class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
          <svg v-else class="icon recording-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          {{ isRecording ? '停止录音' : '开始录音' }}
        </button>
        
        <div v-if="isRecording" class="recording-indicator">
          <div class="wave-animation"></div>
          <span>正在录音...</span>
        </div>
      </div>

      <div v-if="voiceContent" class="voice-result">
        <div class="result-header">
          <span>识别结果：</span>
          <div class="result-actions">
            <button @click="editVoiceContent" class="edit-btn">编辑</button>
            <button @click="clearVoiceContent" class="clear-btn">清空</button>
          </div>
        </div>
        <div v-if="!editingVoiceContent" class="result-content">
          {{ voiceContent }}
        </div>
        <textarea
          v-else
          v-model="editableVoiceContent"
          @blur="saveVoiceContent"
          class="edit-textarea"
          rows="3"
        ></textarea>
      </div>
    </div>

    <!-- 公共提交区域 -->
    <div class="submit-section">
      <button
        @click="submitContent"
        :disabled="!hasContent || isProcessing"
        class="submit-btn"
      >
        <svg v-if="!isProcessing" class="icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
        {{ isProcessing ? '处理中...' : '发送' }}
      </button>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      {{ error }}
      <button @click="clearError" class="close-btn">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import qwenVoiceService from '../services/qwenVoiceService'

interface Props {
  onSubmit?: (content: string, mode: 'text' | 'voice') => Promise<void>
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请输入您的问题...'
})

const emit = defineEmits<{
  submit: [content: string, mode: 'text' | 'voice']
}>()

// 状态管理
const inputMode = ref<'text' | 'voice'>('text')
const textContent = ref('')
const voiceContent = ref('')
const editableVoiceContent = ref('')
const editingVoiceContent = ref(false)
const isRecording = ref(false)
const isProcessing = ref(false)
const error = ref('')

// 音频相关
let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let recognition: SpeechRecognition | null = null
let realtimeWs: WebSocket | null = null
let realtimeSessionId: string = ''

// 计算属性
const hasContent = computed(() => {
  if (inputMode.value === 'text') {
    return textContent.value.trim().length > 0
  } else {
    return voiceContent.value.trim().length > 0
  }
})

// 初始化语音识别
const initSpeechRecognition = () => {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    error.value = '您的浏览器不支持语音识别功能'
    return
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  recognition = new SpeechRecognition()
  
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'zh-CN'

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let finalTranscript = ''
    let interimTranscript = ''

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript
      if (event.results[i].isFinal) {
        finalTranscript += transcript
      } else {
        interimTranscript += transcript
      }
    }

    if (finalTranscript) {
      // 追加新内容而不是覆盖
      voiceContent.value += finalTranscript
    }
  }

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    console.error('语音识别错误:', event.error)
    error.value = `语音识别错误: ${event.error}`
    stopRecording()
  }

  recognition.onend = () => {
    if (isRecording.value) {
      // 如果仍在录音状态，重新启动
      recognition?.start()
    }
  }
}

// 初始化音频录制
const initMediaRecorder = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    
    mediaRecorder.ondataavailable = (event: BlobEvent) => {
      audioChunks.push(event.data)
    }
    
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
      audioChunks = []
      
      // 这里可以发送音频到Qwen API进行识别
      // 目前使用浏览器内置的语音识别
      await processAudio(audioBlob)
    }
  } catch (err) {
    console.error('无法访问麦克风:', err)
    error.value = '无法访问麦克风，请检查权限设置'
  }
}

// 处理音频
const processAudio = async (audioBlob: Blob) => {
  isProcessing.value = true
  try {
    // 使用Qwen实时语音API进行识别
    const result = await qwenVoiceService.recognizeVoice(audioBlob, {
      language: 'zh-CN',
      format: 'wav'
    })
    
    // 追加新内容而不是覆盖
    voiceContent.value += result.text
    console.log('语音识别结果:', result.text)
  } catch (err) {
    console.error('Qwen语音识别失败:', err)
    // 回退到浏览器内置识别
    if (recognition) {
      console.log('使用浏览器内置语音识别')
    } else {
      error.value = '语音识别失败，请重试'
    }
  } finally {
    isProcessing.value = false
  }
}

// 切换输入模式
const setMode = (mode: 'text' | 'voice') => {
  inputMode.value = mode
  clearError()
  
  if (mode === 'voice') {
    initSpeechRecognition()
  }
}

// 文本输入处理
const onTextInput = () => {
  clearError()
}

// 切换录音状态
const toggleRecording = async () => {
  if (isRecording.value) {
    stopRecording()
  } else {
    await startRecording()
  }
}

// 开始录音
const startRecording = async () => {
  clearError()
  
  if (!recognition) {
    initSpeechRecognition()
  }
  
  if (!mediaRecorder) {
    await initMediaRecorder()
  }
  
  try {
    isRecording.value = true
    // 不清空现有内容，保持连续性
    
    // 尝试启动Qwen实时语音识别
    try {
      realtimeSessionId = await qwenVoiceService.createRealtimeSession()
      realtimeWs = qwenVoiceService.createRealtimeConnection(realtimeSessionId)
      
      // 监听实时识别结果
      realtimeWs.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'recognition_result' && data.text) {
          // 追加新内容而不是覆盖
          voiceContent.value += data.text
        }
      }
    } catch (err) {
      console.log('Qwen实时语音不可用，使用浏览器内置识别')
      // 回退到浏览器内置识别
      recognition?.start()
    }
    
    // 启动音频录制
    mediaRecorder?.start()
  } catch (err) {
    console.error('启动录音失败:', err)
    error.value = '启动录音失败'
    isRecording.value = false
  }
}

// 停止录音
const stopRecording = () => {
  isRecording.value = false
  
  // 停止Qwen实时语音识别
  if (realtimeWs) {
    realtimeWs.close()
    realtimeWs = null
  }
  
  // 停止浏览器内置语音识别
  recognition?.stop()
  
  // 停止音频录制
  mediaRecorder?.stop()
}

// 编辑语音内容
const editVoiceContent = () => {
  editableVoiceContent.value = voiceContent.value
  editingVoiceContent.value = true
}

// 保存语音内容
const saveVoiceContent = () => {
  voiceContent.value = editableVoiceContent.value
  editingVoiceContent.value = false
}

// 清空语音内容
const clearVoiceContent = () => {
  voiceContent.value = ''
  clearError()
}

// 提交内容
const submitContent = async () => {
  const content = inputMode.value === 'text' ? textContent.value : voiceContent.value
  
  if (!content.trim()) {
    error.value = '请输入内容'
    return
  }
  
  isProcessing.value = true
  clearError()
  
  try {
    if (props.onSubmit) {
      await props.onSubmit(content, inputMode.value)
    } else {
      emit('submit', content, inputMode.value)
    }
    
    // 清空内容
    if (inputMode.value === 'text') {
      textContent.value = ''
    } else {
      voiceContent.value = ''
    }
  } catch (err) {
    console.error('提交失败:', err)
    error.value = '提交失败，请重试'
  } finally {
    isProcessing.value = false
  }
}

// 清除错误
const clearError = () => {
  error.value = ''
}

// 设置Qwen API密钥
const setQwenApiKey = (apiKey: string) => {
  qwenVoiceService.setApiKey(apiKey)
}

// 生命周期
onMounted(() => {
  initSpeechRecognition()
  
  // 从环境变量或配置中获取API密钥
  const apiKey = import.meta.env.VITE_QWEN_API_KEY || ''
  if (apiKey) {
    setQwenApiKey(apiKey)
  }
})

onUnmounted(() => {
  if (isRecording.value) {
    stopRecording()
  }
  
  if (realtimeWs) {
    realtimeWs.close()
  }
})
</script>

<style scoped>
.voice-input-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f9f9f9;
}

.input-mode-toggle {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.mode-btn:hover {
  background: #f0f0f0;
}

.mode-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.icon {
  width: 20px;
  height: 20px;
}

.text-input-section {
  margin-bottom: 20px;
}

.text-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  resize: vertical;
  font-family: inherit;
}

.voice-input-section {
  margin-bottom: 20px;
}

.voice-controls {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.record-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: 2px solid #dc3545;
  border-radius: 25px;
  background: white;
  color: #dc3545;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.record-btn:hover {
  background: #dc3545;
  color: white;
}

.record-btn.recording {
  background: #dc3545;
  color: white;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(220, 53, 69, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(220, 53, 69, 0);
  }
}

.recording-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #dc3545;
  font-weight: 500;
}

.wave-animation {
  width: 20px;
  height: 20px;
  border: 2px solid #dc3545;
  border-radius: 50%;
  animation: wave 1s infinite;
}

@keyframes wave {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.voice-result {
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-weight: 500;
}

.result-actions {
  display: flex;
  gap: 8px;
}

.edit-btn {
  padding: 4px 8px;
  border: 1px solid #007bff;
  border-radius: 4px;
  background: white;
  color: #007bff;
  cursor: pointer;
  font-size: 12px;
}

.edit-btn:hover {
  background: #007bff;
  color: white;
}

.clear-btn {
  padding: 4px 8px;
  border: 1px solid #dc3545;
  border-radius: 4px;
  background: white;
  color: #dc3545;
  cursor: pointer;
  font-size: 12px;
}

.clear-btn:hover {
  background: #dc3545;
  color: white;
}

.result-content {
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
  line-height: 1.5;
}

.edit-textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  resize: vertical;
}

.submit-section {
  text-align: right;
}

.submit-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  background: #28a745;
  color: white;
  cursor: pointer;
  transition: background 0.3s ease;
  font-weight: 500;
}

.submit-btn:hover:not(:disabled) {
  background: #218838;
}

.submit-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.error-message {
  margin-top: 15px;
  padding: 10px;
  border: 1px solid #dc3545;
  border-radius: 6px;
  background: #f8d7da;
  color: #721c24;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-btn {
  background: none;
  border: none;
  color: #721c24;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}
</style>