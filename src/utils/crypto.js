import CryptoJS from 'crypto-js'

// 从环境变量获取密钥，如果没有则使用默认值
const SECRET_KEY = import.meta.env.VITE_CRYPTO_KEY || 'default-secret-key'

/**
 * 加密数据
 * @param {Object} data - 要加密的数据
 * @returns {string} - 加密后的字符串
 */
export function encryptData(data) {
  try {
    const jsonData = JSON.stringify(data)
    const encrypted = CryptoJS.AES.encrypt(jsonData, SECRET_KEY).toString()
    return encrypted
  } catch (error) {
    console.error('加密数据时出错:', error)
    return null
  }
}

/**
 * 解密数据
 * @param {string} encryptedData - 加密的数据
 * @returns {Object|null} - 解密后的对象
 */
export function decryptData(encryptedData) {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY).toString(CryptoJS.enc.Utf8)
    return JSON.parse(decrypted)
  } catch (error) {
    console.error('解密数据时出错:', error)
    return null
  }
}