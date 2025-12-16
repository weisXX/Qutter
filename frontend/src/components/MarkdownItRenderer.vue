<template>
  <div class="markdownit-content" v-html="renderedContent"></div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import markdownItTaskLists from 'markdown-it-task-lists'
import markdownItTOC from 'markdown-it-table-of-contents'
import markdownItTexmath from 'markdown-it-texmath'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface Props {
  content: string
}

const props = defineProps<Props>()

// 创建markdown-it实例
const md = new MarkdownIt({
  html: true,        // 允许HTML标签
  linkify: true,     // 自动将URL转换为链接
  typographer: true, // 启用印刷美化
  breaks: true,      // 转换换行符
  highlight: function (str: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre class="hljs"><code id="' + generateCodeId() + '" class="hljs language-' + lang + '">' +
               hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
               '</code></pre>'
      } catch (__) {}
    }
    return '<pre class="hljs"><code id="' + generateCodeId() + '" class="hljs">' +
           md.utils.escapeHtml(str) +
           '</code></pre>'
  }
})

// 生成唯一代码ID
const codeIdCounter = ref(0)
const generateCodeId = (): string => {
  return `code-${++codeIdCounter.value}-${Date.now()}`
}

// 添加任务列表支持
md.use(markdownItTaskLists, {
  enabled: true,
  label: true,
  labelAfter: false
})

// 添加目录支持
md.use(markdownItTOC, {
  includeLevel: [1, 2, 3, 4],
  containerClass: 'table-of-contents',
  listType: 'ul',
  format: function (x: string, htmlencode: (s: string) => string) {
    return htmlencode(x)
  }
})

// 添加数学公式支持
md.use(markdownItTexmath, {
  engine: katex,
  delimiters: ['dollars', 'brackets'],
  katexOptions: {
    throwOnError: false,
    errorColor: '#cc0000'
  }
})

// 自定义列表项渲染规则，确保列表项内容不换行
md.renderer.rules.list_item_open = (tokens: any, idx: number): string => {
  return '<li>'
}

md.renderer.rules.list_item_close = (tokens: any, idx: number): string => {
  return '</li>'
}

// 自定义段落渲染规则，在列表项中的段落不换行
md.renderer.rules.paragraph_open = (tokens: any, idx: number, options: any, env: any, renderer: any): string => {
  // 检查是否在列表项中
  const parentTokens = tokens.slice(0, idx).reverse()
  const isInListItem = parentTokens.some((token: any) => token.type === 'list_item_open')
  
  if (isInListItem) {
    return '<span style="display: inline;">'
  }
  return '<p>'
}

md.renderer.rules.paragraph_close = (tokens: any, idx: number, options: any, env: any, renderer: any): string => {
  // 检查是否在列表项中
  const parentTokens = tokens.slice(0, idx).reverse()
  const isInListItem = parentTokens.some((token: any) => token.type === 'list_item_open')
  
  if (isInListItem) {
    return '</span>'
  }
  return '</p>'
}

// 自定义代码块渲染规则，添加工具栏
md.renderer.rules.fence = (tokens: any, idx: number, options: any, env: any, renderer: any): string => {
  const token = tokens[idx]
  const langName = token.info ? md.utils.escapeHtml(token.info.trim()) : ''
  const langClass = langName ? ` class="hljs language-${langName}"` : ' class="hljs"'
  const codeId = generateCodeId()
  
  let highlighted = token.content
  if (langName && hljs.getLanguage(langName)) {
    try {
      highlighted = hljs.highlight(token.content, { language: langName, ignoreIllegals: true }).value
    } catch (err) {
      console.warn('代码高亮失败:', err)
    }
  } else if (!langName) {
    try {
      highlighted = hljs.highlightAuto(token.content).value
    } catch (err) {
      console.warn('自动代码高亮失败:', err)
    }
  }
  
  return `<div class="code-block-container">
    <div class="code-toolbar">
      <span class="code-language">${langName || 'text'}</span>
      <button class="copy-button" onclick="copyCode('${codeId}')" title="复制代码">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
    </div>
    <pre class="hljs"><code id="${codeId}"${langClass}>${highlighted}</code></pre>
  </div>`
}

// 自定义渲染规则，处理行内代码
md.renderer.rules.code_inline = (tokens: any, idx: number): string => {
  const token = tokens[idx]
  const code = token.content
  
  // 尝试检测语言类型
  const detectedLang = detectLanguage(code.trim())
  
  if (detectedLang && hljs.getLanguage(detectedLang)) {
    try {
      const highlighted = hljs.highlight(code.trim(), { language: detectedLang }).value
      return `<code class="hljs language-${detectedLang}">${highlighted}</code>`
    } catch (err) {
      console.warn('行内代码高亮失败:', err)
    }
  }
  
  // 如果无法检测语言，使用自动检测
  try {
    const highlighted = hljs.highlightAuto(code.trim()).value
    return `<code class="hljs">${highlighted}</code>`
  } catch (err) {
    console.warn('行内代码自动高亮失败:', err)
    return `<code>${md.utils.escapeHtml(code)}</code>`
  }
}

// 简单的语言检测函数
function detectLanguage(code: string): string | null {
  // JavaScript 检测
  if (/function\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=|=>|\{.*\}|\[\]|\.\w+|console\.|require\(|import\s+/.test(code)) {
    return 'javascript'
  }
  
  // Java 检测
  if (/public\s+class|private\s+\w+\s+\w+|public\s+static\s+void|System\.out\.println|String\[\]\s+args|new\s+\w+\(\)|@Override/.test(code)) {
    return 'java'
  }
  
  // Python 检测
  if (/def\s+\w+|import\s+\w+|from\s+\w+\s+import|print\(|if\s+__name__\s*==\s*['"]__main__['"]|:\s*\n/.test(code)) {
    return 'python'
  }
  
  // CSS 检测
  if (/\{\s*[\w-]+:\s*[^}]+\}|\.[\w-]+\s*\{|#[\w-]+\s*\{|@media|@import/.test(code)) {
    return 'css'
  }
  
  // HTML 检测
  if (/&lt;\/?\w+[^&gt;]*&gt;|&lt;div|&lt;span|&lt;p|&lt;h[1-6]|class=|id=/.test(code)) {
    return 'html'
  }
  
  // SQL 检测
  if (/SELECT\s+.*\s+FROM|INSERT\s+INTO|UPDATE\s+.*\s+SET|DELETE\s+FROM|CREATE\s+TABLE|DROP\s+TABLE/i.test(code)) {
    return 'sql'
  }
  
  // JSON 检测
  if (/^\s*\{.*\}\s*$|^\s*\[.*\]\s*$/.test(code) && code.includes(':') && (code.includes('"') || code.includes("'"))) {
    return 'json'
  }
  
  return null
}

// 添加全局复制函数
if (typeof window !== 'undefined') {
  (window as any).copyCode = async (codeId: string) => {
    try {
      const codeElement = document.getElementById(codeId)
      if (codeElement) {
        await navigator.clipboard.writeText(codeElement.textContent || '')
        // 可以添加成功提示
        const button = codeElement.closest('.code-block-container')?.querySelector('.copy-button')
        if (button) {
          const originalHTML = button.innerHTML
          button.innerHTML = '✓'
          button.style.color = '#10b981'
          setTimeout(() => {
            button.innerHTML = originalHTML
            button.style.color = ''
          }, 2000)
        }
      }
    } catch (err) {
      console.error('复制失败:', err)
    }
  }
}
console.log('[[[[[[[[[[[[[[[[[[2222]]]]]]]]]]]]]]]]]]');
// const renderedContent = computed(() => {
//   if (!props.content) return ''
  
//   // 预处理内容，处理HTML标签和数学公式
//   let content = props.content
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
//   <div class="markdownit-content" v-html="renderedContent"></div>
// </template>

// <script setup lang="ts">
// import { computed, ref } from 'vue'
// import MarkdownIt from 'markdown-it'
// import hljs from 'highlight.js'
// import 'highlight.js/styles/github.css'
// import markdownItTaskLists from 'markdown-it-task-lists'
// import markdownItTOC from 'markdown-it-table-of-contents'
// import markdownItTexmath from 'markdown-it-texmath'
// import katex from 'katex'
// import 'katex/dist/katex.min.css'

// interface Props {
//   content: string
// }

// const props = defineProps<Props>()

// // 创建markdown-it实例
// const md = new MarkdownIt({
//   html: true,        // 允许HTML标签
//   linkify: true,     // 自动将URL转换为链接
//   typographer: true, // 启用印刷美化
//   breaks: true,      // 转换换行符
//   highlight: function (str: string, lang: string) {
//     if (lang && hljs.getLanguage(lang)) {
//       try {
//         return '<pre class="hljs"><code id="' + generateCodeId() + '" class="hljs language-' + lang + '">' +
//                hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
//                '</code></pre>'
//       } catch (__) {}
//     }
//     return '<pre class="hljs"><code id="' + generateCodeId() + '" class="hljs">' +
//            md.utils.escapeHtml(str) +
//            '</code></pre>'
//   }
// })

// // 生成唯一代码ID
// const codeIdCounter = ref(0)
// const generateCodeId = (): string => {
//   return `code-${++codeIdCounter.value}-${Date.now()}`
// }

// // 添加任务列表支持
// md.use(markdownItTaskLists, {
//   enabled: true,
//   label: true,
//   labelAfter: false
// })

// // 添加目录支持
// md.use(markdownItTOC, {
//   includeLevel: [1, 2, 3, 4],
//   containerClass: 'table-of-contents',
//   listType: 'ul',
//   format: function (x: string, htmlencode: (s: string) => string) {
//     return htmlencode(x)
//   }
// })

// // 添加数学公式支持
// md.use(markdownItTexmath, {
//   engine: katex,
//   delimiters: ['dollars', 'brackets'],
//   katexOptions: {
//     throwOnError: false,
//     errorColor: '#cc0000'
//   }
// })

// // 自定义列表项渲染规则，确保列表项内容不换行
// md.renderer.rules.list_item_open = (tokens: any, idx: number): string => {
//   return '<li>'
// }

// md.renderer.rules.list_item_close = (tokens: any, idx: number): string => {
//   return '</li>'
// }

// // 自定义段落渲染规则，在列表项中的段落不换行
// md.renderer.rules.paragraph_open = (tokens: any, idx: number, options: any, env: any, renderer: any): string => {
//   // 检查是否在列表项中
//   const parentTokens = tokens.slice(0, idx).reverse()
//   const isInListItem = parentTokens.some((token: any) => token.type === 'list_item_open')
  
//   if (isInListItem) {
//     return '<span style="display: inline;">'
//   }
//   return '<p>'
// }

// md.renderer.rules.paragraph_close = (tokens: any, idx: number, options: any, env: any, renderer: any): string => {
//   // 检查是否在列表项中
//   const parentTokens = tokens.slice(0, idx).reverse()
//   const isInListItem = parentTokens.some((token: any) => token.type === 'list_item_open')
  
//   if (isInListItem) {
//     return '</span>'
//   }
//   return '</p>'
// }

// // 自定义代码块渲染规则，添加工具栏
// md.renderer.rules.fence = (tokens: any, idx: number, options: any, env: any, renderer: any): string => {
//   const token = tokens[idx]
//   const langName = token.info ? md.utils.escapeHtml(token.info.trim()) : ''
//   const langClass = langName ? ` class="hljs language-${langName}"` : ' class="hljs"'
//   const codeId = generateCodeId()
  
//   let highlighted = token.content
//   if (langName && hljs.getLanguage(langName)) {
//     try {
//       highlighted = hljs.highlight(token.content, { language: langName, ignoreIllegals: true }).value
//     } catch (err) {
//       console.warn('代码高亮失败:', err)
//     }
//   } else if (!langName) {
//     try {
//       highlighted = hljs.highlightAuto(token.content).value
//     } catch (err) {
//       console.warn('自动代码高亮失败:', err)
//     }
//   }
  
//   return `<div class="code-block-container">
//     <div class="code-toolbar">
//       <span class="code-language">${langName || 'text'}</span>
//       <button class="copy-button" onclick="copyCode('${codeId}')" title="复制代码">
//         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
//           <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
//           <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
//         </svg>
//       </button>
//     </div>
//     <pre class="hljs"><code id="${codeId}"${langClass}>${highlighted}</code></pre>
//   </div>`
// }

// // 自定义渲染规则，处理行内代码
// md.renderer.rules.code_inline = (tokens: any, idx: number): string => {
//   const token = tokens[idx]
//   const code = token.content
  
//   // 尝试检测语言类型
//   const detectedLang = detectLanguage(code.trim())
  
//   if (detectedLang && hljs.getLanguage(detectedLang)) {
//     try {
//       const highlighted = hljs.highlight(code.trim(), { language: detectedLang }).value
//       return `<code class="hljs language-${detectedLang}">${highlighted}</code>`
//     } catch (err) {
//       console.warn('行内代码高亮失败:', err)
//     }
//   }
  
//   // 如果无法检测语言，使用自动检测
//   try {
//     const highlighted = hljs.highlightAuto(code.trim()).value
//     return `<code class="hljs">${highlighted}</code>`
//   } catch (err) {
//     console.warn('行内代码自动高亮失败:', err)
//     return `<code>${md.utils.escapeHtml(code)}</code>`
//   }
// }

// // 简单的语言检测函数
// function detectLanguage(code: string): string | null {
//   // JavaScript 检测
//   if (/function\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=|=>|\{.*\}|\[\]|\.\w+|console\.|require\(|import\s+/.test(code)) {
//     return 'javascript'
//   }
  
//   // Java 检测
//   if (/public\s+class|private\s+\w+\s+\w+|public\s+static\s+void|System\.out\.println|String\[\]\s+args|new\s+\w+\(\)|@Override/.test(code)) {
//     return 'java'
//   }
  
//   // Python 检测
//   if (/def\s+\w+|import\s+\w+|from\s+\w+\s+import|print\(|if\s+__name__\s*==\s*['"]__main__['"]|:\s*\n/.test(code)) {
//     return 'python'
//   }
  
//   // CSS 检测
//   if (/\{\s*[\w-]+:\s*[^}]+\}|\.[\w-]+\s*\{|#[\w-]+\s*\{|@media|@import/.test(code)) {
//     return 'css'
//   }
  
//   // HTML 检测
//   if (/&lt;\/?\w+[^&gt;]*&gt;|&lt;div|&lt;span|&lt;p|&lt;h[1-6]|class=|id=/.test(code)) {
//     return 'html'
//   }
  
//   // SQL 检测
//   if (/SELECT\s+.*\s+FROM|INSERT\s+INTO|UPDATE\s+.*\s+SET|DELETE\s+FROM|CREATE\s+TABLE|DROP\s+TABLE/i.test(code)) {
//     return 'sql'
//   }
  
//   // JSON 检测
//   if (/^\s*\{.*\}\s*$|^\s*\[.*\]\s*$/.test(code) && code.includes(':') && (code.includes('"') || code.includes("'"))) {
//     return 'json'
//   }
  
//   return null
// }

// // 添加全局复制函数
// if (typeof window !== 'undefined') {
//   (window as any).copyCode = async (codeId: string) => {
//     try {
//       const codeElement = document.getElementById(codeId)
//       if (codeElement) {
//         await navigator.clipboard.writeText(codeElement.textContent || '')
//         // 可以添加成功提示
//         const button = codeElement.closest('.code-block-container')?.querySelector('.copy-button')
//         if (button) {
//           const originalHTML = button.innerHTML
//           button.innerHTML = '✓'
//           button.style.color = '#10b981'
//           setTimeout(() => {
//             button.innerHTML = originalHTML
//             button.style.color = ''
//           }, 2000)
//         }
//       }
//     } catch (err) {
//       console.error('复制失败:', err)
//     }
//   }
// }


const renderedContent = computed(() => {
  if (!props.content) return ''
  
  // 预处理内容，处理HTML标签和数学公式
  let content = props.content
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
  
  return md.render(content)
})

// 文件扩展名映射
const getFileExtension = (language: string): string => {
  const extensions: Record<string, string> = {
    'javascript': 'js',
    'typescript': 'ts',
    'python': 'py',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'css': 'css',
    'html': 'html',
    'xml': 'xml',
    'json': 'json',
    'yaml': 'yml',
    'yml': 'yml',
    'sql': 'sql',
    'sh': 'sh',
    'bash': 'sh',
    'powershell': 'ps1',
    'dockerfile': 'dockerfile',
    'markdown': 'md',
    'tex': 'tex',
    'latex': 'tex',
    'php': 'php',
    'ruby': 'rb',
    'go': 'go',
    'rust': 'rs',
    'swift': 'swift',
    'kotlin': 'kt',
    'scala': 'scala',
    'r': 'r',
    'matlab': 'm',
    'lua': 'lua',
    'perl': 'pl',
    'dart': 'dart'
  }
  return extensions[language.toLowerCase()] || language
}
</script>

<style scoped>
.markdownit-content {
  line-height: 1.6;
  color: #1f2937;
}

/* 标题样式 */
.markdownit-content :deep(h1),
.markdownit-content :deep(h2),
.markdownit-content :deep(h3),
.markdownit-content :deep(h4),
.markdownit-content :deep(h5),
.markdownit-content :deep(h6) {
  margin: 1em 0 0.5em 0;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
}

.markdownit-content :deep(h1) { font-size: 1.8em; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
.markdownit-content :deep(h2) { font-size: 1.5em; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; }
.markdownit-content :deep(h3) { font-size: 1.3em; }
.markdownit-content :deep(h4) { font-size: 1.2em; }
.markdownit-content :deep(h5) { font-size: 1.1em; }
.markdownit-content :deep(h6) { font-size: 1em; }

/* 段落样式 */
.markdownit-content :deep(p) {
  margin: 0.8em 0;
  line-height: 1.6;
}

/* 列表样式 */
.markdownit-content :deep(ul),
.markdownit-content :deep(ol) {
  margin: 0.8em 0;
  padding-left: 2em;
}

.markdownit-content :deep(ul) {
  list-style-type: disc;
}

.markdownit-content :deep(ol) {
  list-style-type: decimal;
}

.markdownit-content :deep(li) {
  margin: 0.3em 0;
  line-height: 1.6;
}

/* 嵌套列表样式 */
.markdownit-content :deep(ul ul),
.markdownit-content :deep(ol ol),
.markdownit-content :deep(ul ol),
.markdownit-content :deep(ol ul) {
  margin: 0.3em 0;
  padding-left: 1.5em;
}

.markdownit-content :deep(ul ul) {
  list-style-type: circle;
}

.markdownit-content :deep(ul ul ul) {
  list-style-type: square;
}

/* 列表项中的段落样式 */
.markdownit-content :deep(li p:first-child) {
  display: inline;
  margin: 0;
}

.markdownit-content :deep(li p:not(:first-child)) {
  display: block;
  margin: 0.5em 0;
}

/* 行内代码样式 */
.markdownit-content :deep(code:not(.hljs)) {
  background-color: #f1f5f9;
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  color: #1f2937;
}

/* 代码块容器样式 */
.markdownit-content :deep(.code-block-container) {
  margin: 1em 0;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f6f8fa;
}

/* 代码工具栏样式 */
.markdownit-content :deep(.code-toolbar) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: #f1f5f9;
  border-bottom: 1px solid #d0d7de;
  font-size: 0.85em;
}

.markdownit-content :deep(.code-language) {
  color: #656d76;
  font-weight: 500;
  text-transform: uppercase;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.markdownit-content :deep(.copy-button) {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: none;
  border: 1px solid #d0d7de;
  border-radius: 4px;
  color: #656d76;
  cursor: pointer;
  font-size: 0.85em;
  transition: all 0.2s ease;
}

.markdownit-content :deep(.copy-button:hover) {
  background-color: #f3f4f6;
  border-color: #9ca3af;
  color: #374151;
}

/* 代码块样式 */
.markdownit-content :deep(pre) {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
  background-color: #f6f8fa;
}

.markdownit-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  color: #1f2937;
  font-size: 0.9em;
  line-height: 1.5;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

/* 行内代码高亮样式 */
.markdownit-content :deep(code.hljs) {
  background-color: #f1f5f9;
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  color: #1f2937;
  display: inline;
}

/* 任务列表样式 */
.markdownit-content :deep(.task-list-item) {
  list-style: none;
  margin-left: -1.5em;
}

.markdownit-content :deep(.task-list-item input) {
  margin-right: 0.5em;
}

/* 引用块样式 */
.markdownit-content :deep(blockquote) {
  border-left: 4px solid #d0d7de;
  padding: 0 1em;
  margin: 1em 0;
  color: #57606a;
  background: #f6f8fa;
  border-radius: 0 6px 6px 0;
}

.markdownit-content :deep(blockquote p) {
  margin: 0.5em 0;
}

/* 表格样式 */
.markdownit-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.markdownit-content :deep(th),
.markdownit-content :deep(td) {
  border: 1px solid #d0d7de;
  padding: 8px 12px;
  text-align: left;
}

.markdownit-content :deep(th) {
  background-color: #f6f8fa;
  font-weight: 600;
  color: #1f2937;
}

.markdownit-content :deep(tr:nth-child(even)) {
  background-color: #f6f8fa;
}

/* 链接样式 */
.markdownit-content :deep(a) {
  color: #0969da;
  text-decoration: none;
}

.markdownit-content :deep(a:hover) {
  text-decoration: underline;
  color: #0550ae;
}

/* 水平线样式 */
.markdownit-content :deep(hr) {
  border: none;
  border-top: 1px solid #d0d7de;
  margin: 2em 0;
}

/* 图片样式 */
.markdownit-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 0.5em 0;
}

/* 目录样式 */
.markdownit-content :deep(.table-of-contents) {
  background: #f6f8fa;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  padding: 16px;
  margin: 1em 0;
}

.markdownit-content :deep(.table-of-contents ul) {
  margin: 0;
  padding-left: 1.5em;
}

.markdownit-content :deep(.table-of-contents li) {
  margin: 0.2em 0;
}

/* 代码块深色主题覆盖 */
.markdownit-content :deep(.hljs) {
  background: #f6f8fa !important;
  color: #1f2937 !important;
}

/* 数学公式样式 */
.markdownit-content :deep(.katex) {
  font-size: 1.1em;
}

.markdownit-content :deep(.katex-display) {
  margin: 1em 0;
  text-align: center;
}

.markdownit-content :deep(.katex-error) {
  color: #ff4757;
}
</style>