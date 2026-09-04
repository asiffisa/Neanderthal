/** Process/session-local LRU cache, bounded by both entries and estimated bytes. */
export class BoundedCache<T> {
  private entries = new Map<string, { value: T; bytes: number; expires: number }>();
  private bytes = 0;

  constructor(
    private maxEntries: number,
    private maxBytes: number,
    private ttlMs: number,
  ) {}

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expires <= Date.now()) {
      this.delete(key);
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, valueBytes: number): void {
    this.delete(key);
    const bytes = valueBytes + key.length * 2;
    if (bytes > this.maxBytes) return;
    // Expiry is checked on insertion too, so old entries cannot displace live ones.
    for (const [oldKey, entry] of this.entries) {
      if (entry.expires <= Date.now()) this.delete(oldKey);
    }
    while (this.entries.size >= this.maxEntries || this.bytes + bytes > this.maxBytes) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) return;
      this.delete(oldest);
    }
    this.entries.set(key, { value, bytes, expires: Date.now() + this.ttlMs });
    this.bytes += bytes;
  }

  delete(key: string): void {
    const entry = this.entries.get(key);
    if (entry) this.bytes -= entry.bytes;
    this.entries.delete(key);
  }
}
