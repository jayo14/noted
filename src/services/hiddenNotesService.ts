import { getStorageAdapter } from "@/lib/storage";

const HIDDEN_SECURITY_KEY = "hidden_notes_security";

export interface HiddenNotesSecurityConfig {
  pinHash: string | null;
  pinSalt: string | null;
  biometricEnabled: boolean;
  passkeyCredentialId: string | null;
}

export interface BiometricAvailability {
  available: boolean;
  mode: "native" | "passkey" | "none";
  label: string;
}

const DEFAULT_CONFIG: HiddenNotesSecurityConfig = {
  pinHash: null,
  pinSalt: null,
  biometricEnabled: false,
  passkeyCredentialId: null,
};

function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)
  );
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (str.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoded = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    return toHex(new Uint8Array(digest));
  }
  // Deterministic fallback for restricted non-secure test contexts
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function generateSalt(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return toHex(bytes);
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

class HiddenNotesService {
  private async getConfig(): Promise<HiddenNotesSecurityConfig> {
    try {
      const storage = await getStorageAdapter();
      const saved = await storage.getSetting<Partial<HiddenNotesSecurityConfig>>(
        HIDDEN_SECURITY_KEY,
        {},
      );
      return { ...DEFAULT_CONFIG, ...saved };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  private async saveConfig(config: HiddenNotesSecurityConfig): Promise<void> {
    const storage = await getStorageAdapter();
    await storage.setSetting(HIDDEN_SECURITY_KEY, config);
  }

  public isValidPin(pin: string): boolean {
    return /^\d{4}$/.test(pin);
  }

  public async hasPinConfigured(): Promise<boolean> {
    const config = await this.getConfig();
    return Boolean(config.pinHash && config.pinSalt);
  }

  public async setupPin(pin: string): Promise<void> {
    if (!this.isValidPin(pin)) {
      throw new Error("PIN must be exactly 4 digits.");
    }
    const config = await this.getConfig();
    const salt = generateSalt();
    const hash = await sha256Hex(`${salt}:${pin}`);
    await this.saveConfig({
      ...config,
      pinHash: hash,
      pinSalt: salt,
    });
  }

  public async verifyPin(pin: string): Promise<boolean> {
    if (!this.isValidPin(pin)) return false;
    const config = await this.getConfig();
    if (!config.pinHash || !config.pinSalt) return false;
    const candidate = await sha256Hex(`${config.pinSalt}:${pin}`);
    return candidate === config.pinHash;
  }

  public async changePin(currentPin: string, newPin: string): Promise<boolean> {
    const valid = await this.verifyPin(currentPin);
    if (!valid) return false;
    await this.setupPin(newPin);
    return true;
  }

  public async clearPin(currentPin: string): Promise<boolean> {
    const valid = await this.verifyPin(currentPin);
    if (!valid) return false;
    await this.saveConfig({ ...DEFAULT_CONFIG });
    return true;
  }

  public async getBiometricAvailability(): Promise<BiometricAvailability> {
    // 1. Native Android/iOS biometric plugin in Tauri
    if (isTauriRuntime()) {
      try {
        const biometric = await import("@tauri-apps/plugin-biometric");
        const status = await biometric.checkStatus();
        if (status.isAvailable) {
          const label =
            status.biometryType === biometric.BiometryType.FaceID
              ? "Face Unlock"
              : status.biometryType === biometric.BiometryType.TouchID
              ? "Fingerprint"
              : status.biometryType === biometric.BiometryType.Iris
              ? "Iris Unlock"
              : "Biometric Unlock";
          return { available: true, mode: "native", label };
        }
      } catch {
        // Not running on mobile target or plugin unavailable
      }
    }

    // 2. WebAuthn platform passkey on secure mobile/desktop browsers
    if (
      typeof window !== "undefined" &&
      window.isSecureContext &&
      typeof PublicKeyCredential !== "undefined" &&
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
    ) {
      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available) {
          return { available: true, mode: "passkey", label: "Passkey" };
        }
      } catch {
        // Ignore
      }
    }

    return { available: false, mode: "none", label: "" };
  }

  public async isBiometricEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    if (!config.biometricEnabled) return false;
    const availability = await this.getBiometricAvailability();
    if (!availability.available) return false;
    if (availability.mode === "passkey") {
      return Boolean(config.passkeyCredentialId);
    }
    return true;
  }

  public async enrollBiometric(): Promise<boolean> {
    const availability = await this.getBiometricAvailability();
    if (!availability.available) return false;

    const config = await this.getConfig();

    if (availability.mode === "native") {
      try {
        const biometric = await import("@tauri-apps/plugin-biometric");
        await biometric.authenticate("Confirm biometric unlock for Hidden Notes", {
          allowDeviceCredential: true,
          confirmationRequired: false,
          title: "Enable Biometric Unlock",
          subtitle: "Use your device fingerprint or face unlock",
        });
        await this.saveConfig({ ...config, biometricEnabled: true });
        return true;
      } catch {
        return false;
      }
    }

    if (availability.mode === "passkey" && typeof navigator !== "undefined" && navigator.credentials) {
      try {
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);
        const userId = new Uint8Array(16);
        crypto.getRandomValues(userId);

        const credential = (await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "Noted" },
            user: {
              id: userId,
              name: "noted-hidden-notes",
              displayName: "Noted Hidden Notes",
            },
            pubKeyCredParams: [
              { type: "public-key", alg: -7 },
              { type: "public-key", alg: -257 },
            ],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required",
              residentKey: "preferred",
            },
            timeout: 60000,
          },
        })) as PublicKeyCredential | null;

        if (!credential) return false;
        const credentialId = toBase64Url(new Uint8Array(credential.rawId));
        await this.saveConfig({
          ...config,
          biometricEnabled: true,
          passkeyCredentialId: credentialId,
        });
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }

  public async disableBiometric(): Promise<void> {
    const config = await this.getConfig();
    await this.saveConfig({
      ...config,
      biometricEnabled: false,
      passkeyCredentialId: null,
    });
  }

  public async verifyBiometric(): Promise<boolean> {
    const config = await this.getConfig();
    if (!config.biometricEnabled) return false;

    const availability = await this.getBiometricAvailability();
    if (!availability.available) return false;

    if (availability.mode === "native") {
      try {
        const biometric = await import("@tauri-apps/plugin-biometric");
        await biometric.authenticate("Unlock Hidden Notes", {
          allowDeviceCredential: true,
          confirmationRequired: false,
          title: "Hidden Notes",
          subtitle: "Verify your identity to view hidden notes",
        });
        return true;
      } catch {
        return false;
      }
    }

    if (
      availability.mode === "passkey" &&
      config.passkeyCredentialId &&
      typeof navigator !== "undefined" &&
      navigator.credentials
    ) {
      try {
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);
        const credBytes = fromBase64Url(config.passkeyCredentialId);
        const allowId = credBytes.buffer.slice(
          credBytes.byteOffset,
          credBytes.byteOffset + credBytes.byteLength,
        ) as ArrayBuffer;

        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge,
            allowCredentials: [{ type: "public-key", id: allowId }],
            userVerification: "required",
            timeout: 60000,
          },
        });
        return Boolean(assertion);
      } catch {
        return false;
      }
    }

    return false;
  }
}

export const hiddenNotesService = new HiddenNotesService();
