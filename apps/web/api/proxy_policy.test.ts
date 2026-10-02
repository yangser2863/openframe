import {
  assertProxyRequestBodyWithinLimit,
  isSameOriginRequest,
  readResponseBodyWithinLimit,
  fetchPublicProxyTarget,
} from './proxy_policy'
import { describe, it, expect, vi } from 'vitest'

describe('proxy_policy', () => {
  describe('assertProxyRequestBodyWithinLimit', () => {
    it('text encoding: body within limit should pass', () => {
      const text = 'hello world'
      expect(() => assertProxyRequestBodyWithinLimit(text, 'text', 100)).not.toThrow()
    })

    it('text encoding: body over limit should throw', () => {
      const longText = 'A'.repeat(200)
      expect(() => assertProxyRequestBodyWithinLimit(longText, 'text', 100)).toThrow(/exceeds max size/)
    })

    it('base64 encoding: decoded body within limit should pass', () => {
      const b64 = 'dGVzdA=='
      expect(() => assertProxyRequestBodyWithinLimit(b64, 'base64', 10)).not.toThrow()
    })

    it('base64 encoding: decoded body over limit should throw', () => {
      const b64 = 'QQ=='.repeat(200)
      expect(() => assertProxyRequestBodyWithinLimit(b64, 'base64', 100)).toThrow(/exceeds max size/)
    })
  })

  describe('isSameOriginRequest', () => {
    it('empty origin returns true', () => {
      expect(isSameOriginRequest('', 'localhost:3000', 'http:')).toBe(true)
    })

    it('matching origin returns true', () => {
      expect(isSameOriginRequest('http://localhost:3000', 'localhost:3000', 'http:')).toBe(true)
    })

    it('different origin returns false', () => {
      expect(isSameOriginRequest('http://evil.com', 'localhost:3000', 'http:')).toBe(false)
    })
  })

  describe('readResponseBodyWithinLimit', () => {
    it('normal stream under limit returns full bytes', async () => {
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1,2,3]))
          controller.close()
        }
      })
      const res = new Response(body)
      const result = await readResponseBodyWithinLimit(res, 10)
      expect(result).toEqual(new Uint8Array([1,2,3]))
    })

    it('stream exceeds limit throws error and cancels reader', async () => {
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1,2,3,4]))
          controller.close()
        }
      })
      const res = new Response(body)
      await expect(readResponseBodyWithinLimit(res, 3)).rejects.toThrow(/exceeds max size/)
    })

    it('empty response returns empty uint8array', async () => {
      const res = new Response(null)
      const result = await readResponseBodyWithinLimit(res, 100)
      expect(result).toEqual(new Uint8Array([]))
    })
  })

  describe('fetchPublicProxyTarget', () => {
    it('should call fetch with correct url and options', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'))
      await fetchPublicProxyTarget('https://example.com', { method: 'POST' })
      expect(mockFetch).toHaveBeenCalledWith('https://example.com', { method: 'POST' })
      mockFetch.mockRestore()
    })
  })
})

