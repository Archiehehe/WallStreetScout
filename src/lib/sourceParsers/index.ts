import type { Source } from '@/lib/storage/types'
import type { SourceParser } from './types'
import { genericInstitutionalParser } from './genericInstitutionalParser'
import { morganStanleyParser } from './parsers/morganStanley'
import { goldmanSachsParser } from './parsers/goldmanSachs'
import { jpmPrivateBankParser } from './parsers/jpmPrivateBank'
import { ubsCioParser } from './parsers/ubsCio'
import { bofaPrivateBankParser } from './parsers/bofaPrivateBank'
import { schwabParser } from './parsers/schwab'
import { fidelityParser } from './parsers/fidelity'
import { tRowePriceParser } from './parsers/tRowePrice'
import { capitalGroupParser } from './parsers/capitalGroup'
import { wellingtonParser } from './parsers/wellington'
import { blackRockParser } from './parsers/blackRock'
import { franklinTempletonParser } from './parsers/franklinTempleton'

const PARSER_REGISTRY: Record<string, SourceParser> = {
  generic: genericInstitutionalParser,
  morganStanley: morganStanleyParser,
  goldmanSachs: goldmanSachsParser,
  jpmPrivateBank: jpmPrivateBankParser,
  ubsCio: ubsCioParser,
  bofaPrivateBank: bofaPrivateBankParser,
  schwab: schwabParser,
  fidelity: fidelityParser,
  tRowePrice: tRowePriceParser,
  capitalGroup: capitalGroupParser,
  wellington: wellingtonParser,
  blackRock: blackRockParser,
  franklinTempleton: franklinTempletonParser,
}

export function getParserForSource(source: Source): SourceParser {
  const key = source.parserKey
  if (key && PARSER_REGISTRY[key]) {
    return PARSER_REGISTRY[key]
  }
  return genericInstitutionalParser
}

export function parserExistsForKey(key?: string | null): boolean {
  if (!key) return false
  return key in PARSER_REGISTRY
}

export function getAllParserKeys(): string[] {
  return Object.keys(PARSER_REGISTRY)
}

export { genericInstitutionalParser }
