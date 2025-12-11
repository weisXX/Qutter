<template>
  <div class="chat-container">
    <div class="chat-messages" ref="messagesContainer">
      <div
        v-for="(message, index) in messages"
        :key="index"
        :class="['message', message.type]"
      >
        <div class="message-content">
          <div class="message-text" v-if="message.type === 'user'">{{ message.text }}</div>
          <div class="message-text" v-else>
            <MarkdownRenderer :content="message.text" />
          </div>
          <div class="message-time">{{ formatTime(message.timestamp) }}</div>
        </div>
      </div>
      <div v-if="isLoading" class="message assistant">
        <div class="message-content">
          <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>

    <div class="chat-input-container">
      <div class="input-group">
        <textarea
          v-model="currentMessage"
          @keydown.enter.prevent="sendMessage"
          placeholder="请输入您的技术问题..."
          rows="3"
          :disabled="isLoading"
          class="message-input"
        ></textarea>
        <button
          @click="sendMessage"
          :disabled="isLoading || !currentMessage.trim()"
          class="send-button"
        >
          <span v-if="!isLoading">发送</span>
          <span v-else>思考中...</span>
        </button>
      </div>
      <div class="input-info">
        <small>按 Enter 发送，Shift+Enter 换行</small>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { askQuestionStream } from '@/services/api'
import { ErrorHandler } from '@/utils/errorHandler'
import MarkdownRenderer from './MarkdownRenderer.vue'

interface Message {
  type: 'user' | 'assistant'
  text: string
  timestamp: Date
}

const messages = ref<Message[]>([])
const currentMessage = ref('')
const isLoading = ref(false)
const messagesContainer = ref<HTMLElement>()

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const sendMessage = async () => {
  if (!currentMessage.value.trim() || isLoading.value) return

  const userMessage: Message = {
    type: 'user',
    text: currentMessage.value.trim(),
    timestamp: new Date()
  }

  messages.value.push(userMessage)
  const question = currentMessage.value.trim()
  currentMessage.value = ''
  isLoading.value = true
  scrollToBottom()

  // 创建空的助手消息用于流式更新
  const assistantMessage: Message = {
    type: 'assistant',
    text: '',
    timestamp: new Date()
  }
  messages.value.push(assistantMessage)
  scrollToBottom()

  try {
    await askQuestionStream(question, (chunk: string) => {
      // 更新最后一条助手消息的内容
      const lastMessage = messages.value[messages.value.length - 1]
      if (lastMessage && lastMessage.type === 'assistant') {
        lastMessage.text += chunk
        scrollToBottom()
      }
    })
  } catch (error) {
    console.error('发送消息失败:', error)
    const appError = ErrorHandler.handle(error)
    const userFriendlyMessage = ErrorHandler.getUserFriendlyMessage(appError)
    
    // 替换流式消息为错误消息
    const lastMessage = messages.value[messages.value.length - 1]
    if (lastMessage && lastMessage.type === 'assistant') {
      lastMessage.text = userFriendlyMessage
    }
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

onMounted(() => {
  const welcomeMessage: Message = {
    type: 'assistant',
    text: '👋 您好！我是技术专家助手，可以为您解答各种技术问题。请问有什么可以帮助您的吗？',
    timestamp: new Date()
  }
  messages.value.push(welcomeMessage)
})
</script>

<style scoped>
.chat-container {
  width: 100%;
  max-width: 800px;
  height: 600px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  background: #f8f9fa;
}

.message {
  margin-bottom: 1.5rem;
  display: flex;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.message-content {
  max-width: 70%;
  padding: 1rem 1.25rem;
  border-radius: 18px;
  position: relative;
}

.message.user .message-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 6px;
}

.message.assistant .message-content {
  background: white;
  color: #333;
  border: 1px solid #e9ecef;
  border-bottom-left-radius: 6px;
}

.message-text {
  margin-bottom: 0.5rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.message-time {
  font-size: 0.75rem;
  opacity: 0.7;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 8px 0;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #667eea;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
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

.chat-input-container {
  padding: 1.5rem;
  background: white;
  border-top: 1px solid #e9ecef;
}

.input-group {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
}

.message-input {
  flex: 1;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  resize: none;
  outline: none;
  transition: border-color 0.3s ease;
}

.message-input:focus {
  border-color: #667eea;
}

.message-input:disabled {
  background: #f8f9fa;
  cursor: not-allowed;
}

.send-button {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.send-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.send-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.input-info {
  margin-top: 0.5rem;
  text-align: center;
}

.input-info small {
  color: #6c757d;
}

@media (max-width: 768px) {
  .chat-container {
    height: 500px;
    margin: 0 1rem;
  }
  
  .message-content {
    max-width: 85%;
  }
  
  .input-group {
    flex-direction: column;
    align-items: stretch;
  }
  
  .send-button {
    width: 100%;
  }
}
</style>