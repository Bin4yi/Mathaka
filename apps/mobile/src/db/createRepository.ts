import type { Repository } from './repository';
import { SqliteRepository } from './sqliteRepository';

// Phones (Android/iOS): real SQLite. The web build picks createRepository.web.ts instead.
export function createRepository(): Repository {
  return new SqliteRepository();
}
