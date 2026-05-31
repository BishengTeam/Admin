import { describe, it, expect, beforeEach } from 'vitest'
import {
  getToken,
  setToken,
  clearToken,
  clearAuth,
  onAuthClear,
} from '@/core/auth'

describe('auth', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getToken / setToken / clearToken', () => {
    it('初始无 token', () => {
      expect(getToken()).toBeNull()
    })

    it('setToken 写入后 getToken 可读取', () => {
      setToken('test-jwt-token')
      expect(getToken()).toBe('test-jwt-token')
    })

    it('clearToken 后返回 null', () => {
      setToken('test-jwt-token')
      clearToken()
      expect(getToken()).toBeNull()
    })
  })

  describe('clearAuth', () => {
    it('清除 token', () => {
      setToken('test-jwt-token')
      clearAuth()
      expect(getToken()).toBeNull()
    })

    it('触发 onAuthClear 回调', () => {
      let called = false
      const unsub = onAuthClear(() => { called = true })
      clearAuth()
      expect(called).toBe(true)
      unsub()
    })

    it('onAuthClear 返回的 unsubscribe 可取消订阅', () => {
      let callCount = 0
      const unsub = onAuthClear(() => { callCount++ })
      unsub()
      clearAuth()
      expect(callCount).toBe(0)
    })
  })
})
