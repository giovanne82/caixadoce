/**
 * Safe Storage Wrapper
 * Protege a aplicação contra exceções SecurityError / DOMException quando o navegador
 * bloqueia o acesso a localStorage/sessionStorage (ex: Modo Secreto no Samsung Internet,
 * navegação anônima restrita, WebView restrito ou políticas anti-rastreamento agressivas).
 */

class MemoryStorage implements Storage {
  private memoryMap = new Map<string, string>();

  get length(): number {
    return this.memoryMap.size;
  }

  getItem(key: string): string | null {
    return this.memoryMap.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.memoryMap.set(key, String(value));
  }

  removeItem(key: string): void {
    this.memoryMap.delete(key);
  }

  clear(): void {
    this.memoryMap.clear();
  }

  key(index: number): string | null {
    const keys = Array.from(this.memoryMap.keys());
    return keys[index] ?? null;
  }
}

const fallbackLocalStorage = new MemoryStorage();
const fallbackSessionStorage = new MemoryStorage();

function isStorageUsable(type: "localStorage" | "sessionStorage"): boolean {
  if (typeof window === "undefined") return false;
  try {
    const storage = window[type];
    if (!storage) return false;
    const testKey = "__caixadoce_safe_storage_test__";
    storage.setItem(testKey, testKey);
    const result = storage.getItem(testKey);
    storage.removeItem(testKey);
    return result === testKey;
  } catch {
    return false;
  }
}

let canUseLocalStorage = isStorageUsable("localStorage");
let canUseSessionStorage = isStorageUsable("sessionStorage");

export const safeStorage: Storage = {
  get length(): number {
    try {
      if (canUseLocalStorage && typeof window !== "undefined") {
        return window.localStorage.length;
      }
    } catch {
      canUseLocalStorage = false;
    }
    return fallbackLocalStorage.length;
  },

  getItem(key: string): string | null {
    try {
      if (canUseLocalStorage && typeof window !== "undefined") {
        return window.localStorage.getItem(key);
      }
    } catch {
      canUseLocalStorage = false;
    }
    return fallbackLocalStorage.getItem(key);
  },

  setItem(key: string, value: string): void {
    try {
      if (canUseLocalStorage && typeof window !== "undefined") {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      canUseLocalStorage = false;
    }
    fallbackLocalStorage.setItem(key, value);
  },

  removeItem(key: string): void {
    try {
      if (canUseLocalStorage && typeof window !== "undefined") {
        window.localStorage.removeItem(key);
        return;
      }
    } catch {
      canUseLocalStorage = false;
    }
    fallbackLocalStorage.removeItem(key);
  },

  clear(): void {
    try {
      if (canUseLocalStorage && typeof window !== "undefined") {
        window.localStorage.clear();
        return;
      }
    } catch {
      canUseLocalStorage = false;
    }
    fallbackLocalStorage.clear();
  },

  key(index: number): string | null {
    try {
      if (canUseLocalStorage && typeof window !== "undefined") {
        return window.localStorage.key(index);
      }
    } catch {
      canUseLocalStorage = false;
    }
    return fallbackLocalStorage.key(index);
  },
};

export const safeSessionStorage: Storage = {
  get length(): number {
    try {
      if (canUseSessionStorage && typeof window !== "undefined") {
        return window.sessionStorage.length;
      }
    } catch {
      canUseSessionStorage = false;
    }
    return fallbackSessionStorage.length;
  },

  getItem(key: string): string | null {
    try {
      if (canUseSessionStorage && typeof window !== "undefined") {
        return window.sessionStorage.getItem(key);
      }
    } catch {
      canUseSessionStorage = false;
    }
    return fallbackSessionStorage.getItem(key);
  },

  setItem(key: string, value: string): void {
    try {
      if (canUseSessionStorage && typeof window !== "undefined") {
        window.sessionStorage.setItem(key, value);
        return;
      }
    } catch {
      canUseSessionStorage = false;
    }
    fallbackSessionStorage.setItem(key, value);
  },

  removeItem(key: string): void {
    try {
      if (canUseSessionStorage && typeof window !== "undefined") {
        window.sessionStorage.removeItem(key);
        return;
      }
    } catch {
      canUseSessionStorage = false;
    }
    fallbackSessionStorage.removeItem(key);
  },

  clear(): void {
    try {
      if (canUseSessionStorage && typeof window !== "undefined") {
        window.sessionStorage.clear();
        return;
      }
    } catch {
      canUseSessionStorage = false;
    }
    fallbackSessionStorage.clear();
  },

  key(index: number): string | null {
    try {
      if (canUseSessionStorage && typeof window !== "undefined") {
        return window.sessionStorage.key(index);
      }
    } catch {
      canUseSessionStorage = false;
    }
    return fallbackSessionStorage.key(index);
  },
};

export function getSafeStorageItem(key: string): string | null {
  return safeStorage.getItem(key);
}

export function setSafeStorageItem(key: string, value: string): void {
  safeStorage.setItem(key, value);
}

export function removeSafeStorageItem(key: string): void {
  safeStorage.removeItem(key);
}
