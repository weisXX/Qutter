-- 创建数据库
CREATE DATABASE IF NOT EXISTS qutter CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE qutter;

-- 会话表
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_session_id (session_id),
  INDEX idx_created_at (created_at)
);

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  message_type ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id),
  INDEX idx_created_at (created_at)
);

-- 示例数据（可选）
-- INSERT INTO sessions (session_id, title) VALUES ('example-session-1', '关于React性能优化的讨论'),('example-session-2', 'Python异常处理最佳实践');

-- INSERT INTO messages (session_id, message_type, content) VALUES ('example-session-1', 'user', '如何优化React应用的性能？'), ('example-session-1', 'assistant', '优化React应用性能可以从以下几个方面入手...'), ('example-session-2', 'user', 'Python中如何处理异常？'), ('example-session-2', 'assistant', 'Python提供了完善的异常处理机制...');