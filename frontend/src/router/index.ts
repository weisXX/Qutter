import { createRouter, createWebHistory } from 'vue-router'
import ChatInterface from '../components/ChatInterface.vue'
import MathComparison from '../components/MathComparison.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'chat',
      component: ChatInterface,
    },
    {
      path: '/math-comparison',
      name: 'math-comparison',
      component: MathComparison,
    },
  ],
})

export default router
