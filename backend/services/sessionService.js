const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class SessionService {
  // 创建新会话
  /**
   * 创建一个新的会话
   * @param {string} title - 会话标题，默认为'新对话'
   * @returns {Object} 包含会话信息的对象
   */
  async createSession(title = '新对话') {
    try {
      // 生成唯一的会话ID
      const sessionId = uuidv4();
      
      // 从连接池获取数据库连接
      const connection = await pool.getConnection();
      
      // 执行SQL插入语句，将会话信息保存到数据库
      const [result] = await connection.execute(
        'INSERT INTO sessions (session_id, title) VALUES (?, ?)',
        [sessionId, title]
      );
      
      // 释放数据库连接回连接池
      connection.release();
      
      // 返回创建的会话信息
      return {
        id: result.insertId,        // 数据库自动生成的主键ID
        session_id: sessionId,       // 会话唯一标识符
        title: title                // 会话标题
      };
    } catch (error) {
      // 记录错误日志并重新抛出异常
      console.error('创建会话失败:', error);
      throw error;
    }
  }

  // 获取所有会话
  async getAllSessions() {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute(
        'SELECT * FROM sessions ORDER BY updated_at DESC'
      );
      connection.release();
      return rows;
    } catch (error) {
      console.error('获取会话列表失败:', error);
      throw error;
    }
  }

  // 获取特定会话
  async getSession(sessionId) {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute(
        'SELECT * FROM sessions WHERE session_id = ?',
        [sessionId]
      );
      connection.release();
      return rows[0] || null;
    } catch (error) {
      console.error('获取会话失败:', error);
      throw error;
    }
  }

  // 更新会话标题
  async updateSessionTitle(sessionId, title) {
    try {
      const connection = await pool.getConnection();
      const [result] = await connection.execute(
        'UPDATE sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?',
        [title, sessionId]
      );
      connection.release();
      return result.affectedRows > 0;
    } catch (error) {
      console.error('更新会话标题失败:', error);
      throw error;
    }
  }

  // 删除会话
  async deleteSession(sessionId) {
    try {
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      
      // 删除会话相关的消息
      await connection.execute(
        'DELETE FROM messages WHERE session_id = ?',
        [sessionId]
      );
      
      // 删除会话
      const [result] = await connection.execute(
        'DELETE FROM sessions WHERE session_id = ?',
        [sessionId]
      );
      
      await connection.commit();
      connection.release();
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('删除会话失败:', error);
      throw error;
    }
  }

  // 添加消息到会话
  async addMessage(sessionId, messageType, content) {
    try {
      const connection = await pool.getConnection();
      const [result] = await connection.execute(
        'INSERT INTO messages (session_id, message_type, content) VALUES (?, ?, ?)',
        [sessionId, messageType, content]
      );
      
      // 更新会话的最后更新时间
      await connection.execute(
        'UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE session_id = ?',
        [sessionId]
      );
      
      connection.release();
      
      return {
        id: result.insertId,
        session_id: sessionId,
        message_type: messageType,
        content: content
      };
    } catch (error) {
      console.error('添加消息失败:', error);
      throw error;
    }
  }

  // 获取会话的所有消息
  async getSessionMessages(sessionId) {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute(
        'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC',
        [sessionId]
      );
      connection.release();
      return rows;
    } catch (error) {
      console.error('获取会话消息失败:', error);
      throw error;
    }
  }

  // 获取会话的最近消息用于上下文
  async getSessionContext(sessionId, limit = 10) {
    try {
      const connection = await pool.getConnection();
      // LIMIT参数不能直接使用预处理语句绑定，需要使用字符串插值
      const [rows] = await connection.execute(
        `SELECT message_type, content FROM messages WHERE session_id = ? ORDER BY created_at DESC LIMIT ${parseInt(limit)}`,
        [sessionId]
      );
      connection.release();
      
      // 返回按时间正序排列的消息
      return rows.reverse();
    } catch (error) {
      console.error('获取会话上下文失败:', error);
      throw error;
    }
  }
}

module.exports = new SessionService();