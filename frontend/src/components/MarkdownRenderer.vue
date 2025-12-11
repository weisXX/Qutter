<template>
  <div class="markdown-content" v-html="renderedContent"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'

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
  line-height: 1.6;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin: 1.5em 0 0.5em 0;
  font-weight: 600;
  color: #000000;
}

.markdown-content :deep(h1) { font-size: 1.8em; }
.markdown-content :deep(h2) { font-size: 1.5em; }
.markdown-content :deep(h3) { font-size: 1.3em; }
.markdown-content :deep(h4) { font-size: 1.1em; }

.markdown-content :deep(p) {
  margin: 0.8em 0;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 0.8em 0;
  padding-left: 2em;
}

.markdown-content :deep(li) {
  margin: 0.3em 0;
}

.markdown-content :deep(code) {
  background-color: #f1f3f4;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  color: #d73a49;
}

.markdown-content :deep(pre) {
  background-color: #f6f8fa;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  padding: 16px;
  overflow-x: auto;
  margin: 1em 0;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  color: #24292f;
  font-size: 0.85em;
}

/* 代码高亮样式 */
.markdown-content :deep(.hljs) {
  background: #f6f8fa;
  color: #24292f;
}

.markdown-content :deep(.hljs-comment),
.markdown-content :deep(.hljs-quote) {
  color: #6a737d;
  font-style: italic;
}

.markdown-content :deep(.hljs-keyword),
.markdown-content :deep(.hljs-selector-tag),
.markdown-content :deep(.hljs-subst) {
  color: #d73a49;
}

.markdown-content :deep(.hljs-number),
.markdown-content :deep(.hljs-literal),
.markdown-content :deep(.hljs-variable),
.markdown-content :deep(.hljs-template-variable),
.markdown-content :deep(.hljs-tag .hljs-attr) {
  color: #005cc5;
}

.markdown-content :deep(.hljs-string),
.markdown-content :deep(.hljs-doctag) {
  color: #032f62;
}

.markdown-content :deep(.hljs-title),
.markdown-content :deep(.hljs-section),
.markdown-content :deep(.hljs-selector-id) {
  color: #6f42c1;
  font-weight: bold;
}

.markdown-content :deep(.hljs-type),
.markdown-content :deep(.hljs-class .hljs-title) {
  color: #6f42c1;
}

.markdown-content :deep(.hljs-tag),
.markdown-content :deep(.hljs-name),
.markdown-content :deep(.hljs-attribute) {
  color: #22863a;
  font-weight: normal;
}

.markdown-content :deep(.hljs-regexp),
.markdown-content :deep(.hljs-link) {
  color: #e36209;
}

.markdown-content :deep(.hljs-symbol),
.markdown-content :deep(.hljs-bullet) {
  color: #005cc5;
}

.markdown-content :deep(.hljs-built_in),
.markdown-content :deep(.hljs-builtin-name) {
  color: #005cc5;
}

.markdown-content :deep(.hljs-meta) {
  color: #22863a;
}

.markdown-content :deep(.hljs-deletion) {
  background: #ffeef0;
}

.markdown-content :deep(.hljs-addition) {
  background: #f0fff4;
}

.markdown-content :deep(.hljs-emphasis) {
  font-style: italic;
}

.markdown-content :deep(.hljs-strong) {
  font-weight: bold;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid #dfe2e5;
  padding: 0 16px;
  margin: 0 0 16px 0;
  color: #6a737d;
}

.markdown-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid #d0d7de;
  padding: 8px 12px;
  text-align: left;
}

.markdown-content :deep(th) {
  background-color: #f6f8fa;
  font-weight: 600;
}

.markdown-content :deep(a) {
  color: #0969da;
  text-decoration: none;
}

.markdown-content :deep(a:hover) {
  text-decoration: underline;
}

.markdown-content :deep(hr) {
  border: none;
  border-top: 1px solid #d0d7de;
  margin: 2em 0;
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .markdown-content :deep(h1),
  .markdown-content :deep(h2),
  .markdown-content :deep(h3),
  .markdown-content :deep(h4),
  .markdown-content :deep(h5),
  .markdown-content :deep(h6) {
    color: #000000;
  }

  .markdown-content :deep(code) {
    background-color: #2d333b;
    color: #ff7b72;
  }

  .markdown-content :deep(pre) {
    background-color: #161b22;
    border-color: #30363d;
  }

  .markdown-content :deep(pre code) {
    color: #e6edf3;
  }

  .markdown-content :deep(blockquote) {
    border-left-color: #30363d;
    color: #8b949e;
  }

  .markdown-content :deep(th),
  .markdown-content :deep(td) {
    border-color: #30363d;
  }

  .markdown-content :deep(th) {
    background-color: #161b22;
  }

  .markdown-content :deep(a) {
    color: #58a6ff;
  }

  .markdown-content :deep(hr) {
    border-top-color: #30363d;
  }
}
</style>