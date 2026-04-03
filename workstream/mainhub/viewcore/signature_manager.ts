export class SigningEngine {
  private keyPair: CryptoKeyPair | null = null

  constructor() {}

  /**
   * Ensure a keypair is generated before usage
   */
  private async ensureKeys(): Promise<CryptoKeyPair> {
    if (!this.keyPair) {
      this.keyPair = await crypto.subtle.generateKey(
        {
          name: "RSASSA-PKCS1-v1_5",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["sign", "verify"]
      )
    }
    return this.keyPair
  }

  /**
   * Sign a UTF-8 string and return base64
   */
  async sign(data: string): Promise<string> {
    const kp = await this.ensureKeys()
    const enc = new TextEncoder().encode(data)
    const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", kp.privateKey, enc)
    return Buffer.from(sig).toString("base64")
  }

  /**
   * Verify a base64 signature against given data
   */
  async verify(data: string, signature: string): Promise<boolean> {
    const kp = await this.ensureKeys()
    const enc = new TextEncoder().encode(data)
    const sig = Buffer.from(signature, "base64")
    return crypto.subtle.verify("RSASSA-PKCS1-v1_5", kp.publicKey, sig, enc)
  }

  /**
   * Export the public key in JWK format (for sharing)
   */
  async exportPublicKey(): Promise<JsonWebKey> {
    const kp = await this.ensureKeys()
    return crypto.subtle.exportKey("jwk", kp.publicKey)
  }

  /**
   * Import a public key from JWK (useful for verification-only cases)
   */
  async importPublicKey(jwk: JsonWebKey): Promise<void> {
    const pubKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      true,
      ["verify"]
    )
    if (!this.keyPair) {
      this.keyPair = { publicKey: pubKey, privateKey: {} as CryptoKey }
    } else {
      this.keyPair = { ...this.keyPair, publicKey: pubKey }
    }
  }
}
