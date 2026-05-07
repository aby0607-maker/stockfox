export const ALL_SEGMENT_IDS = [
  // Quant (7)
  'financial_health', 'profitability', 'growth', 'valuation', 'technical', 'performance', 'institutional_signals',
  // Qual (5)
  'management_governance', 'business_quality', 'capital_discipline', 'earnings_quality', 'execution_quality',
  // Risk (1)
  'risk',
] as const

export const FOCUS_MODE_DEFAULTS: Record<string, string[]> = {
  priya:  ['profitability', 'valuation', 'growth', 'financial_health', 'technical'],
  kavya:  ['financial_health', 'profitability', 'management_governance', 'business_quality'],
  meera:  ['technical', 'growth', 'performance'],
  sneha:  ['valuation', 'earnings_quality', 'profitability', 'financial_health'],
}
