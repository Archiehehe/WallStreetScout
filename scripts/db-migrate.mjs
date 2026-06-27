import { readFile } from 'node:fs/promises'
import { neon } from '@neondatabase/serverless'

const databaseUrl = process.env.DATABASE_URL || process.env.STORAGE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set. STORAGE_URL is only used as a fallback.')
}

const sql = neon(databaseUrl)
const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8')

for (const statement of splitSql(schema)) {
  await sql.query(statement)
}

console.log('Database schema is up to date.')

function splitSql(input) {
  const statements = []
  let current = ''
  let inDollarBlock = false

  for (let index = 0; index < input.length; index++) {
    const char = input[index]
    const pair = input.slice(index, index + 2)

    if (pair === '$$') {
      inDollarBlock = !inDollarBlock
      current += pair
      index++
      continue
    }

    if (char === ';' && !inDollarBlock) {
      const statement = current.trim()
      if (statement) statements.push(statement)
      current = ''
      continue
    }

    current += char
  }

  const statement = current.trim()
  if (statement) statements.push(statement)
  return statements
}
