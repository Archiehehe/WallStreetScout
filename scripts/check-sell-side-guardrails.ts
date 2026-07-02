import { readFile } from 'node:fs/promises'
import path from 'node:path'

const sellSideDir = path.join(process.cwd(), 'src', 'lib', 'sellSideLists')
const targetFiles = [
  path.join(sellSideDir, 'extractListCandidate.ts'),
  path.join(sellSideDir, 'saveListCandidate.ts'),
  path.join(sellSideDir, 'validateListCandidate.ts'),
]

async function main() {
  const forbiddenImports = ['submitArticleUrl', '../ingestion', '@/lib/ingestion']
  const issues: string[] = []

  for (const file of targetFiles) {
    const content = await readFile(file, 'utf8')
    for (const token of forbiddenImports) {
      if (content.includes(token)) {
        issues.push(`${path.relative(process.cwd(), file)} contains forbidden token ${token}`)
      }
    }
  }

  if (issues.length > 0) {
    console.error('Sell-side guardrail check failed:')
    for (const issue of issues) console.error(`- ${issue}`)
    process.exit(1)
  }

  console.log('Sell-side guardrail check passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
