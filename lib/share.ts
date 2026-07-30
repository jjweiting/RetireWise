import type { RetirementParams } from './types'

type NumericParamKey = Exclude<keyof RetirementParams, 'basis_label'>

interface ParamRule {
  query: string
  key: NumericParamKey
  min: number
  max: number
}

const PARAM_RULES: ParamRule[] = [
  { query: 'asset', key: 'current_base', min: 0, max: 50_000_000 },
  { query: 'saving', key: 'monthly_saving', min: 0, max: 1_000_000 },
  { query: 'expense', key: 'monthly_expense', min: 10_000, max: 300_000 },
  { query: 'age', key: 'current_age', min: 18, max: 90 },
  { query: 'life', key: 'death_age', min: 50, max: 120 },
  { query: 'pre', key: 'pre_return', min: 0, max: 30 },
  { query: 'post', key: 'post_return', min: 0, max: 15 },
  { query: 'inflation', key: 'inflation', min: 0, max: 8 },
  { query: 'withdrawal', key: 'withdrawal_rate', min: 2, max: 6 },
  { query: 'bequest', key: 'bequest', min: 0, max: 100_000_000 },
]

export interface ParsedSharedParams {
  params: RetirementParams
  name: string | null
}

export function parseSharedParams(search: string, defaults: RetirementParams): ParsedSharedParams {
  const query = search.startsWith('?') ? search.slice(1) : search
  const urlParams = new URLSearchParams(query)
  const params: RetirementParams = { ...defaults }

  for (const rule of PARAM_RULES) {
    const raw = urlParams.get(rule.query)
    if (raw === null) continue

    const value = Number(raw)
    if (!Number.isFinite(value) || value < rule.min || value > rule.max) continue
    params[rule.key] = value
  }

  const rawName = urlParams.get('name')?.trim()
  return { params, name: rawName ? rawName.slice(0, 80) : null }
}

export function serializeSharedParams(params: RetirementParams, name?: string | null): string {
  const urlParams = new URLSearchParams()

  for (const rule of PARAM_RULES) {
    urlParams.set(rule.query, String(params[rule.key]))
  }

  const cleanName = name?.trim()
  if (cleanName) urlParams.set('name', cleanName.slice(0, 80))

  return urlParams.toString()
}

export function buildShareUrl(origin: string, pathname: string, params: RetirementParams, name?: string | null): string {
  const path = pathname || '/'
  return `${origin}${path}?${serializeSharedParams(params, name)}`
}
