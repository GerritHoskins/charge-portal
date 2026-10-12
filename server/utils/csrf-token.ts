import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

// Signed double-submit token. The cookie and the form field carry the same
// `<nonce>.<hmac(nonce)>` value. Matching alone would let anyone who can plant a cookie
// (e.g. from a sibling subdomain) forge a pair; the signature ties the value to our secret.
// Deliberately free of Nitro auto-imports so it can be unit tested.
export const createCsrf = (secret: string) => {
  const sign = (nonce: string) => createHmac('sha256', secret).update(nonce).digest('base64url')

  const equal = (a: string, b: string) => {
    const left = Buffer.from(a)
    const right = Buffer.from(b)
    return left.length === right.length && timingSafeEqual(left, right)
  }

  return {
    issue(): string {
      const nonce = randomBytes(24).toString('base64url')
      return `${nonce}.${sign(nonce)}`
    },
    verify(cookieToken: string | undefined, submitted: string | undefined): boolean {
      if (!cookieToken || !submitted || !equal(cookieToken, submitted)) return false
      const [nonce, signature, ...rest] = cookieToken.split('.')
      return Boolean(nonce && signature && rest.length === 0 && equal(signature, sign(nonce)))
    },
  }
}
