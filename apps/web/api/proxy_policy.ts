export function assertProxyRequestBodyWithinLimit(bodyText: string, encoding: 'base64' | 'text', maxBytes: number): void {
  let byteLen: number
  if (encoding === 'base64') {
    const decoded = atob(bodyText)
    byteLen = decoded.length
  } else {
    byteLen = new TextEncoder().encode(bodyText).byteLength
  }
  if (byteLen > maxBytes) {
    throw new Error(`Request body exceeds max size limit of ${maxBytes} bytes`)
  }
}

export function isSameOriginRequest(origin: string, host: string, protocol: string): boolean {
  if (!origin) return true
  try {
    const originUrl = new URL(origin)
    const expectedOrigin = `${protocol}//${host}`
    return originUrl.origin === expectedOrigin
  } catch {
    return false
  }
}

export async function fetchPublicProxyTarget(targetUrl: string, init: RequestInit): Promise<Response> {
  const url = new URL(targetUrl)
  const res = await fetch(url.toString(), init)
  return res
}

export async function readResponseBodyWithinLimit(res: Response, maxBytes: number): Promise<Uint8Array> {
  if (!res.body) {
    return new Uint8Array()
  }

  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    // 单块chunk到来，先判断累加后是否超限
    if (totalBytes + value.byteLength > maxBytes) {
      // 立刻终止流读取，释放连接
      await reader.cancel()
      throw new Error(`Response body exceeds max size limit of ${maxBytes} bytes`)
    }

    chunks.push(value)
    totalBytes += value.byteLength
  }

  // 合并所有分片
  const result = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}

