import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const sourceDir = new URL('../src/lib/source-registry/sources/', import.meta.url)
const files = (await readdir(sourceDir)).filter(f => f.endsWith('.json'))

// Map of domain -> updates to apply
const UPDATES = {
  // --- Good sources with article index URLs ---
  'aqr-capital-management.json': {
    knownArticleIndexUrls: ['https://www.aqr.com/Insights'],
    allowedPathPatterns: ['/Insights', '/insights'],
    blockedPathPatterns: ['/funds', '/products', '/about', '/careers'],
  },
  'research-affiliates.json': {
    knownArticleIndexUrls: ['https://www.researchaffiliates.com/insights'],
    allowedPathPatterns: ['/insights'],
  },
  'pimco.json': {
    knownArticleIndexUrls: ['https://www.pimco.com/us/en/insights'],
    allowedPathPatterns: ['/insights'],
    blockedPathPatterns: ['/funds', '/products', '/etf', '/resources', '/education', '/careers'],
    preferredDiscoveryMethod: 'rss',
  },
  'blackrock-investment-institute.json': {
    knownArticleIndexUrls: ['https://www.blackrock.com/us/individual/insights/black-rock-investment-institute'],
    allowedPathPatterns: ['/insights'],
    blockedPathPatterns: ['/funds', '/products', '/etf', '/resources', '/careers'],
    preferredDiscoveryMethod: 'rss',
  },
  'goldman-sachs-insights.json': {
    knownArticleIndexUrls: ['https://www.goldmansachs.com/insights'],
    allowedPathPatterns: ['/insights'],
    blockedPathPatterns: ['/about', '/careers'],
  },
  'morgan-stanley-insights.json': {
    knownArticleIndexUrls: ['https://www.morganstanley.com/ideas'],
    allowedPathPatterns: ['/ideas', '/insights', '/articles'],
    blockedPathPatterns: ['/press-release', '/press-releases', '/about', '/careers', '/funds', '/etf'],
  },
  'j-p-morgan-research.json': {
    knownArticleIndexUrls: ['https://www.jpmorgan.com/insights'],
    allowedPathPatterns: ['/insights'],
    blockedPathPatterns: ['/about', '/careers'],
  },
  'j-p-morgan-private-bank.json': {
    knownArticleIndexUrls: ['https://www.privatebank.jpmorgan.com/articles'],
    allowedPathPatterns: ['/articles'],
    blockedPathPatterns: ['/about', '/contact', '/giving', '/philanthropy'],
  },
  'ubs.json': {
    knownArticleIndexUrls: ['https://www.ubs.com/global/en/investment-bank/in-focus.html'],
    allowedPathPatterns: ['/investment-bank/in-focus', '/global/en/wealth-management/insights'],
  },
  'ing-think.json': {
    knownArticleIndexUrls: ['https://think.ing.com'],
    allowedPathPatterns: ['/en/think'],
  },
  'apollo.json': {
    knownArticleIndexUrls: ['https://www.apollo.com/insights-news'],
    allowedPathPatterns: ['/insights-news', '/insights'],
    blockedPathPatterns: ['/about', '/careers', '/strategies'],
  },
  'kkr.json': {
    knownArticleIndexUrls: ['https://www.kkr.com/insights'],
    allowedPathPatterns: ['/insights'],
    blockedPathPatterns: ['/about', '/careers', '/invest', '/approach'],
  },
  'schroders.json': {
    knownArticleIndexUrls: ['https://www.schroders.com/en/insights'],
    allowedPathPatterns: ['/en/insights'],
  },
  'amundi-investment-institute.json': {
    knownArticleIndexUrls: ['https://www.amundi.com/amundi-insights'],
    allowedPathPatterns: ['/amundi-insights'],
  },
  'northerntrust.com.json': {
    // NOTE: actual filename may differ
    knownArticleIndexUrls: ['https://www.northerntrust.com/united-states/insights-research'],
    allowedPathPatterns: ['/insights-research', '/insights'],
  },
  'charles-schwab.json': {
    knownArticleIndexUrls: ['https://www.schwab.com/learn'],
    allowedPathPatterns: ['/learn'],
    blockedPathPatterns: ['/about', '/careers', '/contact'],
  },
  'fidelity.json': {
    knownArticleIndexUrls: ['https://www.fidelity.com/thinking/about-investing'],
    allowedPathPatterns: ['/thinking'],
  },
  'capital-group.json': {
    knownArticleIndexUrls: ['https://www.capitalgroup.com/insights'],
    allowedPathPatterns: ['/insights'],
  },
  'franklin-templeton.json': {
    knownArticleIndexUrls: ['https://www.franklintempleton.com/insights'],
    allowedPathPatterns: ['/insights'],
    blockedPathPatterns: ['/products', '/funds', '/resources', '/about'],
  },
  'vanguard.json': {
    knownArticleIndexUrls: ['https://institutional.vanguard.com/insights'],
    allowedPathPatterns: ['/insights', '/institutional/insights'],
    blockedPathPatterns: ['/funds', '/products', '/etf', '/about', '/careers'],
  },
  'wells-fargo.json': {
    knownArticleIndexUrls: ['https://www.wellsfargo.com/insights'],
    allowedPathPatterns: ['/insights'],
  },

  // --- Disable noisy/hard-to-scope sources ---
  'bridgewater.json': {
    enabled: false,
    accessNote: 'Disabled: no public article feed available, only sitemap XML files.',
  },
  't-rowe-price.json': {
    enabled: false,
    accessNote: 'Disabled: only sitemap XML files discovered, no public article RSS/feed.',
  },
  'standard-chartered.json': {},  // not found, will be handled by DB sync
  'db-research.json': {},  // might be named differently

  // --- Disabled by default already, but add explicit scoping ---
  'wellington-management.json': {
    enabled: false,
    sourceNeedsUrlPattern: true,
    accessNote: 'Disabled: needs a known article index URL to be configured.',
  },
  'gmo.json': {
    enabled: false,
    allowedPathPatterns: ['/americas'],
    blockedPathPatterns: ['/product-index', '/funds'],
    accessNote: 'Disabled: only product pages discovered. Needs article index URL.',
  },
  'blue-owl-capital.json': {
    enabled: false,
    sourceNeedsUrlPattern: true,
    accessNote: 'Disabled: only brochure/product pages on public site.',
  },
  'hamilton-lane.json': {
    enabled: false,
    sourceNeedsUrlPattern: true,
    accessNote: 'Disabled: only product/solution pages discovered.',
  },
  'brookfield.json': {
    enabled: false,
    allowedPathPatterns: ['/views-news'],
    accessNote: 'Disabled: nearly all discovered content is Portuguese-translated duplicates or generic pages.',
  },
  'ares-management.json': {
    enabled: false,
    sourceNeedsUrlPattern: true,
    accessNote: 'Disabled: no public article discovery path available.',
    qualityScore: 5,
  },
  'oaktree-capital.json': {
    enabled: false,
    sourceNeedsUrlPattern: true,
    accessNote: 'Disabled: Howard Marks memos require login; no other public article feed.',
    qualityScore: 5,
  },
  'man-group.json': {  // might be named differently
    enabled: false,
    sourceNeedsUrlPattern: true,
    accessNote: 'Disabled: no public article feed/RSS discovered.',
  },
  'twosigma.json': {  // might be named differently
    enabled: false,
    sourceNeedsUrlPattern: true,
    accessNote: 'Disabled: no public article feed/RSS discovered.',
  },
  'jane-street.json': {  // might be named differently
    enabled: false,
    sourceNeedsUrlPattern: true,
    accessNote: 'Disabled: no public article feed/RSS discovered.',
  },
  'lazard-asset-management.json': {
    enabled: false,
    sourceNeedsUrlPattern: true,
    accessNote: 'Disabled: no public article feed discovered.',
  },
  'invesco.json': {
    enabled: false,
    sourceNeedsUrlPattern: true,
    accessNote: 'Disabled: only product/fund pages discovered. Needs article index URL.',
  },
  'ssga.json': {
    enabled: false,
    sourceNeedsUrlPattern: true,
    accessNote: 'Disabled: no public article feed discovered.',
  },
  'carlyle.json': {
    enabled: false,
    sourceNeedsUrlPattern: true,
    accessNote: 'Disabled: only press-release/career pages discovered.',
  },
}

// Read the actual filenames from the directory
const nameMap = {}
for (const f of files) {
  nameMap[f.toLowerCase()] = f
}

// Apply updates
for (const [key, updates] of Object.entries(UPDATES)) {
  const lowerKey = key.toLowerCase()
  let filename = nameMap[lowerKey] || nameMap[lowerKey.replace(/-/g, '')]

  if (!filename) {
    // Try partial match
    const words = key.replace(/\.json$/, '').split(/[-_]/)
    filename = files.find(f => words.some(w => f.toLowerCase().includes(w)))
  }

  if (!filename) {
    console.log(`SKIP: no file found for ${key}`)
    continue
  }

  const filepath = new URL(path.basename(filename), sourceDir)
  const content = await readFile(filepath, 'utf8')
  const source = JSON.parse(content)

  let changed = false
  for (const [k, v] of Object.entries(updates)) {
    if (JSON.stringify(source[k]) !== JSON.stringify(v)) {
      source[k] = v
      changed = true
    }
  }

  if (changed) {
    await writeFile(filepath, JSON.stringify(source, null, 2) + '\n')
    console.log(`UPDATED: ${filename}`)
  } else {
    console.log(`UNCHANGED: ${filename}`)
  }
}

console.log('\nDone. Check for any files that need manual updates.')
