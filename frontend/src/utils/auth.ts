/**
 * 认证相关工具函数
 */

/**
 * 清除所有缓存数据（localStorage、sessionStorage、cookies）
 * 用于退出登录或token过期时清理用户数据
 */
export function clearAllCache(): void {
  try {
    // 清空 localStorage
    localStorage.clear()
    console.log('✅ localStorage已清空')
    
    // 清空 sessionStorage
    sessionStorage.clear()
    console.log('✅ sessionStorage已清空')
    
    // 清空所有cookies
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=")
      const name = eqPos > -1 ? c.substr(0, eqPos) : c
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + window.location.hostname
    })
    console.log('✅ cookies已清空')
  } catch (error) {
    console.error('清空缓存时出错:', error)
    throw error
  }
}
