// promptManager.js
const fs = require('fs');
const path = require('path');

class PromptManager {
  constructor(templatePath = './prompt_template.txt') {
    this.templatePath = path.resolve(templatePath);
    this.template = '';
  }

  /**
   * 加载模板文件
   */
  loadTemplate() {
    try {
      this.template = fs.readFileSync(this.templatePath, 'utf-8');
      console.log(`✅ 模板加载成功: ${this.templatePath}`);
      return this.template;
    } catch (error) {
      console.error(`❌ 加载模板失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 生成完整提示词
   * @param {string} question - 用户问题
   * @returns {string} 完整提示词
   */
  generatePrompt(question) {
    if (!this.template) {
      this.loadTemplate();
    }
    
    if (!this.template) {
      return `问题: ${question}`;
    }

    return this.template.replace(/\$\{question\}/g, question);
  }

  /**
   * 批量生成提示词
   * @param {string[]} questions - 问题数组
   * @returns {Array<{question: string, prompt: string}>}
   */
  generateBatchPrompts(questions) {
    return questions.map(q => ({
      question: q,
      prompt: this.generatePrompt(q)
    }));
  }
}

module.exports = {
  PromptManager
}

// // 使用示例
// const promptManager = new PromptManager();
// promptManager.loadTemplate();

// const question = "解释量子计算的基本原理";
// const prompt = promptManager.generatePrompt(question);

// console.log("生成的提示词:");
// console.log("=".repeat(50));
// console.log(prompt);
// console.log("=".repeat(50));