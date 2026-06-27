export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.STORAGE_URL
}
