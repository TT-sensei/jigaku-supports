// Vendored unchanged in behavior from TT-sensei/edu-components so the app can
// start even when a shared script host is unavailable.
import { EDU_EVENTS, emit } from './core/events.js';

const memoryStore = new Map();

function getBrowserStorage() {
  try {
    if (typeof globalThis === 'undefined' || !globalThis.localStorage) return null;
    const probe = `edu:storage-probe:${Math.random().toString(36).slice(2)}`;
    globalThis.localStorage.setItem(probe, '1');
    globalThis.localStorage.removeItem(probe);
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export class StorageManager {
  constructor(namespace, options = {}) {
    if (typeof namespace !== 'string' || !namespace.trim()) throw new Error('StorageManager requires a namespace.');
    this.namespace = namespace.trim();
    this.prefix = `edu:${this.namespace}:`;
    this.eventTarget = options.eventTarget;
    this.storage = options.storage === undefined ? getBrowserStorage() : options.storage;
  }

  _key(key) {
    if (typeof key !== 'string' || !key.trim()) throw new Error('StorageManager key must be a non-empty string.');
    return `${this.prefix}${key}`;
  }

  _error(operation, key, error, fallback = true) {
    emit(this.eventTarget, EDU_EVENTS.STORAGE_ERROR, { operation, namespace: this.namespace, key, message: error?.message || String(error), fallback });
  }

  save(key, value) {
    const storageKey = this._key(key);
    let raw;
    try { raw = JSON.stringify(value); if (raw === undefined) throw new Error('Unsupported value: undefined.'); }
    catch (error) { this._error('save', key, error, false); return false; }
    try {
      if (this.storage) this.storage.setItem(storageKey, raw);
      else throw new Error('localStorage is unavailable.');
    } catch (error) {
      memoryStore.set(storageKey, raw);
      this._error('save', key, error, true);
    }
    emit(this.eventTarget, EDU_EVENTS.STORAGE_SAVE, { namespace: this.namespace, key, storageKey, value });
    return true;
  }

  load(key, defaultValue = null) {
    const storageKey = this._key(key);
    let raw = null;
    try { raw = this.storage?.getItem(storageKey) ?? null; }
    catch (error) { this._error('load', key, error, true); }
    if (raw === null) raw = memoryStore.get(storageKey) ?? null;
    if (raw === null) return defaultValue;
    try { return JSON.parse(raw); }
    catch (error) { this._error('load', key, error, true); return defaultValue; }
  }

  has(key) {
    const storageKey = this._key(key);
    try { if (this.storage?.getItem(storageKey) !== null) return true; }
    catch (error) { this._error('has', key, error, true); }
    return memoryStore.has(storageKey);
  }

  remove(key) {
    const storageKey = this._key(key);
    let removed = false;
    try { if (this.storage?.getItem(storageKey) !== null) removed = true; this.storage?.removeItem(storageKey); }
    catch (error) { this._error('remove', key, error, true); }
    if (memoryStore.delete(storageKey)) removed = true;
    if (removed) emit(this.eventTarget, EDU_EVENTS.STORAGE_REMOVE, { namespace: this.namespace, key, storageKey });
    return removed;
  }

  clear() {
    const keys = new Set();
    try {
      if (this.storage) for (let index = this.storage.length - 1; index >= 0; index -= 1) {
        const storageKey = this.storage.key(index);
        if (storageKey?.startsWith(this.prefix)) { keys.add(storageKey.slice(this.prefix.length)); this.storage.removeItem(storageKey); }
      }
    } catch (error) { this._error('clear', null, error, true); }
    for (const storageKey of [...memoryStore.keys()]) if (storageKey.startsWith(this.prefix)) { keys.add(storageKey.slice(this.prefix.length)); memoryStore.delete(storageKey); }
    emit(this.eventTarget, EDU_EVENTS.STORAGE_CLEAR, { namespace: this.namespace, keys: [...keys] });
    return keys.size;
  }

  getAll() {
    const result = {};
    try {
      if (this.storage) for (let index = 0; index < this.storage.length; index += 1) {
        const storageKey = this.storage.key(index);
        if (storageKey?.startsWith(this.prefix)) {
          const key = storageKey.slice(this.prefix.length);
          const value = this.load(key, undefined);
          if (value !== undefined) result[key] = value;
        }
      }
    } catch (error) { this._error('getAll', null, error, true); }
    for (const [storageKey, raw] of memoryStore.entries()) if (storageKey.startsWith(this.prefix)) {
      const key = storageKey.slice(this.prefix.length);
      try { result[key] = JSON.parse(raw); } catch (error) { this._error('getAll', key, error, true); }
    }
    return result;
  }
}
