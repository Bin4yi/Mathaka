import { MemoryRepository } from './memoryRepository';
import type { Repository } from './repository';

// Web preview: in-memory mock behind the same interface (data resets on page reload).
export function createRepository(): Repository {
  return new MemoryRepository();
}
