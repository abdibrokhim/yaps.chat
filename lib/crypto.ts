import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { logger } from "@/lib/logger";

// Get encryption key from environment variables
const getEncryptionKey = (): Buffer => {
  const key = process.env.CRYPTO_KEY;
  if (!key) {
    logger.error("crypto", "Encryption key not found in environment variables");
    throw new Error("Encryption key not found in environment variables");
  }
  
  // Convert hex string to Buffer or use directly if it's already in the right format
  if (key.length === 64) { // 32 bytes in hex format
    return Buffer.from(key, 'hex');
  } else if (key.length === 32) { // 32 bytes directly
    return Buffer.from(key, 'utf-8');
  } else {
    logger.error("crypto", "Invalid encryption key format or length");
    throw new Error("Invalid encryption key format or length. Key must be 32 bytes (64 hex chars)");
  }
};

// Encrypt a message using AES-256-GCM
export const encryptMessage = (message: string | ArrayBuffer): { encrypted: string, nonce: string } => {
  try {
    // Generate a random nonce (IV)
    const nonce = randomBytes(12); // 12 bytes is the recommended nonce length for GCM
    
    // Get the encryption key
    const key = getEncryptionKey();
    
    // Create cipher
    const cipher = createCipheriv('aes-256-gcm', key, nonce);

    // Convert message to Buffer if necessary
    let inputBuffer: Buffer;
    if (typeof message === "string") {
      inputBuffer = Buffer.from(message, 'utf8');
    } else if (message instanceof ArrayBuffer) {
      inputBuffer = Buffer.from(new Uint8Array(message));
    } else {
      throw new Error("Unsupported message type");
    }
    
    // Encrypt the message
    const encryptedBuffer = Buffer.concat([
      cipher.update(inputBuffer),
      cipher.final()
    ]);
    
    // Get the auth tag (for integrity verification)
    const authTag = cipher.getAuthTag();
    
    // Return encrypted message with nonce and authTag
    return {
      encrypted: Buffer.concat([encryptedBuffer, authTag]).toString('base64'),
      nonce: nonce.toString('base64')
    };
  } catch (error: any) {
    logger.error("crypto", "Encryption failed", error);
    throw new Error(`Encryption failed: ${error.message}`);
  }
};

// Decrypt a message using AES-256-GCM
export const decryptMessage = (encryptedData: { encrypted: string, nonce: string }): Buffer => {
  try {
    // Parse the encrypted components
    const encryptedBuffer = Buffer.from(encryptedData.encrypted, 'base64');
    const nonce = Buffer.from(encryptedData.nonce, 'base64');
    
    // Extract the auth tag (last 16 bytes of the encrypted data)
    const authTag = encryptedBuffer.slice(encryptedBuffer.length - 16);
    const encryptedMessage = encryptedBuffer.slice(0, encryptedBuffer.length - 16);
    
    // Get the encryption key
    const key = getEncryptionKey();
    
    // Create decipher
    const decipher = createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAuthTag(authTag);
    
    // Decrypt the message
    const decryptedBuffer = Buffer.concat([
      decipher.update(encryptedMessage),
      decipher.final()
    ]);
    
    return decryptedBuffer;
  } catch (error: any) {
    logger.error("crypto", "Decryption failed", error);
    throw new Error(`Decryption failed: ${error.message}`);
  }
}; 