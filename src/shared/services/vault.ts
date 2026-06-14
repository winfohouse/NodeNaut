export type VaultState = 'UNINITIALIZED' | 'LOCKED' | 'UNLOCKED';

export class VaultService {
  private static sessionKey: CryptoKey | null = null;
  private static readonly STORAGE_PREFIX = 'flowpilot_v4_'; // New prefix for hardened storage
  private static readonly MASTER_HASH = 'master_hash';
  private static readonly SALT_KEY = 'vault_salt';

  /**
   * Checks the current state of the vault.
   */
  static async getState(): Promise<VaultState> {
    const stored = await chrome.storage.local.get([
      this.STORAGE_PREFIX + this.MASTER_HASH
    ]);
    
    if (!stored[this.STORAGE_PREFIX + this.MASTER_HASH]) {
      return 'UNINITIALIZED';
    }
    
    return this.sessionKey ? 'UNLOCKED' : 'LOCKED';
  }

  /**
   * Initializes or changes the master password.
   */
  static async setMasterPassword(password: string): Promise<void> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    await chrome.storage.local.set({ [this.STORAGE_PREFIX + this.SALT_KEY]: Array.from(salt) });
    
    const key = await this.deriveKey(password, salt);
    this.sessionKey = key;

    // Create a non-reversible verifier hash
    // We derive a separate key for verification purposes
    const verifierHash = await this.generateVerifier(password, salt);
    await chrome.storage.local.set({ [this.STORAGE_PREFIX + this.MASTER_HASH]: verifierHash });
  }

  /**
   * Unlocks the vault for the current session.
   */
  static async unlock(password: string): Promise<boolean> {
    const stored = await chrome.storage.local.get([
      this.STORAGE_PREFIX + this.SALT_KEY,
      this.STORAGE_PREFIX + this.MASTER_HASH
    ]);

    if (!stored[this.STORAGE_PREFIX + this.MASTER_HASH]) return false;

    const saltRaw = stored[this.STORAGE_PREFIX + this.SALT_KEY];
    const salt = new Uint8Array(Array.isArray(saltRaw) ? saltRaw : Object.values(saltRaw || {}));
    const storedHash = stored[this.STORAGE_PREFIX + this.MASTER_HASH];

    const inputHash = await this.generateVerifier(password, salt);

    if (inputHash === storedHash) {
      this.sessionKey = await this.deriveKey(password, salt);
      return true;
    }
    
    return false;
  }

  /**
   * Updates the master password and re-encrypts all secure data.
   * Now includes hash verification for the old password.
   */
  static async changeMasterPassword(oldPassword: string, newPassword: string): Promise<boolean> {
    const stored = await chrome.storage.local.get([
      this.STORAGE_PREFIX + this.SALT_KEY,
      this.STORAGE_PREFIX + this.MASTER_HASH
    ]);

    const saltRaw = stored[this.STORAGE_PREFIX + this.SALT_KEY];
    const salt = new Uint8Array(Array.isArray(saltRaw) ? saltRaw : Object.values(saltRaw || {}));
    const storedHash = stored[this.STORAGE_PREFIX + this.MASTER_HASH];

    // 1. Verify old password via hash
    const oldInputHash = await this.generateVerifier(oldPassword, salt);
    if (oldInputHash !== storedHash) return false;

    const oldKey = await this.deriveKey(oldPassword, salt);
    
    // 2. Generate new salt and key
    const newSalt = crypto.getRandomValues(new Uint8Array(16));
    const newKey = await this.deriveKey(newPassword, newSalt);

    const { db } = await import('./db');

    // 3. Re-encrypt Global Tables
    const globalTables = await db.global_tables.toArray();
    for (const table of globalTables) {
      if (table.is_secure && table.data?.blob) {
        const decrypted = await this.decryptRaw(table.data.blob, oldKey);
        const newBlob = await this.encryptRaw(decrypted, newKey);
        await db.global_tables.update(table.id, { data: { blob: newBlob } });
      }
    }

    // 4. Re-encrypt Workflows
    const workflows = await db.workflows.toArray();
    for (const workflow of workflows) {
      if (workflow.is_encrypted && workflow.encrypted_blob) {
        const decrypted = await this.decryptRaw(workflow.encrypted_blob, oldKey);
        const newBlob = await this.encryptRaw(decrypted, newKey);
        await db.workflows.update(workflow.id, { encrypted_blob: newBlob });
      }
    }

    // 5. Commit new Master Verifier and Salt
    const newVerifierHash = await this.generateVerifier(newPassword, newSalt);
    await chrome.storage.local.set({ 
      [this.STORAGE_PREFIX + this.SALT_KEY]: Array.from(newSalt),
      [this.STORAGE_PREFIX + this.MASTER_HASH]: newVerifierHash
    });

    this.sessionKey = newKey;
    return true;
  }

  static lock() {
    this.sessionKey = null;
  }

  /**
   * Encrypts plaintext using the current session key.
   */
  static async encrypt(plaintext: string): Promise<string> {
    if (!this.sessionKey) throw new Error('Vault Locked');
    return await this.encryptRaw(plaintext, this.sessionKey);
  }

  /**
   * Decrypts ciphertext using the current session key.
   */
  static async decrypt(base64: string): Promise<string> {
    if (!this.sessionKey) throw new Error('Vault Locked');
    return await this.decryptRaw(base64, this.sessionKey);
  }

  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as any,
        iterations: 100000,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private static async generateVerifier(password: string, salt: Uint8Array): Promise<string> {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const verifierKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as any,
        iterations: 10000, // Sufficient for verification
        hash: 'SHA-256'
      },
      passwordKey,
      { name: 'HMAC', hash: 'SHA-256' },
      true,
      ['sign']
    );

    const exported = await crypto.subtle.exportKey('raw', verifierKey);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }

  private static async encryptRaw(plaintext: string, key: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return btoa(String.fromCharCode(...combined));
  }

  private static async decryptRaw(base64: string, key: CryptoKey): Promise<string> {
    const combined = new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  }

  static isEncrypted(value: string): boolean {
    return value?.startsWith('VAULT:');
  }

  static wrap(encrypted: string): string {
    return `VAULT:${encrypted}`;
  }

  static unwrap(wrapped: string): string {
    return wrapped?.replace('VAULT:', '') || '';
  }
}
