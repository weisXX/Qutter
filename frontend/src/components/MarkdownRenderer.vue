<template>
  <div class="markdown-content" v-html="renderedContent"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'

interface Props {
  content: string
}

const props = defineProps<Props>()

// 配置marked选项
marked.setOptions({
  highlight: (code: string, lang: string) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value
      } catch (err) {
        console.warn('代码高亮失败:', err)
      }
    }
    return hljs.highlightAuto(code).value
  },
  breaks: true, // 支持换行
  gfm: true, // GitHub风格markdown
})

const renderedContent = computed(() => {
  if (!props.content) return ''
  return marked(props.content)
})
</script>

<style scoped>
.markdown-content {
  line-height: 1.3;
  color: #1f2937;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin: 0.8em 0 0.3em 0;
  font-weight: 600;
  color: #1f2937;
}

.markdown-content :deep(h1) { font-size: 1.6em; }
.markdown-content :deep(h2) { font-size: 1.4em; }
.markdown-content :deep(h3) { font-size: 1.2em; }
.markdown-content :deep(h4) { font-size: 1.1em; }

.markdown-content :deep(p) {
  margin: 0.3em 0;
  line-height: 1.3;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 0.3em 0;
  padding-left: 1.5em;
}

.markdown-content :deep(li) {
  margin: 0.1em 0;
  line-height: 1.3;
}

.markdown-content :deep(code) {
  background-color: #f1f5f9;
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.85em;
  color: #dc2626;
}

.markdown-content :deep(pre) {
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 12px;
  overflow-x: auto;
  margin: 0.8em 0;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  color: #e2e8f0;
  font-size: 0.85em;
  line-height: 1.4;
}

/* 代码高亮样式 - 深色主题 */
.markdown-content :deep(.hljs) {
  background: #1e293b;
  color: #e2e8f0;
}

.markdown-content :deep(.hljs-comment),
.markdown-content :deep(.hljs-quote) {
  color: #94a3b8;
  font-style: italic;
}

.markdown-content :deep(.hljs-keyword),
.markdown-content :deep(.hljs-selector-tag),
.markdown-content :deep(.hljs-subst) {
  color: #f472b6;
}

.markdown-content :deep(.hljs-number),
.markdown-content :deep(.hljs-literal),
.markdown-content :deep(.hljs-variable),
.markdown-content :deep(.hljs-template-variable),
.markdown-content :deep(.hljs-tag .hljs-attr) {
  color: #60a5fa;
}

.markdown-content :deep(.hljs-string),
.markdown-content :deep(.hljs-doctag) {
  color: #4ade80;
}

.markdown-content :deep(.hljs-title),
.markdown-content :deep(.hljs-section),
.markdown-content :deep(.hljs-selector-id) {
  color: #a78bfa;
  font-weight: bold;
}

.markdown-content :deep(.hljs-type),
.markdown-content :deep(.hljs-class .hljs-title) {
  color: #a78bfa;
}

.markdown-content :deep(.hljs-tag),
.markdown-content :deep(.hljs-name),
.markdown-content :deep(.hljs-attribute) {
  color: #34d399;
  font-weight: normal;
}

.markdown-content :deep(.hljs-regexp),
.markdown-content :deep(.hljs-link) {
  color: #fbbf24;
}

.markdown-content :deep(.hljs-symbol),
.markdown-content :deep(.hljs-bullet) {
  color: #60a5fa;
}

.markdown-content :deep(.hljs-built_in),
.markdown-content :deep(.hljs-builtin-name) {
  color: #60a5fa;
}

.markdown-content :deep(.hljs-meta) {
  color: #34d399;
}

.markdown-content :deep(.hljs-deletion) {
  background: #7f1d1d;
  color: #fecaca;
}

.markdown-content :deep(.hljs-addition) {
  background: #14532d;
  color: #bbf7d0;
}

.markdown-content :deep(.hljs-emphasis) {
  font-style: italic;
}

.markdown-content :deep(.hljs-strong) {
  font-weight: bold;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid #e2e8f0;
  padding: 0 12px;
  margin: 0.5em 0;
  color: #64748b;
  background: #f8fafc;
  border-radius: 0 4px 4px 0;
}

.markdown-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.8em 0;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid #e2e8f0;
  padding: 6px 10px;
  text-align: left;
}

.markdown-content :deep(th) {
  background-color: #f1f5f9;
  font-weight: 600;
  color: #1e293b;
}

.markdown-content :deep(a) {
  color: #3b82f6;
  text-decoration: none;
}

.markdown-content :deep(a:hover) {
  text-decoration: underline;
  color: #2563eb;
}

.markdown-content :deep(hr) {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 1.5em 0;
}

.markdown-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 0.5em 0;
}
</style>