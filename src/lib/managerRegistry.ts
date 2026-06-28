export interface ManagerRegistryEntry {
  slug: string
  name: string
  cik?: string
  whalewisdomUrl: string
  strategyTags: string[]
}

export const MANAGER_REGISTRY: ManagerRegistryEntry[] = [
  {
    slug: 'coatue',
    name: 'Coatue Management',
    cik: '0001135730',
    whalewisdomUrl: 'https://whalewisdom.com/filer/coatue-management-llc',
    strategyTags: ['technology', 'AI', 'semiconductors', 'internet'],
  },
  { slug: 'tiger-global', name: 'Tiger Global Management', whalewisdomUrl: 'https://whalewisdom.com/filer/tiger-global-management-llc', strategyTags: ['technology', 'internet', 'growth'] },
  { slug: 'altimeter', name: 'Altimeter Capital Management', whalewisdomUrl: 'https://whalewisdom.com/filer/altimeter-capital-management-lp', strategyTags: ['technology', 'growth'] },
  { slug: 'lone-pine', name: 'Lone Pine Capital', whalewisdomUrl: 'https://whalewisdom.com/filer/lone-pine-capital-llc', strategyTags: ['growth', 'consumer', 'technology'] },
  { slug: 'd1-capital', name: 'D1 Capital Partners', whalewisdomUrl: 'https://whalewisdom.com/filer/d1-capital-partners-l-p', strategyTags: ['long-short', 'growth'] },
  { slug: 'duquesne', name: 'Duquesne Family Office', whalewisdomUrl: 'https://whalewisdom.com/filer/duquesne-family-office-llc', strategyTags: ['macro', 'growth'] },
  { slug: 'pershing-square', name: 'Pershing Square Capital Management', whalewisdomUrl: 'https://whalewisdom.com/filer/pershing-square-capital-management-l-p', strategyTags: ['activist', 'concentrated'] },
  { slug: 'third-point', name: 'Third Point', whalewisdomUrl: 'https://whalewisdom.com/filer/third-point-llc', strategyTags: ['event-driven', 'activist'] },
  { slug: 'appaloosa', name: 'Appaloosa Management', whalewisdomUrl: 'https://whalewisdom.com/filer/appaloosa-lp', strategyTags: ['opportunistic', 'macro'] },
  { slug: 'scion', name: 'Scion Asset Management', whalewisdomUrl: 'https://whalewisdom.com/filer/scion-asset-management-llc', strategyTags: ['value', 'concentrated'] },
  { slug: 'soros-fund-management', name: 'Soros Fund Management', whalewisdomUrl: 'https://whalewisdom.com/filer/soros-fund-management-llc', strategyTags: ['macro', 'multi-strategy'] },
  { slug: 'viking-global', name: 'Viking Global Investors', whalewisdomUrl: 'https://whalewisdom.com/filer/viking-global-investors-lp', strategyTags: ['long-short', 'growth'] },
  { slug: 'maverick-capital', name: 'Maverick Capital', whalewisdomUrl: 'https://whalewisdom.com/filer/maverick-capital-ltd', strategyTags: ['long-short', 'growth'] },
  { slug: 'baupost', name: 'Baupost Group', whalewisdomUrl: 'https://whalewisdom.com/filer/baupost-group-llc-ma', strategyTags: ['value', 'distressed'] },
  { slug: 'greenlight', name: 'Greenlight Capital', whalewisdomUrl: 'https://whalewisdom.com/filer/greenlight-capital-inc', strategyTags: ['value', 'long-short'] },
]
