import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  getSessions, 
  createSession, 
  deleteSession, 
  getSessionMessages,
  updateSessionTitle 
} from '@/services/api'

// 本地定义类型以避免导入问题
interface Session {
  id: number
  session_id: string
  title: string
  created_at: string
  updated_at: string
}

interface Message {
  id: number
  session_id: string
  message_type: 'user' | 'assistant'
  content: string
  created_at: string
}

export const useSessionStore = defineStore('session', () => {
  // 状态
  const sessions = ref<Session[]>([])
  const currentSessionId = ref<string | null>(null)
  const currentMessages = ref<Message[]>([])
  const isLoading = ref(false)

  // 计算属性
  const currentSession = computed(() => {
    if (!currentSessionId.value) return null
    return sessions.value.find(s => s.session_id === currentSessionId.value) || null
  })

  const hasSessions = computed(() => sessions.value.length > 0)

  // 方法
  const loadSessions = async () => {
    try {
      isLoading.value = true
      sessions.value = await getSessions()
    } catch (error) {
      console.error('加载会话列表失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const createNewSession = async (title?: string) => {
    try {
      isLoading.value = true
      const newSession = await createSession(title)
      sessions.value.unshift(newSession)
      currentSessionId.value = newSession.session_id
      currentMessages.value = []
      return newSession
    } catch (error) {
      console.error('创建新会话失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const switchToSession = async (sessionId: string) => {
    try {
      isLoading.value = true
      currentSessionId.value = sessionId
      
      // 加载会话消息
      const messages = await getSessionMessages(sessionId)
      currentMessages.value = messages
    } catch (error) {
      console.error('切换会话失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const removeSession = async (sessionId: string) => {
    try {
      isLoading.value = true
      await deleteSession(sessionId)
      
      // 从列表中移除
      sessions.value = sessions.value.filter(s => s.session_id !== sessionId)
      
      // 如果删除的是当前会话，清空当前状态
      if (currentSessionId.value === sessionId) {
        currentSessionId.value = null
        currentMessages.value = []
      }
    } catch (error) {
      console.error('删除会话失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const updateTitle = async (sessionId: string, title: string) => {
    try {
      await updateSessionTitle(sessionId, title)
      
      // 更新本地状态
      const session = sessions.value.find(s => s.session_id === sessionId)
      if (session) {
        session.title = title
      }
    } catch (error) {
      console.error('更新会话标题失败:', error)
      throw error
    }
  }

  const addMessage = (message: Message) => {
    if (message.session_id === currentSessionId.value) {
      currentMessages.value.push(message)
    }
  }

  const clearCurrentSession = () => {
    currentSessionId.value = null
    currentMessages.value = []
  }

  const refreshSessions = async () => {
    await loadSessions()
    if (currentSessionId.value) {
      await switchToSession(currentSessionId.value)
    }
  }

  return {
    // 状态
    sessions,
    currentSessionId,
    currentMessages,
    isLoading,
    
    // 计算属性
    currentSession,
    hasSessions,
    
    // 方法
    loadSessions,
    createNewSession,
    switchToSession,
    removeSession,
    updateTitle,
    addMessage,
    clearCurrentSession,
    refreshSessions
  }
})