const fs = require('fs');
const path = require('path');

// 读取server.js文件
const filePath = path.join(__dirname, 'server.js');
let content = fs.readFileSync(filePath, 'utf8');

// 修复换行符问题 - 将不正确的换行替换为正确的格式
content = content.replace(/res\.write\('data: \[DONE\]\s*'\);/g, "res.write('data: [DONE]\\n\\n');");

// 写回文件
fs.writeFileSync(filePath, content);
console.log('Fixed line breaks in server.js');