<template>
  <div class="chat-interface">
    <!-- 会话列表侧边栏 -->
    <div class="session-sidebar" :class="{ 'show': showSessionList }">
      <div class="sidebar-header">
        <h3>会话列表</h3>
        <button class="close-sidebar" @click="showSessionList = false">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="sidebar-content">
        <button class="new-session-btn" @click="createNewSession">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          新建会话
        </button>
        
        <div class="session-list">
          <div 
            v-for="session in sessionStore.sessions" 
            :key="session.session_id"
            class="session-item"
            :class="{ 'active': session.session_id === sessionStore.currentSessionId }"
            @click="switchToSession(session.session_id)"
          >
            <div class="session-info">
              <div class="session-title">{{ session.title }}</div>
              <div class="session-time">{{ formatDate(session.updated_at) }}</div>
            </div>
            <button 
              class="delete-session-btn"
              @click="deleteSession(session.session_id, $event)"
              title="删除会话"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <header class="chat-header">
        <div class="header-left">
          <button class="header-button menu-btn" @click="showSessionList = true" title="会话列表">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div class="logo">
            <span class="logo-icon">🤖</span>
            <span class="logo-text">技术专家助手</span>
          </div>
          <div v-if="sessionStore.currentSession" class="current-session-title">
            {{ sessionStore.currentSession.title }}
          </div>
        </div>
        <div class="header-right">
          <button class="header-button" title="新建对话" @click="createNewSession">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          
          
          
          <div class="renderer-selector" style="display: none;">
            <button 
              class="header-button" 
              :class="{ active: rendererType === 'marked' }"
              @click="rendererType = 'marked'"
              title="使用Marked渲染器"
            >
              Marked
            </button>
            <button 
              class="header-button" 
              :class="{ active: rendererType === 'markdown-it' }"
              @click="rendererType = 'markdown-it'"
              title="使用Markdown-it渲染器"
            >
              MD-it
            </button>
            <button 
              class="header-button" 
              :class="{ active: rendererType === 'comparison' }"
              @click="rendererType = 'comparison'"
              title="对比两种渲染器"
            >
              对比
            </button>
          </div>
          <button class="header-button" title="设置">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m4.22-13.22l4.24 4.24M1.54 8.04l4.24 4.24m12.44 0l4.24 4.24M1.54 15.96l4.24-4.24"></path>
            </svg>
          </button>
        </div>
      </header>

    <div class="chat-container">
        <!-- 右侧浮动的问题导航气泡 -->
        <div 
          class="floating-questions-nav"
          :style="{ top: navPosition + '%' }"
        >
          <button 
            class="questions-nav-button"
            @mouseenter="showQuestionsList = true"
            @mousedown="handleMouseDown"
            :class="{ dragging: isDragging }"
            title="查看问题列表（可拖动调整位置）"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
            <span class="questions-count">{{ getUserQuestions().length }}</span>
          </button>
          
          <!-- 问题列表弹窗 -->
          <div 
            v-if="showQuestionsList"
            class="questions-popup"
            @mouseenter="showQuestionsList = true"
            @mouseleave="showQuestionsList = false"
          >
            <div class="questions-popup-header">
              <span>问题列表</span>
              <span class="questions-count">{{ getUserQuestions().length }} 个问题</span>
            </div>
            <div class="questions-list">
              <div 
                v-for="(question, index) in getUserQuestions()" 
                :key="question.id"
                class="question-item"
                @click="scrollToQuestion(question.index)"
              >
                <span class="question-number">{{ index + 1 }}</span>
                <span class="question-text">{{ question.text }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="chat-messages" ref="messagesContainer">
        <div v-if="messages.length === 0" class="welcome-screen">
          <div class="welcome-content">
            <div class="welcome-logo">
              <span class="welcome-icon">🤖</span>
            </div>
            <h2 class="welcome-title">欢迎使用技术专家助手</h2>
            <p class="welcome-subtitle">基于Ollama的智能技术问答系统</p>
            <div class="suggested-prompts">
              <div class="prompt-suggestions">
                <button 
                  v-for="(prompt, index) in suggestedPrompts" 
                  :key="index"
                  class="prompt-button"
                  @click="usePrompt(prompt)"
                >
                  {{ prompt }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          v-for="(message, index) in messages"
          :key="index"
          :class="['message', message.type]"
        >
          <div class="message-avatar">
            <div v-if="message.type === 'user'" class="user-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div v-else class="assistant-avatar">
              <span class="avatar-icon">🤖</span>
            </div>
          </div>
          <div class="message-content">
            <div class="message-text" v-if="message.type === 'user'">
              <div class="user-message-bubble">{{ message.text }}</div>
            </div>
            <div class="message-text" v-else>
              <MarkedRenderer v-if="rendererType === 'marked'" :content="message.text" />
              <MarkdownItRenderer v-else-if="rendererType === 'markdown-it'" :content="message.text" />
              <MarkdownComparison v-else-if="rendererType === 'comparison'" :content="message.text" />
              <MarkdownRenderer v-else :content="message.text" />
              
              <!-- 助手消息工具栏 -->
              <div class="message-toolbar">
                <button 
                  class="toolbar-button"
                  @click="copyMessage(message.text)"
                  title="复制消息"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>复制</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        
      </div>

      <div class="chat-input-container">
        <div class="input-wrapper">
          <div class="input-container">
            <textarea
              v-model="currentMessage"
              @keydown="handleEnterKey"
              placeholder="输入消息..."
              rows="1"
              :disabled="isLoading"
              class="message-input"
              ref="messageInput"
            ></textarea>
            <div class="input-actions">
              <input
                ref="fileInputRef"
                type="file"
                multiple
                @change="handleFileSelect"
                style="display: none"
                accept=".txt,.md,.json,.csv,.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.svg"
              />
              <button class="action-button" title="附件" @click="fileInputRef?.click()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                </svg>
              </button>
              <button
                @click="sendMessage"
                :disabled="isLoading || (!currentMessage.trim() && attachedFiles.length === 0)"
                class="send-button"
                title="发送消息 (Enter)"
              >
                <svg v-if="!isLoading" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                <div v-else class="loading-spinner">
                  <div class="spinner"></div>
                </div>
              </button>
            </div>
          </div>
          <!-- 附件预览区域 -->
        <div v-if="attachedFiles.length > 0" class="attached-files">
          <div class="files-header">
            <span>附件 ({{ attachedFiles.length }})</span>
            <button class="clear-files" @click="clearFiles">清除全部</button>
          </div>
          <div class="files-list">
            <div v-for="(file, index) in attachedFiles" :key="index" class="file-item">
              <div class="file-info">
                <span class="file-icon">{{ getFileIcon(file.name) }}</span>
                <span class="file-name">{{ file.name }}</span>
                <span class="file-size">{{ formatFileSize(file.size) }}</span>
              </div>
              <button class="remove-file" @click="removeFile(index)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <div class="input-info">
          <span class="input-hint">Enter 发送，Shift + Enter 换行</span>
          <div v-if="isLoading" class="global-loading">
            <div class="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span>正在思考...</span>
          </div>
        </div>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, watch } from 'vue'
import { askQuestionStream } from '@/services/api'
import { ErrorHandler } from '@/utils/errorHandler'
import { useSessionStore } from '@/stores/session'
import MarkdownRenderer from './MarkdownRenderer.vue'
import MarkedRenderer from './MarkedRenderer.vue'
import MarkdownItRenderer from './MarkdownItRenderer.vue'
import MarkdownComparison from './MarkdownComparison.vue'

interface Message {
  type: 'user' | 'assistant'
  text: string
  timestamp: Date
}

const messages = ref<Message[]>([])
const currentMessage = ref('')
const isLoading = ref(false)
const messagesContainer = ref<HTMLElement>()
const messageInput = ref<HTMLTextAreaElement>()
const sessionStore = useSessionStore()

// 附件相关状态
const attachedFiles = ref<File[]>([])
const fileInputRef = ref<HTMLInputElement>()

// 问题导航相关状态
const showQuestionsList = ref(false)
const questionsListPosition = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const dragStartY = ref(0)
const navPosition = ref(50) // 百分比位置

// 监听输入内容变化，自动调整高度
watch(currentMessage, () => {
  nextTick(() => {
    adjustTextareaHeight()
  })
})

// 会话列表显示状态
const showSessionList = ref(false)

// 渲染器类型选择
const rendererType = ref<'marked' | 'markdown-it' | 'comparison'>('markdown-it')

// 监听当前会话变化，加载历史消息
watch(() => sessionStore.currentSessionId, async (newSessionId) => {
  if (newSessionId) {
    // 将数据库消息转换为前端消息格式
    messages.value = sessionStore.currentMessages.map(msg => ({
      type: msg.message_type,
      text: msg.content,
      timestamp: new Date(msg.created_at)
    }))
    nextTick(() => scrollToBottom())
  } else {
    messages.value = []
  }
}, { immediate: true })

// 监听会话消息变化，实时更新界面
watch(() => sessionStore.currentMessages, (newMessages) => {
  if (sessionStore.currentSessionId) {
    messages.value = newMessages.map(msg => ({
      type: msg.message_type,
      text: msg.content,
      timestamp: new Date(msg.created_at)
    }))
    nextTick(() => scrollToBottom())
  }
}, { deep: true })

const suggestedPrompts = ref([
  '如何优化React应用性能？',
  '解释一下微服务架构的优势',
  'Python中如何处理异常？',
  '什么是CI/CD流程？'
])

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}



const handleEnterKey = (event: KeyboardEvent) => {
  // 只处理Enter键
  if (event.key !== 'Enter') {
    return
  }
  
  if (event.shiftKey) {
    // 允许换行，不阻止默认行为
    return
  }
  
  // 阻止默认换行行为并发送消息
  event.preventDefault()
  sendMessage()
}

const sendMessage = async () => {
  if ((!currentMessage.value.trim() && attachedFiles.value.length === 0) || isLoading.value) return

  // 构建用户消息文本，包含附件信息
  let messageText = currentMessage.value.trim()
  if (attachedFiles.value.length > 0) {
    const fileNames = attachedFiles.value.map(file => file.name).join(', ')
    messageText = messageText ? `${messageText}\n\n附件: ${fileNames}` : `附件: ${fileNames}`
  }

  // 判断是否需要创建新会话
  const isNewSession = !sessionStore.currentSessionId
  
  // 如果没有当前会话，创建一个新会话并传入第一条消息作为标题
  if (isNewSession) {
    try {
      await sessionStore.createNewSession(undefined, messageText)
    } catch (error) {
      console.error('创建会话失败:', error)
      return
    }
  }

  const userMessage: Message = {
    type: 'user',
    text: messageText,
    timestamp: new Date()
  }

  messages.value.push(userMessage)
  const question = currentMessage.value.trim()
  currentMessage.value = ''
  attachedFiles.value = []
  isLoading.value = true
  scrollToBottom()

  // 重置输入框高度
  if (messageInput.value) {
    messageInput.value.style.height = 'auto'
  }

  try {
    let isFirstChunk = true
    await askQuestionStream(question, (chunk: string) => {
      // 如果是第一个数据块，先停止loading，创建助手消息
      if (isFirstChunk) {
        isLoading.value = false
        const assistantMessage: Message = {
          type: 'assistant',
          text: chunk,
          timestamp: new Date()
        }
        messages.value.push(assistantMessage)
        isFirstChunk = false
      } else {
        // 更新最后一条助手消息的内容
        const lastMessage = messages.value[messages.value.length - 1]
        if (lastMessage && lastMessage.type === 'assistant') {
          lastMessage.text += chunk
        }
      }
      scrollToBottom()
    }, undefined, sessionStore.currentSessionId || undefined)
  } catch (error) {
    console.error('发送消息失败:', error)
    const appError = ErrorHandler.handle(error)
    const userFriendlyMessage = ErrorHandler.getUserFriendlyMessage(appError)
    
    // 停止loading并添加错误消息
    isLoading.value = false
    const errorMessage: Message = {
      type: 'assistant',
      text: userFriendlyMessage,
      timestamp: new Date()
    }
    messages.value.push(errorMessage)
    scrollToBottom()
  }
}

const createNewSession = async () => {
  try {
    await sessionStore.createNewSession()
    showSessionList.value = false
  } catch (error) {
    console.error('创建新会话失败:', error)
  }
}

const switchToSession = async (sessionId: string) => {
  try {
    await sessionStore.switchToSession(sessionId)
    showSessionList.value = false
  } catch (error) {
    console.error('切换会话失败:', error)
  }
}

const deleteSession = async (sessionId: string, event: Event) => {
  event.stopPropagation()
  
  if (confirm('确定要删除这个会话吗？')) {
    try {
      await sessionStore.removeSession(sessionId)
    } catch (error) {
      console.error('删除会话失败:', error)
    }
  }
}

const usePrompt = (prompt: string) => {
  currentMessage.value = prompt
  if (messageInput.value) {
    messageInput.value.focus()
  }
}

// 附件相关函数
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    attachedFiles.value = [...attachedFiles.value, ...Array.from(target.files)]
  }
  // 清空input值，以便可以重复选择同一个文件
  target.value = ''
}

const removeFile = (index: number) => {
  attachedFiles.value.splice(index, 1)
}

const clearFiles = () => {
  attachedFiles.value = []
}

const getFileIcon = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const iconMap: Record<string, string> = {
    'txt': '📄',
    'md': '📝',
    'json': '📋',
    'csv': '📊',
    'pdf': '📕',
    'doc': '📘',
    'docx': '📘',
    'xls': '📗',
    'xlsx': '📗',
    'png': '🖼️',
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'gif': '🖼️',
    'svg': '🎨'
  }
  return iconMap[ext || ''] || '📎'
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 自动调整输入框高度
const adjustTextareaHeight = () => {
  if (messageInput.value) {
    messageInput.value.style.height = 'auto'
    messageInput.value.style.height = Math.min(messageInput.value.scrollHeight, 120) + 'px'
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) {
    return '今天'
  } else if (diffDays === 2) {
    return '昨天'
  } else if (diffDays <= 7) {
    return `${diffDays - 1}天前`
  } else {
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    })
  }
}

// 复制消息功能
const copyMessage = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    // 可以添加一个临时提示，这里暂时用console
    console.log('消息已复制到剪贴板')
  } catch (err) {
    console.error('复制失败:', err)
    // 降级方案：创建临时文本区域
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      console.log('消息已复制到剪贴板')
    } catch (fallbackErr) {
      console.error('复制失败:', fallbackErr)
    }
    document.body.removeChild(textArea)
  }
}

// 获取当前会话的所有用户问题
const getUserQuestions = () => {
  return messages.value
    .filter(msg => msg.type === 'user')
    .map((msg, index) => ({
      id: `question-${index}`,
      text: msg.text,
      index: index
    }))
}

// 显示问题列表
const showQuestionsPopup = (event: MouseEvent) => {
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  questionsListPosition.value = {
    x: rect.left - 200, // 显示在气泡左侧
    y: rect.top
  }
  showQuestionsList.value = true
}

// 滚动到指定问题
const scrollToQuestion = (messageIndex: number) => {
  showQuestionsList.value = false
  const messageElements = document.querySelectorAll('.message.user')
  if (messageElements[messageIndex]) {
    messageElements[messageIndex].scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })
    
    // 添加高亮效果
    const element = messageElements[messageIndex] as HTMLElement
    element.style.transition = 'background-color 0.3s ease'
    element.style.backgroundColor = '#fef3c7'
    setTimeout(() => {
      element.style.backgroundColor = ''
    }, 2000)
  }
}

// 拖动相关函数
const handleMouseDown = (event: MouseEvent) => {
  isDragging.value = true
  dragStartY.value = event.clientY - (navPosition.value * window.innerHeight / 100)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  event.preventDefault()
}

const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging.value) return
  
  const newY = event.clientY - dragStartY.value
  const percentage = (newY / window.innerHeight) * 100
  
  // 限制在屏幕范围内
  if (percentage >= 10 && percentage <= 90) {
    navPosition.value = percentage
  }
}

const handleMouseUp = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

onMounted(async () => {
  try {
    await sessionStore.loadSessions()
  } catch (error) {
    console.error('初始化会话失败:', error)
  }
})
</script>

<style scoped>
.chat-interface {
  display: flex;
  height: 100vh;
  background: #ffffff;
}

.session-sidebar {
  width: 280px;
  height: 100vh;
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  z-index: 1000;
}

.session-sidebar.show {
  transform: translateX(0);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.close-sidebar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.close-sidebar:hover {
  background: #e5e7eb;
  color: #374151;
}

.sidebar-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.new-session-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #374151;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 16px;
}

.new-session-btn:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.session-item:hover {
  background: #e5e7eb;
}

.session-item.active {
  background: #dbeafe;
  color: #1d4ed8;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-title {
  font-size: 14px;
  font-weight: 500;
  color: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.session-time {
  font-size: 12px;
  color: #9ca3af;
}

.delete-session-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  opacity: 0;
}

.session-item:hover .delete-session-btn {
  opacity: 1;
}

.delete-session-btn:hover {
  background: #ef4444;
  color: white;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 0;
  transition: margin-left 0.3s ease;
}

.session-sidebar.show ~ .main-content {
  margin-left: 280px;
}

@media (max-width: 768px) {
  .session-sidebar {
    width: 100%;
    max-width: 320px;
  }
  
  .session-sidebar.show ~ .main-content {
    margin-left: 0;
  }
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.menu-btn {
  display: none;
}

@media (max-width: 768px) {
  .menu-btn {
    display: flex;
  }
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.current-session-title {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.header-right {
  display: flex;
  gap: 8px;
}

.header-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.header-button:hover {
  background: #f3f4f6;
  color: #374151;
}

.header-button.active {
  background: #3b82f6;
  color: white;
}

.renderer-selector {
  display: flex;
  gap: 4px;
  background: #f3f4f6;
  border-radius: 6px;
  padding: 2px;
}

.renderer-selector .header-button {
  font-size: 12px;
  padding: 6px 8px;
  min-width: auto;
}

.renderer-selector .header-button.active {
  background: white;
  color: #3b82f6;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  background: #ffffff;
}

.welcome-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 20px;
}

.welcome-content {
  text-align: center;
  max-width: 600px;
}

.welcome-logo {
  margin-bottom: 24px;
}

.welcome-icon {
  font-size: 64px;
  display: inline-block;
}

.welcome-title {
  font-size: 28px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8px;
}

.welcome-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin-bottom: 32px;
}

.suggested-prompts {
  margin-top: 32px;
}

.prompt-suggestions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.prompt-button {
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  color: #374151;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.prompt-button:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.message {
  display: flex;
  gap: 16px;
  padding: 24px;
  border-bottom: 1px solid #f3f4f6;
  animation: fadeIn 0.3s ease-out;
}

.message:last-child {
  border-bottom: none;
}

.message.user {
  flex-direction: row-reverse;
}

.message.user .message-content {
  text-align: left;
}

.message-avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar {
  background: #e5e7eb;
  color: #6b7280;
}

.assistant-avatar {
  background: #f3f4f6;
}

.avatar-icon {
  font-size: 18px;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-text {
  color: #1f2937;
  line-height: 1.3;
  white-space: pre-wrap;
  word-break: break-word;
  margin-bottom: 8px;
}

.user-message-bubble {
  background: #3b82f6;
  color: white;
  padding: 12px 16px;
  border-radius: 18px 0 18px 18px;
  /* display: inline-block; */
  max-width: calc(100% - 88px);
  word-wrap: break-word;
  float: right;
  clear: both;
}

/* 消息工具栏样式 */
.message-toolbar {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid #f3f4f6;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.message:hover .message-toolbar {
  opacity: 1;
}

.toolbar-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  color: #6b7280;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toolbar-button:hover {
  border-color: #d1d5db;
  background: #f9fafb;
  color: #374151;
}

.toolbar-button svg {
  flex-shrink: 0;
}

/* 右侧浮动问题导航样式 */
.floating-questions-nav {
  position: fixed;
  right: 20px;
  z-index: 100;
  transition: top 0.1s ease;
}

.questions-nav-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  padding: 4px;
}

.questions-nav-button:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.questions-nav-button.dragging {
  cursor: grabbing;
  background: #f3f4f6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.questions-count {
  font-size: 10px;
  font-weight: 600;
  color: #6b7280;
  margin-top: 2px;
}

.questions-popup {
  position: absolute;
  width: 300px;
  max-height: 400px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  overflow: hidden;
  right: 40px;
  top: 0;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, visibility 0.2s ease;
}

.floating-questions-nav:hover .questions-popup {
  opacity: 1;
  visibility: visible;
}

.questions-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.questions-count {
  font-size: 12px;
  color: #6b7280;
  font-weight: normal;
}

.questions-list {
  max-height: 350px;
  overflow-y: auto;
}

.question-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #f3f4f6;
}

.question-item:hover {
  background: #f9fafb;
}

.question-item:last-child {
  border-bottom: none;
}

.question-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  min-width: 20px;
  background: #e5e7eb;
  color: #6b7280;
  font-size: 11px;
  font-weight: 600;
  border-radius: 50%;
  flex-shrink: 0;
}

.question-text {
  font-size: 13px;
  color: #374151;
  line-height: 1.4;
  word-break: break-word;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 问题列表滚动条样式 */
.questions-list::-webkit-scrollbar {
  width: 6px;
}

.questions-list::-webkit-scrollbar-track {
  background: #f9fafb;
}

.questions-list::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.questions-list::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}



.message-text :deep(blockquote) {
  border-left: 4px solid #e5e7eb;
  padding-left: 16px;
  margin: 8px 0;
  color: #6b7280;
}





@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-input-container {
  border-top: 1px solid #e5e7eb;
  background: #ffffff;
  padding: 16px 24px;
}

.input-wrapper {
  max-width: 800px;
  margin: 0 auto;
}

.input-container {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px 16px;
  transition: all 0.2s ease;
}

.input-container:focus-within {
  border-color: #3b82f6;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.message-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #1f2937;
  resize: none;
  outline: none;
  min-height: 24px;
  max-height: 120px;
  overflow-y: auto;
  transition: height 0.2s ease;
}

.message-input::placeholder {
  color: #9ca3af;
}

.message-input:disabled {
  cursor: not-allowed;
}

.input-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button:hover {
  background: #e5e7eb;
  color: #374151;
}

.send-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: #3b82f6;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.send-button:hover:not(:disabled) {
  background: #2563eb;
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.input-info {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.input-hint {
  font-size: 12px;
  color: #9ca3af;
}

.global-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #6b7280;
}

.loading-dots {
  display: flex;
  gap: 4px;
}

.loading-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9ca3af;
  animation: typing 1.4s infinite ease-in-out;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

/* 滚动条样式 */
.chat-messages {
  scrollbar-width: thin;
  scrollbar-color: #e5e7eb transparent;
}

.chat-messages::-webkit-scrollbar {
  width: 8px;
  display: block;
}

.chat-messages::-webkit-scrollbar-track {
  background: #f9fafb;
  border-radius: 4px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.chat-messages::-webkit-scrollbar-corner {
  background: #f9fafb;
}

.message-input {
  scrollbar-width: thin;
  scrollbar-color: #e5e7eb transparent;
}

.message-input::-webkit-scrollbar {
  width: 6px;
  display: block;
}

.message-input::-webkit-scrollbar-track {
  background: #f9fafb;
  border-radius: 3px;
}

.message-input::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.message-input::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* 附件样式 */
.attached-files {
  margin-top: 12px;
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.files-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
  color: #6b7280;
}

.clear-files {
  background: transparent;
  border: none;
  color: #ef4444;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.clear-files:hover {
  background: #fee2e2;
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.file-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.file-name {
  font-size: 14px;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.file-size {
  font-size: 12px;
  color: #9ca3af;
  flex-shrink: 0;
}

.remove-file {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.remove-file:hover {
  background: #ef4444;
  color: white;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-header {
    padding: 12px 16px;
  }

  .message {
    padding: 16px;
  }

  .chat-input-container {
    padding: 12px 16px;
  }

  .welcome-title {
    font-size: 24px;
  }

  .prompt-suggestions {
    grid-template-columns: 1fr;
  }
}
</style>