import { describe, it, expect, vi } from 'vitest';
import { safeLocalStorage } from '../core/storage';

describe('safeLocalStorage', () => {
  it('returns stored value normally', () => {
    localStorage.setItem('test-key', 'hello');
    expect(safeLocalStorage.getItem('test-key')).toBe('hello');
    localStorage.removeItem('test-key');
  });

  it('getItem returns null when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(safeLocalStorage.getItem('key')).toBeNull();
  });

  it('setItem does not throw when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(() => safeLocalStorage.setItem('key', 'value')).not.toThrow();
  });

  it('removeItem does not throw when storage throws', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementationOnce(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(() => safeLocalStorage.removeItem('key')).not.toThrow();
  });
});
