/**
 * StockFox News & Corporate Event Classification
 * 48 event types across 8 buckets
 *
 * Each event type has:
 * - keywords: regex patterns to match against headline/description text
 * - bucket: which NewsBucket it belongs to
 * - defaultSeverity: baseline severity (can be overridden by sentiment detection)
 * - investorMeaning: template for what this event means for investors
 * - impactSegments: which V2 analysis segments this affects
 */

import type { NewsBucket } from '@/types'

export interface EventTypeDefinition {
  id: string
  label: string
  bucket: NewsBucket
  keywords: RegExp
  defaultSeverity: 'positive' | 'neutral' | 'watch' | 'flag' | 'hard_stop'
  investorMeaning: string
  impactSegments: string[]
}

// ─── Bucket 1: Financial Performance (8 types) ──────────

const FINANCIAL_PERFORMANCE: EventTypeDefinition[] = [
  {
    id: 'financial_results',
    label: 'Financial Results',
    bucket: 'financial_performance',
    keywords: /\b(quarterly result|q[1-4]\s*(fy|result)|annual result|financial result|profit after tax|net profit|revenue\s+(growth|decline|miss|beat)|PAT\s|EBITDA\s|earnings\s+(report|release))\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Official financial results — check revenue growth, margin trends, and cash flow quality',
    impactSegments: ['profitability', 'growth', 'earnings_quality'],
  },
  {
    id: 'concall_summary',
    label: 'Concall Summary',
    bucket: 'financial_performance',
    keywords: /\b(concall|con-call|earnings call|management call|analyst call|investor call|conference call)\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Management commentary on strategy and outlook — watch for tone shifts vs prior quarter',
    impactSegments: ['execution_quality', 'business_quality'],
  },
  {
    id: 'capex_impact',
    label: 'Capex Impact',
    bucket: 'financial_performance',
    keywords: /\b(capex|capital expenditure|new plant|new factory|capacity expansion|capacity addition|greenfield|brownfield)\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Capital investment announcement — assess impact on capacity and returns',
    impactSegments: ['capital_discipline', 'growth'],
  },
  {
    id: 'earnings_revision',
    label: 'Earnings Revision',
    bucket: 'financial_performance',
    keywords: /\b(earnings (revision|estimate|forecast|outlook)|EPS (revision|estimate|upgrade|downgrade)|consensus (estimate|revision)|target price (raise|cut|revision))\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Analyst earnings estimate change — direction and magnitude signals forward expectations',
    impactSegments: ['profitability', 'valuation'],
  },
  {
    id: 'dividend_declaration',
    label: 'Dividend Declaration',
    bucket: 'financial_performance',
    keywords: /\b(dividend\s+(declared|announced|recommend|payout|interim|final|special)|per share dividend|dividend yield)\b/i,
    defaultSeverity: 'positive',
    investorMeaning: 'Dividend payout signals cash generation confidence and shareholder-friendly allocation',
    impactSegments: ['capital_discipline', 'financial_health'],
  },
  {
    id: 'guidance_update',
    label: 'Guidance Update',
    bucket: 'financial_performance',
    keywords: /\b(guidance\s+(update|revision|upgrade|downgrade|cut|raise)|revenue guidance|margin guidance|outlook\s+(raised|lowered|maintained|revised))\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Management guidance change — highest-signal event for near-term expectations',
    impactSegments: ['execution_quality', 'growth'],
  },
  {
    id: 'credit_rating',
    label: 'Credit Rating',
    bucket: 'financial_performance',
    keywords: /\b(credit rating|rating (upgrade|downgrade|affirm|outlook)|CRISIL|ICRA|CARE rating|India Rating|Fitch|Moody|S&P\s+rating|rating agency)\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Credit rating change directly impacts borrowing costs and signals financial health trajectory',
    impactSegments: ['financial_health'],
  },
  {
    id: 'investor_presentation',
    label: 'Investor Presentation',
    bucket: 'financial_performance',
    keywords: /\b(investor (presentation|day|meet)|analyst (day|meet)|capital markets day|CMD\b)\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Management strategic narrative — compare targets with prior presentations for credibility',
    impactSegments: ['execution_quality'],
  },
]

// ─── Bucket 2: Corporate Actions (6 types) ──────────

const CORPORATE_ACTIONS: EventTypeDefinition[] = [
  {
    id: 'fund_raise',
    label: 'Fund Raise',
    bucket: 'corporate_actions',
    keywords: /\b(QIP|preferential allotment|NCD|rights issue|fund raise|fundraise|equity dilution|share issuance|fresh issue|private placement)\b/i,
    defaultSeverity: 'watch',
    investorMeaning: 'Equity/debt fundraise — assess dilution risk vs growth-enabling potential',
    impactSegments: ['capital_discipline', 'financial_health'],
  },
  {
    id: 'ipo_lockin_expiry',
    label: 'IPO Lock-in Expiry',
    bucket: 'corporate_actions',
    keywords: /\b(lock.in expir|lock.up expir|pre.IPO (share|shareholder|investor)|anchor investor|PE exit|VC exit)\b/i,
    defaultSeverity: 'watch',
    investorMeaning: 'Pre-IPO shareholders can now sell — watch for selling pressure on stock',
    impactSegments: ['institutional_signals'],
  },
  {
    id: 'block_bulk_deal',
    label: 'Block & Bulk Deal',
    bucket: 'corporate_actions',
    keywords: /\b(block deal|bulk deal|large trade|institutional (buy|sell|deal)|stake (purchase|sale|acquisition))\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Large institutional trade — buyer identity and premium/discount signal conviction',
    impactSegments: ['institutional_signals'],
  },
  {
    id: 'bonus_split_rights',
    label: 'Bonus / Split / Rights',
    bucket: 'corporate_actions',
    keywords: /\b(bonus issue|stock split|share split|rights issue|bonus\s+\d+:\d+|split\s+\d+:\d+)\b/i,
    defaultSeverity: 'positive',
    investorMeaning: 'Capital structure event — bonus/split signals confidence, rights may signal stress',
    impactSegments: ['capital_discipline'],
  },
  {
    id: 'buyback',
    label: 'Buyback',
    bucket: 'corporate_actions',
    keywords: /\b(buyback|buy.back|share (repurchase|repurchasing)|tender offer)\b/i,
    defaultSeverity: 'positive',
    investorMeaning: 'Share buyback signals management believes stock is undervalued',
    impactSegments: ['capital_discipline', 'valuation'],
  },
  {
    id: 'delisting_suspension',
    label: 'Delisting / Suspension',
    bucket: 'corporate_actions',
    keywords: /\b(delist|suspension|trading halt|trading suspended|compulsory delist|voluntary delist)\b/i,
    defaultSeverity: 'hard_stop',
    investorMeaning: 'Stock removed from exchange — immediate action required',
    impactSegments: ['management_governance'],
  },
]

// ─── Bucket 3: Governance & Ownership (8 types) ──────────

const GOVERNANCE_OWNERSHIP: EventTypeDefinition[] = [
  {
    id: 'promoter_buying_selling',
    label: 'Promoter Buy/Sell',
    bucket: 'governance_ownership',
    keywords: /\b(promoter (buy|sell|acqui|dispos|increas|decreas|stake)|insider (buy|sell|trad)|SAST\b|promoter holding)\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Promoter trading signals confidence (buying) or concern (selling)',
    impactSegments: ['management_governance', 'institutional_signals'],
  },
  {
    id: 'pledge_change',
    label: 'Pledge Change',
    bucket: 'governance_ownership',
    keywords: /\b(pledge|pledg|encumbrance|shares pledged|pledge (creation|release|invocation))\b/i,
    defaultSeverity: 'watch',
    investorMeaning: 'Promoter pledging shares as collateral — high pledge = forced selling risk in downturns',
    impactSegments: ['management_governance'],
  },
  {
    id: 'board_meeting',
    label: 'Board Meeting',
    bucket: 'governance_ownership',
    keywords: /\b(board meeting|board of directors|AGM|annual general meeting|EGM|extraordinary general meeting)\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Board meeting — watch for agenda items affecting capital allocation or governance',
    impactSegments: ['management_governance'],
  },
  {
    id: 'key_managerial_change',
    label: 'Key Managerial Change',
    bucket: 'governance_ownership',
    keywords: /\b(CEO (appoint|resign|step down|exit)|CFO (appoint|resign)|MD (appoint|resign)|managing director|key managerial|CTO|COO|board (appoint|resign|induction))\b/i,
    defaultSeverity: 'watch',
    investorMeaning: 'Leadership change — assess impact on strategy continuity and execution',
    impactSegments: ['management_governance', 'execution_quality'],
  },
  {
    id: 'auditor_change',
    label: 'Auditor Change',
    bucket: 'governance_ownership',
    keywords: /\b(auditor (change|resign|appoint|replacement)|statutory auditor|audit (firm|qualification|opinion))\b/i,
    defaultSeverity: 'watch',
    investorMeaning: 'Auditor change — unexplained changes may signal accounting concerns',
    impactSegments: ['earnings_quality', 'management_governance'],
  },
  {
    id: 'related_party_transaction',
    label: 'Related Party Txn',
    bucket: 'governance_ownership',
    keywords: /\b(related party|RPT|inter.company|group company transaction|promoter entity)\b/i,
    defaultSeverity: 'watch',
    investorMeaning: 'Related party transaction — high RPT as % of revenue raises self-dealing concerns',
    impactSegments: ['management_governance', 'earnings_quality'],
  },
  {
    id: 'regulatory_action',
    label: 'SEBI / Regulatory Action',
    bucket: 'governance_ownership',
    keywords: /\b(SEBI (order|notice|action|penalty|investigation)|regulatory (action|penalty|fine|notice)|compliance (issue|violation)|show cause|adjudication)\b/i,
    defaultSeverity: 'flag',
    investorMeaning: 'Regulatory action — monitor for material impact on operations or reputation',
    impactSegments: ['management_governance'],
  },
  {
    id: 'major_shareholder_change',
    label: 'Major Shareholder Change',
    bucket: 'governance_ownership',
    keywords: /\b(FII (increase|decrease|exit)|DII (increase|decrease)|mutual fund (buy|sell|exit)|institutional (holding|investor)|shareholding pattern)\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Institutional ownership change — smart money flows signal conviction direction',
    impactSegments: ['institutional_signals'],
  },
]

// ─── Bucket 4: Strategic & Business (6 types) ──────────

const STRATEGIC_BUSINESS: EventTypeDefinition[] = [
  {
    id: 'acquisition',
    label: 'Acquisition',
    bucket: 'strategic_business',
    keywords: /\b(acqui(re|sition)|takeover|merger|M&A|buy(s|ing) company|absorb|amalgamat)\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Acquisition — assess strategic fit, valuation paid, and integration risk',
    impactSegments: ['capital_discipline', 'growth'],
  },
  {
    id: 'divestiture',
    label: 'Divestiture / Stake Sale',
    bucket: 'strategic_business',
    keywords: /\b(divest|stake sale|sell(s|ing) (business|unit|division|stake|subsidiary)|asset sale|disinvest)\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Divestiture — assess whether it unlocks value or signals distress',
    impactSegments: ['capital_discipline', 'business_quality'],
  },
  {
    id: 'jv_partnership',
    label: 'JV / Partnership',
    bucket: 'strategic_business',
    keywords: /\b(joint venture|JV\b|partnership|strategic alliance|collaboration|MoU|memorandum of understanding|tie.up)\b/i,
    defaultSeverity: 'positive',
    investorMeaning: 'Strategic partnership — assess partner quality and revenue/capability impact',
    impactSegments: ['business_quality', 'growth'],
  },
  {
    id: 'new_product_launch',
    label: 'New Product / Launch',
    bucket: 'strategic_business',
    keywords: /\b(new product|launch|new service|new segment|new vertical|new market|expansion into|foray into|enters)\b/i,
    defaultSeverity: 'positive',
    investorMeaning: 'Product/market expansion — assess TAM potential and execution capability',
    impactSegments: ['growth', 'business_quality'],
  },
  {
    id: 'order_win_loss',
    label: 'Order Win / Loss',
    bucket: 'strategic_business',
    keywords: /\b(order (win|book|bagged|secured|received|loss|cancel)|contract (win|award|bagged|cancel)|deal (win|signed|bagged)|mandate)\b/i,
    defaultSeverity: 'positive',
    investorMeaning: 'Order flow signals revenue visibility and competitive positioning',
    impactSegments: ['growth', 'execution_quality'],
  },
  {
    id: 'capacity_expansion',
    label: 'Capacity Expansion',
    bucket: 'strategic_business',
    keywords: /\b(capacity (expansion|addition|increase|ramp)|new (facility|warehouse|store|branch|outlet)|commissioning|operational capacity)\b/i,
    defaultSeverity: 'positive',
    investorMeaning: 'Capacity growth signals demand confidence — watch execution timeline',
    impactSegments: ['growth', 'capital_discipline'],
  },
]

// ─── Bucket 5: External & Macro (6 types) ──────────

const EXTERNAL_MACRO: EventTypeDefinition[] = [
  {
    id: 'government_policy',
    label: 'Government Policy',
    bucket: 'external_macro',
    keywords: /\b(government (policy|announce|decision)|PLI scheme|policy (change|update|reform)|budget (impact|announce)|subsidy|tariff (change|impose|hike|cut))\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Policy change — assess direct impact on company operations and sector dynamics',
    impactSegments: ['growth', 'business_quality'],
  },
  {
    id: 'sector_inflection',
    label: 'Sector Event',
    bucket: 'external_macro',
    keywords: /\b(sector (outlook|headwind|tailwind|rotation|rally|selloff)|industry (trend|shift|disruption)|commodity (price|cycle)|crude oil|interest rate|RBI (policy|rate)|inflation)\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Sector-wide event — assess whether the company is positioned to benefit or suffer',
    impactSegments: ['growth', 'valuation'],
  },
  {
    id: 'gst_tax_notice',
    label: 'GST / Tax Notice',
    bucket: 'external_macro',
    keywords: /\b(GST (notice|demand|order)|tax (notice|demand|dispute|order|penalty)|income tax|advance ruling|transfer pricing)\b/i,
    defaultSeverity: 'watch',
    investorMeaning: 'Tax dispute — assess contingent liability size relative to net worth',
    impactSegments: ['earnings_quality', 'financial_health'],
  },
  {
    id: 'esg_rating',
    label: 'ESG Rating Change',
    bucket: 'external_macro',
    keywords: /\b(ESG (rating|score|upgrade|downgrade)|sustainability|carbon (credit|footprint|neutral)|green bond|BRSR)\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'ESG change — increasingly affects institutional fund flows and cost of capital',
    impactSegments: ['management_governance'],
  },
  {
    id: 'litigation',
    label: 'Litigation / Legal',
    bucket: 'external_macro',
    keywords: /\b(litigation|lawsuit|legal (notice|action|dispute|proceeding)|court (order|ruling|verdict)|arbitration|NCLT|NCLAT|winding up)\b/i,
    defaultSeverity: 'watch',
    investorMeaning: 'Legal proceeding — monitor for material financial or operational impact',
    impactSegments: ['management_governance', 'financial_health'],
  },
  {
    id: 'other_macro',
    label: 'Macro Event',
    bucket: 'external_macro',
    keywords: /\b(geopolitical|trade war|sanctions|currency (deprec|appreci)|rupee (fall|rise)|forex|FDI|FPI (inflow|outflow)|global (recession|slowdown))\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Macro event — assess exposure through revenue mix and supply chain',
    impactSegments: ['growth'],
  },
]

// ─── Bucket 6: Market Signals (4 types) ──────────

const MARKET_SIGNALS: EventTypeDefinition[] = [
  {
    id: '52w_high_low',
    label: '52W High / Low',
    bucket: 'market_signals',
    keywords: /\b(52.week (high|low)|all.time (high|low)|ATH|new high|new low|life.time high|52W)\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Price milestone — 52W high may signal momentum, 52W low may signal value or distress',
    impactSegments: ['technical', 'performance'],
  },
  {
    id: 'unusual_volume',
    label: 'Unusual Volume',
    bucket: 'market_signals',
    keywords: /\b(unusual volume|volume spike|heavy volume|volume surge|abnormal (volume|trading)|high (volume|turnover))\b/i,
    defaultSeverity: 'watch',
    investorMeaning: 'Volume spike — often precedes or accompanies significant price moves',
    impactSegments: ['technical'],
  },
  {
    id: 'index_inclusion',
    label: 'Index Inclusion / Exclusion',
    bucket: 'market_signals',
    keywords: /\b(index (inclusion|exclusion|addition|removal|entry|exit)|Nifty (50|100|200|500|add|remov)|Sensex (add|remov)|MSCI (add|remov|includ|exclud)|index rebalance)\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Index change triggers passive fund flows — inclusion is typically positive for demand',
    impactSegments: ['institutional_signals'],
  },
  {
    id: 'short_interest',
    label: 'Short Interest / F&O',
    bucket: 'market_signals',
    keywords: /\b(short (interest|sell|squeeze|cover|build)|F&O (ban|data)|open interest|put.call ratio|options (activity|chain)|futures (rollover|premium|discount))\b/i,
    defaultSeverity: 'watch',
    investorMeaning: 'Derivatives signal — high short interest can lead to short squeezes or confirm bearish view',
    impactSegments: ['technical'],
  },
]

// ─── Bucket 7: Sentiment & Third Party (4 types) ──────────

const SENTIMENT_THIRD_PARTY: EventTypeDefinition[] = [
  {
    id: 'analyst_upgrade',
    label: 'Analyst Upgrade',
    bucket: 'sentiment_third_party',
    keywords: /\b(analyst upgrade|broker upgrade|rating upgrade|upgrade.+to buy|initiat.+buy|outperform|overweight|accumulate)\b/i,
    defaultSeverity: 'positive',
    investorMeaning: 'Analyst upgrade — positive shift in professional assessment of the stock',
    impactSegments: ['valuation'],
  },
  {
    id: 'analyst_downgrade',
    label: 'Analyst Downgrade',
    bucket: 'sentiment_third_party',
    keywords: /\b(analyst downgrade|broker downgrade|rating downgrade|downgrade.+to (sell|hold|reduce)|underperform|underweight|reduce)\b/i,
    defaultSeverity: 'watch',
    investorMeaning: 'Analyst downgrade — negative shift in professional assessment of the stock',
    impactSegments: ['valuation'],
  },
  {
    id: 'target_price_change',
    label: 'Target Price Change',
    bucket: 'sentiment_third_party',
    keywords: /\b(target price (raise|cut|hike|lower|revision|set)|price target|TP (raise|cut|hike|revision)|fair value)\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Analyst target price change — direction more important than absolute number',
    impactSegments: ['valuation'],
  },
  {
    id: 'share_price_move',
    label: 'Share Price Move',
    bucket: 'sentiment_third_party',
    keywords: /\b(share(s)? (surge|crash|rally|tank|plunge|jump|soar|tumble|fall|drop|rise|gain|slip)|stock (surge|crash|rally|tank|plunge|jump|soar|tumble)|market cap (cross|hit|breach))\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Significant price movement — assess whether driven by fundamentals or sentiment',
    impactSegments: ['technical', 'performance'],
  },
]

// ─── Bucket 8: Documents & Reference (4 types) ──────────

const DOCUMENTS_REFERENCE: EventTypeDefinition[] = [
  {
    id: 'annual_report',
    label: 'Annual Report',
    bucket: 'documents_reference',
    keywords: /\b(annual report|integrated report|sustainability report|CSR report)\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Annual report — comprehensive disclosure for deep-dive analysis',
    impactSegments: ['management_governance', 'earnings_quality'],
  },
  {
    id: 'press_release',
    label: 'Press Release',
    bucket: 'documents_reference',
    keywords: /\b(press release|media release|company (announce|statement)|official statement)\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Official company communication — assess material information disclosed',
    impactSegments: [],
  },
  {
    id: 'insider_filing',
    label: 'Insider Filing',
    bucket: 'documents_reference',
    keywords: /\b(SAST filing|insider (filing|disclosure|trading)|designated person|DPT\b|insider report)\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Regulatory insider disclosure — pattern of trades matters more than individual filing',
    impactSegments: ['management_governance'],
  },
  {
    id: 'other_filing',
    label: 'Other Filing',
    bucket: 'documents_reference',
    keywords: /\b(exchange filing|BSE filing|NSE filing|corporate filing|regulatory filing|disclosure)\b/i,
    defaultSeverity: 'neutral',
    investorMeaning: 'Exchange filing — review for material information',
    impactSegments: [],
  },
]

// ─── Full Taxonomy (all 48 types) ──────────

export const EVENT_TAXONOMY: EventTypeDefinition[] = [
  ...FINANCIAL_PERFORMANCE,
  ...CORPORATE_ACTIONS,
  ...GOVERNANCE_OWNERSHIP,
  ...STRATEGIC_BUSINESS,
  ...EXTERNAL_MACRO,
  ...MARKET_SIGNALS,
  ...SENTIMENT_THIRD_PARTY,
  ...DOCUMENTS_REFERENCE,
]

// ─── Classification Function ──────────

/**
 * Classify a news headline into one of 48 event types.
 * Returns the best-matching EventTypeDefinition, or a generic fallback.
 */
export function classifyNewsEvent(headline: string): EventTypeDefinition {
  for (const eventType of EVENT_TAXONOMY) {
    if (eventType.keywords.test(headline)) {
      return eventType
    }
  }

  // Fallback: generic market news
  return {
    id: 'market_news',
    label: 'Market News',
    bucket: 'external_macro',
    keywords: /./,
    defaultSeverity: 'neutral',
    investorMeaning: 'Market news — assess relevance to your investment thesis',
    impactSegments: [],
  }
}

/**
 * Classify a BSE corporate action purpose string into an event type.
 */
export function classifyCorporateAction(purpose: string): EventTypeDefinition {
  const lower = purpose.toLowerCase()
  if (lower.includes('dividend')) return EVENT_TAXONOMY.find(e => e.id === 'dividend_declaration')!
  if (lower.includes('bonus') || lower.includes('split') || lower.includes('rights')) return EVENT_TAXONOMY.find(e => e.id === 'bonus_split_rights')!
  if (lower.includes('buyback') || lower.includes('buy back')) return EVENT_TAXONOMY.find(e => e.id === 'buyback')!
  if (lower.includes('delist')) return EVENT_TAXONOMY.find(e => e.id === 'delisting_suspension')!
  return EVENT_TAXONOMY.find(e => e.id === 'bonus_split_rights')!
}

/**
 * Classify a BSE insider filing into an event type.
 */
export function classifyInsiderFiling(headline: string): EventTypeDefinition {
  const lower = headline.toLowerCase()
  if (lower.includes('pledge') || lower.includes('encumbrance')) return EVENT_TAXONOMY.find(e => e.id === 'pledge_change')!
  if (lower.includes('designated person') || lower.includes('dpt')) return EVENT_TAXONOMY.find(e => e.id === 'insider_filing')!
  return EVENT_TAXONOMY.find(e => e.id === 'promoter_buying_selling')!
}
