<template>
  <div class="marked-content" v-html="renderedContent"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

interface Props {
  content: string
}

const props = defineProps<Props>()

// 创建自定义渲染器
const renderer = new marked.Renderer()

// 自定义列表项渲染，确保列表项内容不换行
renderer.listitem = (text: string): string => {
  // 将段落标签替换为span
  const processedText = text.replace(/<p>/g, '<span style="display: inline;">').replace(/<\/p>/g, '</span>')
  return `<li>${processedText}</li>`
}

// 配置marked选项
marked.setOptions({
  renderer: renderer, // 使用自定义渲染器
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
  headerIds: false, // 禁用自动生成header ID
  mangle: false, // 禁用邮箱地址混淆
  sanitize: false, // 允许HTML（因为我们使用v-html）
  smartLists: true, // 智能列表
  smartypants: true, // 智能标点
  langPrefix: 'hljs language-', // 语言前缀
})

// const renderedContent = computed(() => {
//   if (!props.content) return ''
  
//   // 预处理内容，处理HTML标签和数学公式
//   let content = props.content
//     // 先处理HTML实体解码，避免marked重复转义
//     .replace(/&amp;/g, '&')
//     .replace(/&lt;/g, '<')
//     .replace(/&gt;/g, '>')
//     .replace(/&quot;/g, '"')
//     .replace(/&#39;/g, "'")
//     // 先移除所有换行标签，包括在方括号之间的
//     .replace(/\[<br[^>]*>/g, '[') // [ 后面的<br>
//     .replace(/<br[^>]*>\]/g, ']') // ] 前面的<br>
//     .replace(/\[<br\s*\/>/g, '[') // [ 后面的<br/>
//     .replace(/<br\s*\/>\]/g, ']') // ] 前面的<br/>
//     // 处理 [<br /> 和 <br />] 的情况
//     .replace(/\[<br\s*\/\s*>/g, '[') // [ 后面的<br />
//     .replace(/<br\s*\/\s*>\]/g, ']') // ] 前面的<br />
//     // 移除其他可能干扰数学公式的HTML标签
//     .replace(/<br[^>]*>/g, ' ') // 将<br>替换为空格
//     .replace(/<br\s*\/>/g, ' ') // 处理自闭合<br/>
//     .replace(/<br\s*\/\s*>/g, ' ') // 处理自闭合<br />
//     .replace(/&nbsp;/g, ' ') // 替换不间断空格
//     // 处理数学公式中的特殊字符
//     .replace(/\\cdotp/g, '/')
//     // 临时保护数学公式中的特殊符号
//     .replace(/\$(.*?)\$/g, (match, formula) => {
//       // 移除公式内的HTML标签，包括换行标签
//       const cleanFormula = formula
//         .replace(/\[<br[^>]*>/g, '[')
//         .replace(/<br[^>]*>\]/g, ']')
//         .replace(/\[<br\s*\/>/g, '[')
//         .replace(/<br\s*\/>\]/g, ']')
//         .replace(/\[<br\s*\/\s*>/g, '[')
//         .replace(/<br\s*\/\s*>\]/g, ']')
//         .replace(/<[^>]*>/g, '') // 移除其他HTML标签
//         .replace(/&nbsp;/g, ' ')
//       return `${cleanFormula}<template>
//   <div class="marked-content" v-html="renderedContent"></div>
// </template>

// <script setup lang="ts">
// import { computed } from 'vue'
// import { marked } from 'marked'
// import hljs from 'highlight.js'
// import 'highlight.js/styles/github.css'

// interface Props {
//   content: string
// }

// const props = defineProps<Props>()

// // 创建自定义渲染器
// const renderer = new marked.Renderer()

// // 自定义列表项渲染，确保列表项内容不换行
// renderer.listitem = (text: string): string => {
//   // 将段落标签替换为span
//   const processedText = text.replace(/<p>/g, '<span style="display: inline;">').replace(/<\/p>/g, '</span>')
//   return `<li>${processedText}</li>`
// }

// // 配置marked选项
// marked.setOptions({
//   renderer: renderer, // 使用自定义渲染器
//   highlight: (code: string, lang: string) => {
//     if (lang && hljs.getLanguage(lang)) {
//       try {
//         return hljs.highlight(code, { language: lang }).value
//       } catch (err) {
//         console.warn('代码高亮失败:', err)
//       }
//     }
//     return hljs.highlightAuto(code).value
//   },
//   breaks: true, // 支持换行
//   gfm: true, // GitHub风格markdown
//   headerIds: false, // 禁用自动生成header ID
//   mangle: false, // 禁用邮箱地址混淆
//   sanitize: false, // 允许HTML（因为我们使用v-html）
//   smartLists: true, // 智能列表
//   smartypants: true, // 智能标点
//   langPrefix: 'hljs language-', // 语言前缀
// })

const renderedContent = computed(() => {
  if (!props.content) return ''
  
  // 预处理内容，处理HTML标签和数学公式
  let content = props.content
    // 先处理HTML实体解码，避免marked重复转义
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // 先移除所有换行标签，包括在方括号之间的
    .replace(/\[<br[^>]*>/g, '[') // [ 后面的<br>
    .replace(/<br[^>]*>\]/g, ']') // ] 前面的<br>
    .replace(/\[<br\s*\/>/g, '[') // [ 后面的<br/>
    .replace(/<br\s*\/>\]/g, ']') // ] 前面的<br/>
    // 处理 [<br /> 和 <br />] 的情况
    .replace(/\[<br\s*\/\s*>/g, '[') // [ 后面的<br />
    .replace(/<br\s*\/\s*>\]/g, ']') // ] 前面的<br />
    // 移除其他可能干扰数学公式的HTML标签
    .replace(/<br[^>]*>/g, ' ') // 将<br>替换为空格
    .replace(/<br\s*\/>/g, ' ') // 处理自闭合<br/>
    .replace(/<br\s*\/\s*>/g, ' ') // 处理自闭合<br />
    .replace(/&nbsp;/g, ' ') // 替换不间断空格
    // 处理数学公式中的特殊字符
    .replace(/\\cdotp/g, '/')
    // 临时保护数学公式中的特殊符号
    
  
    .replace(/\$\$(.*?)\$\$/g, (match, formula) => {
      // 移除公式内的HTML标签，包括换行标签
      const cleanFormula = formula
        .replace(/\[<br[^>]*>/g, '[')
        .replace(/<br[^>]*>\]/g, ']')
        .replace(/\[<br\s*\/>/g, '[')
        .replace(/<br\s*\/>\]/g, ']')
        .replace(/\[<br\s*\/\s*>/g, '[')
        .replace(/<br\s*\/\s*>\]/g, ']')
        .replace(/<[^>]*>/g, '') // 移除其他HTML标签
        .replace(/&nbsp;/g, ' ')
      return `$${cleanFormula}$`
    })
  
  return marked.parse(content)
})
</script>

<style scoped>
.marked-content {
  line-height: 1.6;
  color: #1f2937;
}

/* 标题样式 */
.marked-content :deep(h1),
.marked-content :deep(h2),
.marked-content :deep(h3),
.marked-content :deep(h4),
.marked-content :deep(h5),
.marked-content :deep(h6) {
  margin: 1em 0 0.5em 0;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
}

.marked-content :deep(h1) { font-size: 1.8em; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
.marked-content :deep(h2) { font-size: 1.5em; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; }
.marked-content :deep(h3) { font-size: 1.3em; }
.marked-content :deep(h4) { font-size: 1.2em; }
.marked-content :deep(h5) { font-size: 1.1em; }
.marked-content :deep(h6) { font-size: 1em; }

/* 段落样式 */
.marked-content :deep(p) {
  margin: 0.8em 0;
  line-height: 1.6;
}

/* 列表样式 */
.marked-content :deep(ul),
.marked-content :deep(ol) {
  margin: 0.8em 0;
  padding-left: 2em;
}

.marked-content :deep(ul) {
  list-style-type: disc;
}

.marked-content :deep(ol) {
  list-style-type: decimal;
}

.marked-content :deep(li) {
  margin: 0.3em 0;
  line-height: 1.6;
}

/* 嵌套列表样式 */
.marked-content :deep(ul ul),
.marked-content :deep(ol ol),
.marked-content :deep(ul ol),
.marked-content :deep(ol ul) {
  margin: 0.3em 0;
  padding-left: 1.5em;
}

.marked-content :deep(ul ul) {
  list-style-type: circle;
}

.marked-content :deep(ul ul ul) {
  list-style-type: square;
}

/* 行内代码样式 */
.marked-content :deep(code:not(.hljs)) {
  background-color: #f1f5f9;
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  color: #1f2937;
}

/* 代码块样式 */
.marked-content :deep(pre) {
  background-color: #f6f8fa;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  margin: 1em 0;
}

.marked-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  color: #1f2937;
  font-size: 0.9em;
  line-height: 1.5;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

/* 行内代码高亮样式 */
.marked-content :deep(code.hljs) {
  background-color: #f1f5f9;
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  color: #1f2937;
  display: inline;
}

/* 任务列表样式 */
.marked-content :deep(.task-list-item) {
  list-style: none;
  margin-left: -1.5em;
}

.marked-content :deep(.task-list-item input) {
  margin-right: 0.5em;
}

/* 引用块样式 */
.marked-content :deep(blockquote) {
  border-left: 4px solid #d0d7de;
  padding: 0 1em;
  margin: 1em 0;
  color: #57606a;
  background: #f6f8fa;
  border-radius: 0 6px 6px 0;
}

.marked-content :deep(blockquote p) {
  margin: 0.5em 0;
}

/* 表格样式 */
.marked-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.marked-content :deep(th),
.marked-content :deep(td) {
  border: 1px solid #d0d7de;
  padding: 8px 12px;
  text-align: left;
}

.marked-content :deep(th) {
  background-color: #f6f8fa;
  font-weight: 600;
  color: #1f2937;
}

.marked-content :deep(tr:nth-child(even)) {
  background-color: #f6f8fa;
}

/* 链接样式 */
.marked-content :deep(a) {
  color: #0969da;
  text-decoration: none;
}

.marked-content :deep(a:hover) {
  text-decoration: underline;
  color: #0550ae;
}

/* 水平线样式 */
.marked-content :deep(hr) {
  border: none;
  border-top: 1px solid #d0d7de;
  margin: 2em 0;
}

/* 图片样式 */
.marked-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 0.5em 0;
}

/* 代码块深色主题覆盖 */
.marked-content :deep(.hljs) {
  background: #f6f8fa !important;
  color: #1f2937 !important;
}
</style>