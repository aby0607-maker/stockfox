/**
 * StockFox 200+ Metrics Definitions
 * Organized by 11 Analysis Segments
 * Source: Tickertape Screener Parameters
 */

// Metric definition template type
export interface MetricDefinition {
  id: string
  name: string
  segment: string
  cluster: string
  unit: string
  formula?: string
  tooltipSimple: string
  tooltipAdvanced: string
  higherIsBetter: boolean
  benchmarks: {
    excellent: number
    good: number
    fair: number
    poor: number
  }
  sectorSpecific?: boolean
}

// ===========================================
// SEGMENT 1: PROFITABILITY (14 metrics)
// ===========================================
export const profitabilityMetrics: MetricDefinition[] = [
  {
    id: 'roce',
    name: 'Return on Capital Employed (ROCE)',
    segment: 'profitability',
    cluster: 'return_metrics',
    unit: '%',
    formula: 'EBIT ÷ Capital Employed × 100',
    tooltipSimple: 'How efficiently the company uses its capital to generate profits',
    tooltipAdvanced: 'ROCE measures the profitability relative to the capital invested in the business. Higher ROCE indicates better efficiency in using capital to generate operating profits. Compare against cost of capital and peers.',
    higherIsBetter: true,
    benchmarks: { excellent: 20, good: 15, fair: 10, poor: 5 }
  },
  {
    id: 'roe',
    name: 'Return on Equity (ROE)',
    segment: 'profitability',
    cluster: 'return_metrics',
    unit: '%',
    formula: 'Net Profit ÷ Average Shareholders\' Equity × 100',
    tooltipSimple: 'Profit earned for each rupee invested by shareholders',
    tooltipAdvanced: 'ROE measures profitability relative to shareholder equity. High ROE (>15%) with low debt indicates a quality business with competitive advantages. However, very high ROE may indicate high leverage.',
    higherIsBetter: true,
    benchmarks: { excellent: 20, good: 15, fair: 10, poor: 5 }
  },
  {
    id: 'roe_5y_avg',
    name: '5-Year Average ROE',
    segment: 'profitability',
    cluster: 'return_metrics',
    unit: '%',
    tooltipSimple: 'Average ROE over the past 5 years',
    tooltipAdvanced: 'Smooths out cyclical fluctuations to show sustainable return on equity. Consistent high ROE indicates durable competitive advantages.',
    higherIsBetter: true,
    benchmarks: { excellent: 18, good: 14, fair: 10, poor: 5 }
  },
  {
    id: 'roa',
    name: 'Return on Assets (ROA)',
    segment: 'profitability',
    cluster: 'return_metrics',
    unit: '%',
    formula: 'Net Profit ÷ Average Total Assets × 100',
    tooltipSimple: 'How well the company uses its assets to generate profit',
    tooltipAdvanced: 'ROA shows profit generation efficiency from all assets. Important for asset-heavy businesses like manufacturing. Compare within same industry.',
    higherIsBetter: true,
    benchmarks: { excellent: 12, good: 8, fair: 5, poor: 2 }
  },
  {
    id: 'roa_5y_avg',
    name: '5-Year Average ROA',
    segment: 'profitability',
    cluster: 'return_metrics',
    unit: '%',
    tooltipSimple: 'Average ROA over the past 5 years',
    tooltipAdvanced: 'Shows consistency of asset utilization efficiency over time.',
    higherIsBetter: true,
    benchmarks: { excellent: 10, good: 7, fair: 4, poor: 2 }
  },
  {
    id: 'roi',
    name: 'Return on Investment (ROI)',
    segment: 'profitability',
    cluster: 'return_metrics',
    unit: '%',
    formula: 'Net Income ÷ (Equity + Long-term Debt + Long-term Liabilities) × 100',
    tooltipSimple: 'Returns generated on total capital invested',
    tooltipAdvanced: 'ROI measures efficiency of total capital deployment including debt. Useful for comparing capital allocation decisions across different investments.',
    higherIsBetter: true,
    benchmarks: { excellent: 18, good: 12, fair: 8, poor: 4 }
  },
  {
    id: 'net_profit_margin',
    name: 'Net Profit Margin',
    segment: 'profitability',
    cluster: 'margin_metrics',
    unit: '%',
    formula: 'Net Profit ÷ Revenue × 100',
    tooltipSimple: 'Percentage of revenue that becomes profit',
    tooltipAdvanced: 'Shows how much of each rupee of sales the company keeps as profit after all expenses. Higher margins indicate pricing power and cost efficiency.',
    higherIsBetter: true,
    benchmarks: { excellent: 20, good: 12, fair: 6, poor: 2 },
    sectorSpecific: true
  },
  {
    id: 'net_profit_margin_5y_avg',
    name: '5-Year Avg Net Profit Margin',
    segment: 'profitability',
    cluster: 'margin_metrics',
    unit: '%',
    tooltipSimple: 'Average profit margin over 5 years',
    tooltipAdvanced: 'Shows sustainable profitability level, smoothing out cyclical variations.',
    higherIsBetter: true,
    benchmarks: { excellent: 18, good: 10, fair: 5, poor: 2 },
    sectorSpecific: true
  },
  {
    id: 'operating_profit_margin',
    name: 'Operating Profit Margin',
    segment: 'profitability',
    cluster: 'margin_metrics',
    unit: '%',
    formula: 'Operating Profit ÷ Revenue × 100',
    tooltipSimple: 'Profit from core operations before interest and taxes',
    tooltipAdvanced: 'Measures core business profitability excluding financing decisions. Expanding operating margins indicate improving operational efficiency or pricing power.',
    higherIsBetter: true,
    benchmarks: { excellent: 25, good: 15, fair: 8, poor: 3 },
    sectorSpecific: true
  },
  {
    id: 'operating_profit_margin_5y_avg',
    name: '5-Year Avg Operating Margin',
    segment: 'profitability',
    cluster: 'margin_metrics',
    unit: '%',
    tooltipSimple: 'Average operating margin over 5 years',
    tooltipAdvanced: 'Shows consistency of operational efficiency over business cycles.',
    higherIsBetter: true,
    benchmarks: { excellent: 22, good: 13, fair: 7, poor: 3 },
    sectorSpecific: true
  },
  {
    id: 'cash_flow_margin',
    name: 'Cash Flow Margin',
    segment: 'profitability',
    cluster: 'margin_metrics',
    unit: '%',
    formula: 'Cash from Operations ÷ Revenue × 100',
    tooltipSimple: 'Actual cash generated as percentage of sales',
    tooltipAdvanced: 'Measures quality of earnings - how much revenue converts to actual cash. Higher than net profit margin indicates high-quality earnings.',
    higherIsBetter: true,
    benchmarks: { excellent: 20, good: 12, fair: 6, poor: 2 }
  },
  {
    id: 'cash_flow_margin_5y_avg',
    name: '5-Year Avg Cash Flow Margin',
    segment: 'profitability',
    cluster: 'margin_metrics',
    unit: '%',
    tooltipSimple: 'Average cash flow margin over 5 years',
    tooltipAdvanced: 'Shows consistent cash generation ability over time.',
    higherIsBetter: true,
    benchmarks: { excellent: 18, good: 10, fair: 5, poor: 2 }
  },
  {
    id: 'cogs_ratio',
    name: 'Cost of Goods Sold Ratio',
    segment: 'profitability',
    cluster: 'cost_metrics',
    unit: '%',
    formula: 'Cost of Goods Sold ÷ Revenue × 100',
    tooltipSimple: 'Direct production costs as percentage of sales',
    tooltipAdvanced: 'Lower COGS ratio indicates better gross margins and production efficiency. Monitor trends - rising COGS may signal input cost pressures.',
    higherIsBetter: false,
    benchmarks: { excellent: 40, good: 55, fair: 70, poor: 85 },
    sectorSpecific: true
  },
]

// ===========================================
// SEGMENT 2: FINANCIAL RATIOS (14 metrics)
// ===========================================
export const financialRatiosMetrics: MetricDefinition[] = [
  {
    id: 'current_ratio',
    name: 'Current Ratio',
    segment: 'financial_ratios',
    cluster: 'liquidity',
    unit: 'x',
    formula: 'Current Assets ÷ Current Liabilities',
    tooltipSimple: 'Can the company pay its short-term bills?',
    tooltipAdvanced: 'Measures short-term liquidity. Ratio >1 means company can cover short-term obligations. Optimal is 1.5-2x. Too high may indicate inefficient asset use.',
    higherIsBetter: true,
    benchmarks: { excellent: 2.0, good: 1.5, fair: 1.2, poor: 0.8 }
  },
  {
    id: 'quick_ratio',
    name: 'Quick Ratio (Acid Test)',
    segment: 'financial_ratios',
    cluster: 'liquidity',
    unit: 'x',
    formula: '(Current Assets - Inventory) ÷ Current Liabilities',
    tooltipSimple: 'Can the company pay bills without selling inventory?',
    tooltipAdvanced: 'More conservative liquidity test excluding inventory. Ratio >1 indicates strong short-term financial health without relying on inventory sales.',
    higherIsBetter: true,
    benchmarks: { excellent: 1.5, good: 1.0, fair: 0.7, poor: 0.5 }
  },
  {
    id: 'debt_to_equity',
    name: 'Debt to Equity Ratio',
    segment: 'financial_ratios',
    cluster: 'leverage',
    unit: 'x',
    formula: 'Total Debt ÷ Shareholders\' Equity',
    tooltipSimple: 'How much debt versus shareholder money?',
    tooltipAdvanced: 'Measures financial leverage. Lower is generally safer. Banks/NBFCs naturally have higher D/E. High D/E during rate hikes is risky.',
    higherIsBetter: false,
    benchmarks: { excellent: 0.3, good: 0.6, fair: 1.0, poor: 2.0 },
    sectorSpecific: true
  },
  {
    id: 'lt_debt_to_equity',
    name: 'Long-Term Debt to Equity',
    segment: 'financial_ratios',
    cluster: 'leverage',
    unit: 'x',
    formula: 'Long-term Debt ÷ Shareholders\' Equity',
    tooltipSimple: 'Long-term borrowings versus shareholder investment',
    tooltipAdvanced: 'Focuses on long-term leverage which affects capital structure stability. Lower ratios indicate less dependence on debt financing.',
    higherIsBetter: false,
    benchmarks: { excellent: 0.2, good: 0.4, fair: 0.8, poor: 1.5 }
  },
  {
    id: 'interest_coverage',
    name: 'Interest Coverage Ratio',
    segment: 'financial_ratios',
    cluster: 'leverage',
    unit: 'x',
    formula: 'EBIT ÷ Interest Expense',
    tooltipSimple: 'Can the company pay its interest from profits?',
    tooltipAdvanced: 'Critical debt safety metric. Ratio >3 is comfortable. Ratio <1 means company cannot cover interest from operations - danger sign.',
    higherIsBetter: true,
    benchmarks: { excellent: 8, good: 4, fair: 2, poor: 1 }
  },
  {
    id: 'asset_turnover',
    name: 'Asset Turnover Ratio',
    segment: 'financial_ratios',
    cluster: 'efficiency',
    unit: 'x',
    formula: 'Revenue ÷ Average Total Assets',
    tooltipSimple: 'Sales generated per rupee of assets',
    tooltipAdvanced: 'Measures efficiency of asset utilization. Higher ratio indicates better revenue generation from assets. Very industry-specific.',
    higherIsBetter: true,
    benchmarks: { excellent: 1.5, good: 1.0, fair: 0.6, poor: 0.3 },
    sectorSpecific: true
  },
  {
    id: 'inventory_turnover',
    name: 'Inventory Turnover Ratio',
    segment: 'financial_ratios',
    cluster: 'efficiency',
    unit: 'x',
    formula: 'Cost of Goods Sold ÷ Average Inventory',
    tooltipSimple: 'How often inventory is sold and replaced',
    tooltipAdvanced: 'Higher turnover indicates efficient inventory management. Low turnover may signal obsolete inventory or weak sales. Compare within sector.',
    higherIsBetter: true,
    benchmarks: { excellent: 12, good: 8, fair: 5, poor: 3 },
    sectorSpecific: true
  },
  {
    id: 'working_capital_turnover',
    name: 'Working Capital Turnover',
    segment: 'financial_ratios',
    cluster: 'efficiency',
    unit: 'x',
    formula: 'Revenue ÷ Average Working Capital',
    tooltipSimple: 'Sales generated per rupee of working capital',
    tooltipAdvanced: 'Measures efficiency of working capital utilization. Higher ratio indicates lean operations with minimal capital tied up.',
    higherIsBetter: true,
    benchmarks: { excellent: 8, good: 5, fair: 3, poor: 1 }
  },
  {
    id: 'dso',
    name: 'Days Sales Outstanding (DSO)',
    segment: 'financial_ratios',
    cluster: 'cash_cycle',
    unit: 'days',
    formula: '(Avg Receivables ÷ Revenue) × 365',
    tooltipSimple: 'Average days to collect payment from customers',
    tooltipAdvanced: 'Lower is better - faster cash collection. Rising DSO may indicate collection issues or deteriorating customer quality.',
    higherIsBetter: false,
    benchmarks: { excellent: 30, good: 45, fair: 60, poor: 90 }
  },
  {
    id: 'dio',
    name: 'Days Inventory Outstanding (DIO)',
    segment: 'financial_ratios',
    cluster: 'cash_cycle',
    unit: 'days',
    formula: '(Avg Inventory ÷ COGS) × 365',
    tooltipSimple: 'Average days to sell inventory',
    tooltipAdvanced: 'Lower indicates faster inventory turnover. High DIO may signal demand weakness or inventory obsolescence.',
    higherIsBetter: false,
    benchmarks: { excellent: 30, good: 50, fair: 80, poor: 120 },
    sectorSpecific: true
  },
  {
    id: 'dpo',
    name: 'Days Payable Outstanding (DPO)',
    segment: 'financial_ratios',
    cluster: 'cash_cycle',
    unit: 'days',
    formula: '(Avg Payables ÷ COGS) × 365',
    tooltipSimple: 'Average days to pay suppliers',
    tooltipAdvanced: 'Higher DPO means retaining cash longer. However, extremely high DPO may strain supplier relationships.',
    higherIsBetter: true,
    benchmarks: { excellent: 60, good: 45, fair: 30, poor: 15 }
  },
  {
    id: 'cash_conversion_cycle',
    name: 'Cash Conversion Cycle',
    segment: 'financial_ratios',
    cluster: 'cash_cycle',
    unit: 'days',
    formula: 'DIO + DSO - DPO',
    tooltipSimple: 'Days to convert inventory investment into cash',
    tooltipAdvanced: 'Lower is better. Negative CCC (like Amazon) means business generates cash before paying suppliers. Critical for working capital efficiency.',
    higherIsBetter: false,
    benchmarks: { excellent: 20, good: 40, fair: 60, poor: 100 }
  },
  {
    id: 'earning_power',
    name: 'Earning Power',
    segment: 'financial_ratios',
    cluster: 'efficiency',
    unit: '%',
    formula: 'EBIT ÷ Total Assets × 100',
    tooltipSimple: 'Profit generation ability from total assets',
    tooltipAdvanced: 'Measures fundamental earning capacity before interest and taxes. Good indicator of business quality.',
    higherIsBetter: true,
    benchmarks: { excellent: 15, good: 10, fair: 6, poor: 3 }
  },
  {
    id: 'net_income_to_liabilities',
    name: 'Net Income / Liabilities',
    segment: 'financial_ratios',
    cluster: 'leverage',
    unit: '%',
    formula: 'Net Income ÷ Total Liabilities × 100',
    tooltipSimple: 'Ability to service all debts from profits',
    tooltipAdvanced: 'Higher ratio indicates stronger ability to cover all liabilities from profits. Good solvency indicator.',
    higherIsBetter: true,
    benchmarks: { excellent: 25, good: 15, fair: 8, poor: 3 }
  },
]

// ===========================================
// SEGMENT 3: GROWTH (13 metrics)
// ===========================================
export const growthMetrics: MetricDefinition[] = [
  {
    id: 'revenue_growth_1y',
    name: '1-Year Revenue Growth',
    segment: 'growth',
    cluster: 'revenue_growth',
    unit: '%',
    tooltipSimple: 'Sales growth compared to last year',
    tooltipAdvanced: 'Year-over-year revenue growth indicates market demand and business momentum. Compare against sector growth rate.',
    higherIsBetter: true,
    benchmarks: { excellent: 25, good: 15, fair: 8, poor: 0 }
  },
  {
    id: 'revenue_growth_5y_cagr',
    name: '5-Year Revenue CAGR',
    segment: 'growth',
    cluster: 'revenue_growth',
    unit: '%',
    tooltipSimple: 'Average annual revenue growth over 5 years',
    tooltipAdvanced: 'Compound annual growth rate shows sustainable growth trajectory. Consistent double-digit CAGR indicates strong business model.',
    higherIsBetter: true,
    benchmarks: { excellent: 20, good: 12, fair: 6, poor: 0 }
  },
  {
    id: 'revenue_growth_forward',
    name: '1-Year Forward Revenue Growth',
    segment: 'growth',
    cluster: 'revenue_growth',
    unit: '%',
    tooltipSimple: 'Expected revenue growth next year',
    tooltipAdvanced: 'Analyst estimates of future revenue growth. Higher forward estimates indicate positive outlook.',
    higherIsBetter: true,
    benchmarks: { excellent: 20, good: 12, fair: 5, poor: 0 }
  },
  {
    id: 'ebitda_growth_1y',
    name: '1-Year EBITDA Growth',
    segment: 'growth',
    cluster: 'profit_growth',
    unit: '%',
    tooltipSimple: 'Operating profit growth compared to last year',
    tooltipAdvanced: 'EBITDA growth shows operational improvement. Should ideally exceed revenue growth (operating leverage).',
    higherIsBetter: true,
    benchmarks: { excellent: 30, good: 18, fair: 8, poor: 0 }
  },
  {
    id: 'ebitda_growth_5y_cagr',
    name: '5-Year EBITDA CAGR',
    segment: 'growth',
    cluster: 'profit_growth',
    unit: '%',
    tooltipSimple: 'Average annual EBITDA growth over 5 years',
    tooltipAdvanced: 'Shows sustainable operating profit growth. Faster EBITDA vs revenue CAGR indicates margin expansion.',
    higherIsBetter: true,
    benchmarks: { excellent: 22, good: 14, fair: 7, poor: 0 }
  },
  {
    id: 'eps_growth_1y',
    name: '1-Year EPS Growth',
    segment: 'growth',
    cluster: 'profit_growth',
    unit: '%',
    tooltipSimple: 'Earnings per share growth vs last year',
    tooltipAdvanced: 'Per-share profit growth directly impacts shareholder value. Should outpace revenue growth.',
    higherIsBetter: true,
    benchmarks: { excellent: 30, good: 18, fair: 8, poor: 0 }
  },
  {
    id: 'eps_growth_5y_cagr',
    name: '5-Year EPS CAGR',
    segment: 'growth',
    cluster: 'profit_growth',
    unit: '%',
    tooltipSimple: 'Average annual EPS growth over 5 years',
    tooltipAdvanced: 'Long-term earnings growth shows shareholder value creation. Consistent >15% is excellent.',
    higherIsBetter: true,
    benchmarks: { excellent: 20, good: 12, fair: 6, poor: 0 }
  },
  {
    id: 'eps_growth_forward',
    name: '1-Year Forward EPS Growth',
    segment: 'growth',
    cluster: 'profit_growth',
    unit: '%',
    tooltipSimple: 'Expected EPS growth next year',
    tooltipAdvanced: 'Analyst estimates of future earnings growth. Key input for valuation models.',
    higherIsBetter: true,
    benchmarks: { excellent: 25, good: 15, fair: 8, poor: 0 }
  },
  {
    id: 'cfo_growth_1y',
    name: '1-Year Operating Cash Flow Growth',
    segment: 'growth',
    cluster: 'cash_growth',
    unit: '%',
    tooltipSimple: 'Cash from operations growth vs last year',
    tooltipAdvanced: 'Cash flow growth validates earnings quality. CFO growth should track or exceed profit growth.',
    higherIsBetter: true,
    benchmarks: { excellent: 30, good: 18, fair: 8, poor: 0 }
  },
  {
    id: 'cfo_growth_5y_cagr',
    name: '5-Year Operating Cash Flow CAGR',
    segment: 'growth',
    cluster: 'cash_growth',
    unit: '%',
    tooltipSimple: 'Average annual cash flow growth over 5 years',
    tooltipAdvanced: 'Shows sustainable cash generation ability. Strong indicator of business quality.',
    higherIsBetter: true,
    benchmarks: { excellent: 20, good: 12, fair: 6, poor: 0 }
  },
  {
    id: 'dividend_growth_3y',
    name: '3-Year Dividend Growth',
    segment: 'growth',
    cluster: 'shareholder_returns',
    unit: '%',
    tooltipSimple: 'Average annual dividend increase over 3 years',
    tooltipAdvanced: 'Growing dividends signal management confidence in future cash flows. Important for income investors.',
    higherIsBetter: true,
    benchmarks: { excellent: 15, good: 10, fair: 5, poor: 0 }
  },
  {
    id: 'book_value_growth_5y',
    name: '5-Year Book Value Growth',
    segment: 'growth',
    cluster: 'shareholder_returns',
    unit: '%',
    tooltipSimple: 'Average annual growth in net assets per share',
    tooltipAdvanced: 'Shows intrinsic value compounding. High book value growth + high ROE = quality compounder.',
    higherIsBetter: true,
    benchmarks: { excellent: 18, good: 12, fair: 6, poor: 0 }
  },
  {
    id: 'free_cash_flow_growth_5y',
    name: '5-Year Free Cash Flow CAGR',
    segment: 'growth',
    cluster: 'cash_growth',
    unit: '%',
    tooltipSimple: 'Average annual free cash growth over 5 years',
    tooltipAdvanced: 'FCF growth shows ability to generate excess cash after reinvestment. Funds dividends, buybacks, and debt reduction.',
    higherIsBetter: true,
    benchmarks: { excellent: 18, good: 12, fair: 6, poor: 0 }
  },
]

// ===========================================
// SEGMENT 4: VALUATION (22 metrics)
// ===========================================
export const valuationMetrics: MetricDefinition[] = [
  {
    id: 'pe_ratio',
    name: 'P/E Ratio',
    segment: 'valuation',
    cluster: 'earnings_multiples',
    unit: 'x',
    formula: 'Price ÷ Earnings Per Share',
    tooltipSimple: 'Price paid for each rupee of earnings',
    tooltipAdvanced: 'Most common valuation metric. Lower P/E may indicate undervaluation. Compare against sector and growth rate (PEG).',
    higherIsBetter: false,
    benchmarks: { excellent: 12, good: 18, fair: 25, poor: 40 },
    sectorSpecific: true
  },
  {
    id: 'forward_pe',
    name: 'Forward P/E Ratio',
    segment: 'valuation',
    cluster: 'earnings_multiples',
    unit: 'x',
    formula: 'Price ÷ Estimated Future EPS',
    tooltipSimple: 'P/E based on next year\'s expected earnings',
    tooltipAdvanced: 'Forward PE < Current PE indicates earnings growth expected. More relevant for growth companies.',
    higherIsBetter: false,
    benchmarks: { excellent: 10, good: 15, fair: 22, poor: 35 }
  },
  {
    id: 'pe_premium_sector',
    name: 'P/E Premium vs Sector',
    segment: 'valuation',
    cluster: 'relative_valuation',
    unit: '%',
    formula: '(Stock PE ÷ Sector PE - 1) × 100',
    tooltipSimple: 'Valuation compared to sector average',
    tooltipAdvanced: 'Negative premium = potential opportunity. Premium should be justified by superior fundamentals.',
    higherIsBetter: false,
    benchmarks: { excellent: -20, good: 0, fair: 20, poor: 50 }
  },
  {
    id: 'pb_ratio',
    name: 'P/B Ratio',
    segment: 'valuation',
    cluster: 'asset_multiples',
    unit: 'x',
    formula: 'Price ÷ Book Value Per Share',
    tooltipSimple: 'Price compared to net assets per share',
    tooltipAdvanced: 'Important for banks and asset-heavy businesses. P/B <1 may indicate undervaluation or hidden problems.',
    higherIsBetter: false,
    benchmarks: { excellent: 1.5, good: 2.5, fair: 4, poor: 6 },
    sectorSpecific: true
  },
  {
    id: 'ps_ratio',
    name: 'P/S Ratio',
    segment: 'valuation',
    cluster: 'sales_multiples',
    unit: 'x',
    formula: 'Price ÷ Revenue Per Share',
    tooltipSimple: 'Price compared to sales per share',
    tooltipAdvanced: 'Useful for loss-making companies where P/E doesn\'t apply. Lower is better. Compare within sector.',
    higherIsBetter: false,
    benchmarks: { excellent: 1, good: 2, fair: 4, poor: 8 }
  },
  {
    id: 'dividend_yield',
    name: 'Dividend Yield',
    segment: 'valuation',
    cluster: 'income_metrics',
    unit: '%',
    formula: 'Dividend Per Share ÷ Price × 100',
    tooltipSimple: 'Annual dividend income as percentage of price',
    tooltipAdvanced: 'Cash return from dividends. Very high yield may signal price decline due to problems. Compare against bank FD rates.',
    higherIsBetter: true,
    benchmarks: { excellent: 4, good: 2.5, fair: 1, poor: 0 }
  },
  {
    id: 'ev_ebitda',
    name: 'EV/EBITDA',
    segment: 'valuation',
    cluster: 'enterprise_multiples',
    unit: 'x',
    formula: 'Enterprise Value ÷ EBITDA',
    tooltipSimple: 'Total company value per unit of operating profit',
    tooltipAdvanced: 'More comprehensive than P/E as it includes debt. Lower is better. Standard M&A valuation metric.',
    higherIsBetter: false,
    benchmarks: { excellent: 6, good: 10, fair: 14, poor: 20 }
  },
  {
    id: 'ev_revenue',
    name: 'EV/Revenue',
    segment: 'valuation',
    cluster: 'enterprise_multiples',
    unit: 'x',
    formula: 'Enterprise Value ÷ Revenue',
    tooltipSimple: 'Total company value per unit of sales',
    tooltipAdvanced: 'Useful for high-growth, unprofitable companies. Lower indicates better value.',
    higherIsBetter: false,
    benchmarks: { excellent: 1, good: 2, fair: 4, poor: 8 }
  },
  {
    id: 'ev_fcf',
    name: 'EV/Free Cash Flow',
    segment: 'valuation',
    cluster: 'enterprise_multiples',
    unit: 'x',
    formula: 'Enterprise Value ÷ Free Cash Flow',
    tooltipSimple: 'Total value per unit of cash generation',
    tooltipAdvanced: 'Shows years to recover enterprise value from cash flows. Lower is better. Key metric for acquirers.',
    higherIsBetter: false,
    benchmarks: { excellent: 10, good: 15, fair: 22, poor: 35 }
  },
  {
    id: 'price_to_cfo',
    name: 'Price/Cash Flow (Operating)',
    segment: 'valuation',
    cluster: 'cash_multiples',
    unit: 'x',
    formula: 'Market Cap ÷ Cash from Operations',
    tooltipSimple: 'Price compared to operating cash generation',
    tooltipAdvanced: 'Cross-checks P/E with cash reality. P/CFO should be close to P/E. Significant difference is red flag.',
    higherIsBetter: false,
    benchmarks: { excellent: 8, good: 12, fair: 18, poor: 30 }
  },
  {
    id: 'price_to_fcf',
    name: 'Price/Free Cash Flow',
    segment: 'valuation',
    cluster: 'cash_multiples',
    unit: 'x',
    formula: 'Market Cap ÷ Free Cash Flow',
    tooltipSimple: 'Price compared to distributable cash',
    tooltipAdvanced: 'Shows years to recover market cap from excess cash. Lower indicates better value for shareholders.',
    higherIsBetter: false,
    benchmarks: { excellent: 12, good: 18, fair: 28, poor: 45 }
  },
  {
    id: 'peg_ratio',
    name: 'PEG Ratio',
    segment: 'valuation',
    cluster: 'growth_adjusted',
    unit: 'x',
    formula: 'P/E ÷ EPS Growth Rate',
    tooltipSimple: 'P/E adjusted for growth rate',
    tooltipAdvanced: 'PEG <1 suggests undervaluation relative to growth. Best for comparing growth stocks. PEG >2 may be overvalued.',
    higherIsBetter: false,
    benchmarks: { excellent: 0.5, good: 1.0, fair: 1.5, poor: 2.5 }
  },
]

// ===========================================
// SEGMENT 5: PRICE & VOLUME (16 metrics)
// ===========================================
export const priceVolumeMetrics: MetricDefinition[] = [
  {
    id: 'price_cagr_5y',
    name: '5-Year Price CAGR',
    segment: 'price_volume',
    cluster: 'price_performance',
    unit: '%',
    tooltipSimple: 'Average annual stock price growth over 5 years',
    tooltipAdvanced: 'Long-term price appreciation. 15-25% CAGR is healthy. Compare against Nifty returns.',
    higherIsBetter: true,
    benchmarks: { excellent: 20, good: 12, fair: 6, poor: 0 }
  },
  {
    id: 'return_1y',
    name: '1-Year Return',
    segment: 'price_volume',
    cluster: 'price_performance',
    unit: '%',
    tooltipSimple: 'Stock price change over past year',
    tooltipAdvanced: 'Annual price movement. Compare against Nifty and sector index for relative performance.',
    higherIsBetter: true,
    benchmarks: { excellent: 30, good: 15, fair: 0, poor: -15 }
  },
  {
    id: 'return_6m',
    name: '6-Month Return',
    segment: 'price_volume',
    cluster: 'price_performance',
    unit: '%',
    tooltipSimple: 'Stock price change over past 6 months',
    tooltipAdvanced: 'Medium-term momentum indicator. Shows recent trend strength.',
    higherIsBetter: true,
    benchmarks: { excellent: 20, good: 10, fair: 0, poor: -10 }
  },
  {
    id: 'return_1m',
    name: '1-Month Return',
    segment: 'price_volume',
    cluster: 'price_performance',
    unit: '%',
    tooltipSimple: 'Stock price change over past month',
    tooltipAdvanced: 'Short-term momentum. High volatility possible. Use for timing, not fundamental analysis.',
    higherIsBetter: true,
    benchmarks: { excellent: 10, good: 4, fair: 0, poor: -5 }
  },
  {
    id: 'pct_from_52w_high',
    name: '% from 52-Week High',
    segment: 'price_volume',
    cluster: 'price_position',
    unit: '%',
    tooltipSimple: 'Distance from recent peak price',
    tooltipAdvanced: '-10% to 0% = Near highs (momentum). -30% to -10% = Pullback opportunity. <-50% = Deep correction.',
    higherIsBetter: true,
    benchmarks: { excellent: -5, good: -15, fair: -30, poor: -50 }
  },
  {
    id: 'pct_from_52w_low',
    name: '% from 52-Week Low',
    segment: 'price_volume',
    cluster: 'price_position',
    unit: '%',
    tooltipSimple: 'Recovery from recent bottom',
    tooltipAdvanced: 'Higher percentage indicates strong recovery from lows. New highs are favorable.',
    higherIsBetter: true,
    benchmarks: { excellent: 80, good: 50, fair: 25, poor: 5 }
  },
  {
    id: 'return_vs_nifty_1y',
    name: '1-Year Return vs Nifty',
    segment: 'price_volume',
    cluster: 'relative_performance',
    unit: '%',
    tooltipSimple: 'Outperformance vs market index',
    tooltipAdvanced: 'Alpha generation metric. Positive = beating market. Consistent outperformance indicates quality.',
    higherIsBetter: true,
    benchmarks: { excellent: 15, good: 5, fair: 0, poor: -10 }
  },
  {
    id: 'avg_daily_volume_3m',
    name: '3-Month Average Daily Volume',
    segment: 'price_volume',
    cluster: 'liquidity',
    unit: 'shares',
    tooltipSimple: 'Average shares traded daily over 3 months',
    tooltipAdvanced: 'Best indicator of true liquidity. Higher volume = easier to buy/sell without impact.',
    higherIsBetter: true,
    benchmarks: { excellent: 1000000, good: 500000, fair: 100000, poor: 20000 }
  },
  {
    id: 'volume_change_1w',
    name: '1-Week Volume Change',
    segment: 'price_volume',
    cluster: 'volume_trend',
    unit: '%',
    tooltipSimple: 'Change in trading volume vs last week',
    tooltipAdvanced: 'Rising volume with rising price = confirmation. Rising volume with falling price = distribution.',
    higherIsBetter: true,
    benchmarks: { excellent: 50, good: 20, fair: 0, poor: -30 }
  },
  {
    id: 'beta',
    name: 'Beta',
    segment: 'price_volume',
    cluster: 'volatility',
    unit: '',
    tooltipSimple: 'Stock volatility relative to market',
    tooltipAdvanced: 'Beta >1 = more volatile than market. Beta <1 = less volatile. Important for risk management.',
    higherIsBetter: false,
    benchmarks: { excellent: 0.8, good: 1.0, fair: 1.3, poor: 1.8 }
  },
]

// ===========================================
// SEGMENT 6: TECHNICAL INDICATORS (20 metrics)
// ===========================================
export const technicalMetrics: MetricDefinition[] = [
  {
    id: 'rsi_14d',
    name: 'RSI (14-Day)',
    segment: 'technical',
    cluster: 'momentum',
    unit: '',
    tooltipSimple: 'Momentum indicator showing overbought/oversold',
    tooltipAdvanced: 'RSI >70 = overbought (sell signal). RSI <30 = oversold (buy signal). 40-60 = neutral zone.',
    higherIsBetter: false,
    benchmarks: { excellent: 35, good: 45, fair: 60, poor: 75 }
  },
  {
    id: 'macd_line',
    name: 'MACD Line',
    segment: 'technical',
    cluster: 'momentum',
    unit: '',
    tooltipSimple: 'Trend direction and strength indicator',
    tooltipAdvanced: 'Positive MACD = uptrend. MACD crossing above signal line = buy signal. Below = sell signal.',
    higherIsBetter: true,
    benchmarks: { excellent: 5, good: 2, fair: 0, poor: -3 }
  },
  {
    id: 'adx_14d',
    name: 'ADX (14-Day)',
    segment: 'technical',
    cluster: 'trend_strength',
    unit: '',
    tooltipSimple: 'Measures trend strength (not direction)',
    tooltipAdvanced: 'ADX >25 = strong trend. ADX <20 = no clear trend (sideways). Use with other indicators for direction.',
    higherIsBetter: true,
    benchmarks: { excellent: 35, good: 25, fair: 18, poor: 10 }
  },
  {
    id: 'price_vs_200d_sma',
    name: 'Price vs 200-Day SMA',
    segment: 'technical',
    cluster: 'trend_position',
    unit: '%',
    tooltipSimple: 'Position relative to long-term trend',
    tooltipAdvanced: 'Above 200D SMA = long-term uptrend. Price crossing below = potential trend reversal.',
    higherIsBetter: true,
    benchmarks: { excellent: 15, good: 5, fair: 0, poor: -10 }
  },
  {
    id: 'price_vs_50d_sma',
    name: 'Price vs 50-Day SMA',
    segment: 'technical',
    cluster: 'trend_position',
    unit: '%',
    tooltipSimple: 'Position relative to medium-term trend',
    tooltipAdvanced: 'Golden Cross (50D crosses above 200D) = bullish. Death Cross = bearish.',
    higherIsBetter: true,
    benchmarks: { excellent: 10, good: 3, fair: 0, poor: -8 }
  },
  {
    id: 'volatility',
    name: 'Annualized Volatility',
    segment: 'technical',
    cluster: 'risk',
    unit: '%',
    tooltipSimple: 'Annual price swing intensity',
    tooltipAdvanced: 'High volatility (>40%) = risky but opportunity. Low volatility (<20%) = stable.',
    higherIsBetter: false,
    benchmarks: { excellent: 20, good: 30, fair: 40, poor: 60 }
  },
  {
    id: 'max_drawdown_1y',
    name: '1-Year Max Drawdown',
    segment: 'technical',
    cluster: 'risk',
    unit: '%',
    tooltipSimple: 'Worst peak-to-trough decline in past year',
    tooltipAdvanced: 'Shows downside risk. If bought at worst time, this is max loss. Important for position sizing.',
    higherIsBetter: false,
    benchmarks: { excellent: -15, good: -25, fair: -40, poor: -60 }
  },
  {
    id: 'sharpe_ratio',
    name: 'Sharpe Ratio',
    segment: 'technical',
    cluster: 'risk_adjusted',
    unit: '',
    tooltipSimple: 'Return per unit of risk taken',
    tooltipAdvanced: 'Higher = better risk-adjusted returns. Sharpe >1 is good. >2 is excellent.',
    higherIsBetter: true,
    benchmarks: { excellent: 2, good: 1, fair: 0.5, poor: 0 }
  },
  {
    id: 'alpha',
    name: 'Alpha',
    segment: 'technical',
    cluster: 'risk_adjusted',
    unit: '%',
    tooltipSimple: 'Excess return vs benchmark',
    tooltipAdvanced: 'Positive alpha = outperforming on risk-adjusted basis. Key measure of stock-picking skill.',
    higherIsBetter: true,
    benchmarks: { excellent: 10, good: 5, fair: 0, poor: -5 }
  },
]

// ===========================================
// SEGMENT 7: BROKER RATINGS (7 metrics)
// ===========================================
export const brokerRatingsMetrics: MetricDefinition[] = [
  {
    id: 'pct_buy_ratings',
    name: '% Buy Recommendations',
    segment: 'broker_ratings',
    cluster: 'sentiment',
    unit: '%',
    tooltipSimple: 'Percentage of analysts recommending Buy',
    tooltipAdvanced: '>60% = strong consensus. 40-60% = mixed. <40% = bearish. Monitor changes over time.',
    higherIsBetter: true,
    benchmarks: { excellent: 80, good: 60, fair: 40, poor: 20 }
  },
  {
    id: 'target_upside',
    name: 'Target Price Upside',
    segment: 'broker_ratings',
    cluster: 'price_target',
    unit: '%',
    tooltipSimple: 'Expected upside to analyst target price',
    tooltipAdvanced: '>15% = material upside. 0-15% = limited. Negative = downside risk. Cross-check with fundamentals.',
    higherIsBetter: true,
    benchmarks: { excellent: 30, good: 15, fair: 5, poor: -10 }
  },
  {
    id: 'analyst_coverage',
    name: 'Number of Analysts',
    segment: 'broker_ratings',
    cluster: 'coverage',
    unit: '',
    tooltipSimple: 'Total analysts covering this stock',
    tooltipAdvanced: '10+ = well-researched. 5-10 = moderate coverage. <5 = limited research (higher risk).',
    higherIsBetter: true,
    benchmarks: { excellent: 15, good: 8, fair: 4, poor: 2 }
  },
  {
    id: 'rating_trend',
    name: 'Rating Consensus Trend',
    segment: 'broker_ratings',
    cluster: 'sentiment',
    unit: '',
    tooltipSimple: 'Direction of analyst sentiment shift',
    tooltipAdvanced: 'Improving = positive catalyst expected. Declining = problems emerging. Stable = consensus view.',
    higherIsBetter: true,
    benchmarks: { excellent: 2, good: 1, fair: 0, poor: -1 }
  },
]

// ===========================================
// SEGMENT 8: OWNERSHIP (18 metrics)
// ===========================================
export const ownershipMetrics: MetricDefinition[] = [
  {
    id: 'promoter_holding',
    name: 'Promoter Holding',
    segment: 'ownership',
    cluster: 'promoter',
    unit: '%',
    tooltipSimple: 'Percentage owned by company founders/management',
    tooltipAdvanced: '40-75% = optimal alignment. >75% = limited float. <25% = weak commitment. Watch changes.',
    higherIsBetter: true,
    benchmarks: { excellent: 65, good: 50, fair: 35, poor: 20 }
  },
  {
    id: 'promoter_holding_change_3m',
    name: 'Promoter Holding Change (3M)',
    segment: 'ownership',
    cluster: 'promoter',
    unit: '%',
    tooltipSimple: 'Change in promoter stake over 3 months',
    tooltipAdvanced: 'Increasing = confidence signal. Decreasing during weak prices = red flag.',
    higherIsBetter: true,
    benchmarks: { excellent: 2, good: 0, fair: -1, poor: -3 }
  },
  {
    id: 'pledged_promoter_holding',
    name: 'Pledged Promoter Holding',
    segment: 'ownership',
    cluster: 'promoter',
    unit: '%',
    tooltipSimple: 'Promoter shares pledged as loan collateral',
    tooltipAdvanced: '>15% = margin call risk. >30% = danger zone. Can trigger forced selling cascade.',
    higherIsBetter: false,
    benchmarks: { excellent: 0, good: 5, fair: 15, poor: 30 }
  },
  {
    id: 'fii_holding',
    name: 'FII Holding',
    segment: 'ownership',
    cluster: 'institutional',
    unit: '%',
    tooltipSimple: 'Foreign institutional investor ownership',
    tooltipAdvanced: '>20% = strong global validation. FII exit can cause sharp corrections. Quality benchmark.',
    higherIsBetter: true,
    benchmarks: { excellent: 25, good: 15, fair: 8, poor: 2 }
  },
  {
    id: 'fii_holding_change_3m',
    name: 'FII Holding Change (3M)',
    segment: 'ownership',
    cluster: 'institutional',
    unit: '%',
    tooltipSimple: 'Change in FII stake over 3 months',
    tooltipAdvanced: 'FII buying = global confidence. FII selling may be macro-driven, not stock-specific.',
    higherIsBetter: true,
    benchmarks: { excellent: 2, good: 0.5, fair: 0, poor: -2 }
  },
  {
    id: 'dii_holding',
    name: 'DII Holding',
    segment: 'ownership',
    cluster: 'institutional',
    unit: '%',
    tooltipSimple: 'Domestic institutional investor ownership',
    tooltipAdvanced: 'Includes MFs, insurance, pension funds. More stable than FII. Quality endorsement.',
    higherIsBetter: true,
    benchmarks: { excellent: 20, good: 12, fair: 6, poor: 2 }
  },
  {
    id: 'mf_holding',
    name: 'Mutual Fund Holding',
    segment: 'ownership',
    cluster: 'institutional',
    unit: '%',
    tooltipSimple: 'Percentage owned by mutual funds',
    tooltipAdvanced: '>15% = strong fund presence. MF buying indicates professional research validation.',
    higherIsBetter: true,
    benchmarks: { excellent: 20, good: 10, fair: 5, poor: 1 }
  },
  {
    id: 'retail_holding',
    name: 'Retail Investor Holding',
    segment: 'ownership',
    cluster: 'shareholder_base',
    unit: '%',
    tooltipSimple: 'Percentage owned by individual retail investors',
    tooltipAdvanced: 'High retail = potential volatility. Low retail = institutional-driven pricing.',
    higherIsBetter: false,
    benchmarks: { excellent: 15, good: 25, fair: 35, poor: 50 }
  },
]

// ===========================================
// SEGMENT 9: STOCK DEALS (6 metrics)
// ===========================================
export const stockDealsMetrics: MetricDefinition[] = [
  {
    id: 'insider_trades_3m',
    name: 'Insider Trades (3M Cumulative)',
    segment: 'stock_deals',
    cluster: 'insider_activity',
    unit: '%',
    tooltipSimple: 'Net insider trading activity over 3 months',
    tooltipAdvanced: 'Cluster buying by insiders = strong conviction signal. Multiple insiders buying = very bullish.',
    higherIsBetter: true,
    benchmarks: { excellent: 1, good: 0.2, fair: 0, poor: -0.5 }
  },
  {
    id: 'bulk_deals_3m',
    name: 'Bulk Deals (3M Cumulative)',
    segment: 'stock_deals',
    cluster: 'institutional_activity',
    unit: '%',
    tooltipSimple: 'Large trades (>0.5% of shares) over 3 months',
    tooltipAdvanced: 'Bulk buying by institutions = smart money accumulation. Check buyer identity.',
    higherIsBetter: true,
    benchmarks: { excellent: 3, good: 1, fair: 0, poor: -2 }
  },
]

// ===========================================
// SEGMENT 10: INCOME STATEMENT (15 metrics)
// ===========================================
export const incomeStatementMetrics: MetricDefinition[] = [
  {
    id: 'total_revenue',
    name: 'Total Revenue',
    segment: 'income_statement',
    cluster: 'revenue',
    unit: '₹ Cr',
    tooltipSimple: 'Total income from selling goods/services',
    tooltipAdvanced: 'Top-line indicator of business size and market demand. Year-over-year growth is key.',
    higherIsBetter: true,
    benchmarks: { excellent: 10000, good: 5000, fair: 1000, poor: 100 }
  },
  {
    id: 'gross_profit',
    name: 'Gross Profit',
    segment: 'income_statement',
    cluster: 'revenue',
    unit: '₹ Cr',
    tooltipSimple: 'Revenue minus direct production costs',
    tooltipAdvanced: 'Shows profitability before overhead. Gross margin expansion indicates pricing power.',
    higherIsBetter: true,
    benchmarks: { excellent: 3000, good: 1500, fair: 500, poor: 50 }
  },
  {
    id: 'ebitda',
    name: 'EBITDA',
    segment: 'income_statement',
    cluster: 'operating',
    unit: '₹ Cr',
    tooltipSimple: 'Operating profit before interest, taxes, depreciation',
    tooltipAdvanced: 'Pure operational performance metric. Standard for cross-company comparison.',
    higherIsBetter: true,
    benchmarks: { excellent: 2000, good: 800, fair: 200, poor: 20 }
  },
  {
    id: 'net_income',
    name: 'Net Income',
    segment: 'income_statement',
    cluster: 'bottom_line',
    unit: '₹ Cr',
    tooltipSimple: 'Final profit after all expenses',
    tooltipAdvanced: 'The actual profit available to shareholders. Compare with operating cash flow for quality check.',
    higherIsBetter: true,
    benchmarks: { excellent: 1000, good: 400, fair: 100, poor: 10 }
  },
  {
    id: 'eps',
    name: 'Earnings Per Share (EPS)',
    segment: 'income_statement',
    cluster: 'bottom_line',
    unit: '₹',
    tooltipSimple: 'Profit allocated to each share',
    tooltipAdvanced: 'Key metric for valuation. Growing EPS drives stock price. Watch dilution from new shares.',
    higherIsBetter: true,
    benchmarks: { excellent: 50, good: 25, fair: 10, poor: 2 }
  },
  {
    id: 'dps',
    name: 'Dividend Per Share (DPS)',
    segment: 'income_statement',
    cluster: 'shareholder_returns',
    unit: '₹',
    tooltipSimple: 'Cash dividend paid per share',
    tooltipAdvanced: 'Direct cash return. Growing DPS signals management confidence in sustainable cash flows.',
    higherIsBetter: true,
    benchmarks: { excellent: 20, good: 10, fair: 3, poor: 0 }
  },
  {
    id: 'payout_ratio',
    name: 'Dividend Payout Ratio',
    segment: 'income_statement',
    cluster: 'shareholder_returns',
    unit: '%',
    tooltipSimple: 'Percentage of profits paid as dividends',
    tooltipAdvanced: '30-50% = balanced. >70% = limited reinvestment. 0% = growth mode or weak financials.',
    higherIsBetter: false,
    benchmarks: { excellent: 35, good: 50, fair: 70, poor: 90 }
  },
]

// ===========================================
// SEGMENT 11: BALANCE SHEET & CASH FLOW (20 metrics)
// ===========================================
export const balanceSheetMetrics: MetricDefinition[] = [
  {
    id: 'total_assets',
    name: 'Total Assets',
    segment: 'balance_sheet',
    cluster: 'assets',
    unit: '₹ Cr',
    tooltipSimple: 'Everything the company owns',
    tooltipAdvanced: 'Overall size of the business. Should grow over time with retained earnings and investments.',
    higherIsBetter: true,
    benchmarks: { excellent: 20000, good: 8000, fair: 2000, poor: 200 }
  },
  {
    id: 'cash_and_equivalents',
    name: 'Cash & Cash Equivalents',
    segment: 'balance_sheet',
    cluster: 'assets',
    unit: '₹ Cr',
    tooltipSimple: 'Liquid cash available',
    tooltipAdvanced: 'Financial cushion for opportunities and risks. Excess cash can fund growth or dividends.',
    higherIsBetter: true,
    benchmarks: { excellent: 2000, good: 500, fair: 100, poor: 20 }
  },
  {
    id: 'total_debt',
    name: 'Total Debt',
    segment: 'balance_sheet',
    cluster: 'liabilities',
    unit: '₹ Cr',
    tooltipSimple: 'Short-term plus long-term borrowings',
    tooltipAdvanced: 'Overall leverage. High debt + low interest coverage = risky. Net debt (Debt - Cash) more relevant.',
    higherIsBetter: false,
    benchmarks: { excellent: 200, good: 1000, fair: 3000, poor: 8000 }
  },
  {
    id: 'total_equity',
    name: 'Total Shareholders\' Equity',
    segment: 'balance_sheet',
    cluster: 'equity',
    unit: '₹ Cr',
    tooltipSimple: 'Net worth belonging to shareholders',
    tooltipAdvanced: 'Book value of the business. Growing equity from retained earnings indicates value creation.',
    higherIsBetter: true,
    benchmarks: { excellent: 10000, good: 4000, fair: 1000, poor: 100 }
  },
  {
    id: 'book_value_per_share',
    name: 'Book Value Per Share',
    segment: 'balance_sheet',
    cluster: 'equity',
    unit: '₹',
    tooltipSimple: 'Net assets per share',
    tooltipAdvanced: 'Floor value if company liquidated. Growing BVPS indicates compounding. Important for banks.',
    higherIsBetter: true,
    benchmarks: { excellent: 500, good: 200, fair: 80, poor: 20 }
  },
  {
    id: 'cfo',
    name: 'Cash Flow from Operations (CFO)',
    segment: 'balance_sheet',
    cluster: 'cash_flow',
    unit: '₹ Cr',
    tooltipSimple: 'Actual cash generated from business',
    tooltipAdvanced: 'Reality check on profits. CFO > Net Income = high-quality earnings. CFO < Net Income = investigate.',
    higherIsBetter: true,
    benchmarks: { excellent: 1500, good: 600, fair: 150, poor: 20 }
  },
  {
    id: 'capex',
    name: 'Capital Expenditure',
    segment: 'balance_sheet',
    cluster: 'cash_flow',
    unit: '₹ Cr',
    tooltipSimple: 'Investment in property, plant, equipment',
    tooltipAdvanced: 'Shows growth investment. High capex = expanding capacity. Low capex = mature or declining.',
    higherIsBetter: true,
    benchmarks: { excellent: 500, good: 200, fair: 50, poor: 10 }
  },
  {
    id: 'free_cash_flow',
    name: 'Free Cash Flow',
    segment: 'balance_sheet',
    cluster: 'cash_flow',
    unit: '₹ Cr',
    formula: 'CFO - CapEx',
    tooltipSimple: 'Excess cash after maintaining/growing business',
    tooltipAdvanced: 'Cash available for dividends, buybacks, debt reduction, or acquisitions. Key for valuation.',
    higherIsBetter: true,
    benchmarks: { excellent: 1000, good: 400, fair: 100, poor: 0 }
  },
  {
    id: 'working_capital',
    name: 'Net Working Capital',
    segment: 'balance_sheet',
    cluster: 'liquidity',
    unit: '₹ Cr',
    formula: 'Current Assets - Current Liabilities',
    tooltipSimple: 'Capital available for day-to-day operations',
    tooltipAdvanced: 'Positive = healthy short-term position. Negative working capital (like retailers) can be efficient.',
    higherIsBetter: true,
    benchmarks: { excellent: 1000, good: 400, fair: 100, poor: 0 }
  },
]

// ===========================================
// EXPORT ALL METRICS
// ===========================================
export const allMetricDefinitions: MetricDefinition[] = [
  ...profitabilityMetrics,
  ...financialRatiosMetrics,
  ...growthMetrics,
  ...valuationMetrics,
  ...priceVolumeMetrics,
  ...technicalMetrics,
  ...brokerRatingsMetrics,
  ...ownershipMetrics,
  ...stockDealsMetrics,
  ...incomeStatementMetrics,
  ...balanceSheetMetrics,
]

// Segment definitions for reference
export const segmentDefinitions = [
  { id: 'profitability', name: 'Profitability', description: 'How efficiently the company generates profits', metrics: profitabilityMetrics.length },
  { id: 'financial_ratios', name: 'Financial Ratios', description: 'Operational efficiency and financial health', metrics: financialRatiosMetrics.length },
  { id: 'growth', name: 'Growth', description: 'Revenue, earnings, and cash flow trajectory', metrics: growthMetrics.length },
  { id: 'valuation', name: 'Valuation', description: 'Is the stock fairly priced?', metrics: valuationMetrics.length },
  { id: 'price_volume', name: 'Price & Volume', description: 'Stock price momentum and liquidity', metrics: priceVolumeMetrics.length },
  { id: 'technical', name: 'Technical Indicators', description: 'Chart patterns and momentum signals', metrics: technicalMetrics.length },
  { id: 'broker_ratings', name: 'Broker Ratings', description: 'Analyst recommendations and targets', metrics: brokerRatingsMetrics.length },
  { id: 'ownership', name: 'Ownership', description: 'Promoter and institutional holdings', metrics: ownershipMetrics.length },
  { id: 'stock_deals', name: 'Stock Deals', description: 'Insider and bulk trading activity', metrics: stockDealsMetrics.length },
  { id: 'income_statement', name: 'Income Statement', description: 'Revenue, costs, and profitability', metrics: incomeStatementMetrics.length },
  { id: 'balance_sheet', name: 'Balance Sheet & Cash Flow', description: 'Assets, liabilities, and cash generation', metrics: balanceSheetMetrics.length },
]

// Helper function to get metric definition by ID
export function getMetricDefinition(metricId: string): MetricDefinition | undefined {
  return allMetricDefinitions.find(m => m.id === metricId)
}

// Helper function to get all metrics for a segment (supports V2 merged segments)
export function getMetricsForSegment(segmentId: string): MetricDefinition[] {
  // V2 financial_health merges 3 old segments
  if (segmentId === 'financial_health') {
    return allMetricDefinitions.filter(m =>
      m.segment === 'financial_ratios' || m.segment === 'income_statement' || m.segment === 'balance_sheet'
    )
  }
  // V2 performance = old price_volume
  if (segmentId === 'performance') {
    return allMetricDefinitions.filter(m => m.segment === 'price_volume')
  }
  // V2 institutional_signals = old broker_ratings + ownership
  if (segmentId === 'institutional_signals') {
    return allMetricDefinitions.filter(m => m.segment === 'broker_ratings' || m.segment === 'ownership')
  }
  return allMetricDefinitions.filter(m => m.segment === segmentId)
}

// Helper function to determine status based on value and benchmarks
export function getMetricStatus(
  metricId: string,
  value: number
): 'excellent' | 'good' | 'fair' | 'poor' {
  const definition = getMetricDefinition(metricId)
  if (!definition) return 'fair'

  const { benchmarks, higherIsBetter } = definition

  if (higherIsBetter) {
    if (value >= benchmarks.excellent) return 'excellent'
    if (value >= benchmarks.good) return 'good'
    if (value >= benchmarks.fair) return 'fair'
    return 'poor'
  } else {
    if (value <= benchmarks.excellent) return 'excellent'
    if (value <= benchmarks.good) return 'good'
    if (value <= benchmarks.fair) return 'fair'
    return 'poor'
  }
}

console.log(`StockFox Metrics: ${allMetricDefinitions.length} metrics across ${segmentDefinitions.length} segments`)

// ============================================================
// V2 SEGMENT DEFINITIONS — Quant + Qual + Risk Hierarchy
// ============================================================

import type { VerdictPillar, SegmentScoringType } from '@/types'

export interface SegmentDefinitionV2 {
  id: string
  name: string
  pillar: VerdictPillar
  scoringType: SegmentScoringType
  description: string
  v1Sources: string[]  // Which V1 segments feed into this
}

export const QUANT_SEGMENTS: SegmentDefinitionV2[] = [
  {
    id: 'profitability', name: 'Profitability', pillar: 'quant', scoringType: 'scored',
    description: 'How efficiently the company generates profits — ROCE, ROE, margins',
    v1Sources: ['profitability'],
  },
  {
    id: 'growth', name: 'Growth', pillar: 'quant', scoringType: 'scored',
    description: 'Revenue, earnings, and cash flow trajectory with TAM runway',
    v1Sources: ['growth'],
  },
  {
    id: 'valuation', name: 'Valuation', pillar: 'quant', scoringType: 'scored',
    description: 'Is the stock fairly priced? P/E, P/B, EV/EBITDA, DCF intrinsic value',
    v1Sources: ['valuation'],
  },
  {
    id: 'financial_health', name: 'Financial Health', pillar: 'quant', scoringType: 'scored',
    description: 'Consolidated financial strength — liquidity, leverage, efficiency, cash flows',
    v1Sources: ['financial_ratios', 'income_statement', 'balance_sheet'],
  },
  {
    id: 'technical', name: 'Technical Indicators', pillar: 'quant', scoringType: 'scored',
    description: 'Long-term technical signals — RSI, MACD, moving averages, momentum',
    v1Sources: ['technical'],
  },
  {
    id: 'performance', name: 'Performance', pillar: 'quant', scoringType: 'context',
    description: 'Price action, volume trends, relative performance (context only — not scored)',
    v1Sources: ['price_volume'],
  },
  {
    id: 'institutional_signals', name: 'Institutional / Market Signals', pillar: 'quant', scoringType: 'context',
    description: 'Analyst ratings, FII/DII activity, mutual fund holdings (context only — not scored)',
    v1Sources: ['broker_ratings', 'ownership'],
  },
]

export interface QualFactorDefinition {
  id: string
  name: string
  pillar: VerdictPillar
  description: string
  signalCount: number
  groupNames: Record<string, string>
  anchorGroup: string
}

export const QUAL_FACTORS: QualFactorDefinition[] = [
  {
    id: 'management_governance', name: 'Management & Governance', pillar: 'qual',
    description: 'Promoter alignment, governance quality, management capability',
    signalCount: 15,
    groupNames: { A: 'Promoter Alignment', B: 'Governance Structure', C: 'Management Capability', D: 'Trajectory' },
    anchorGroup: 'A',
  },
  {
    id: 'business_quality', name: 'Business Quality', pillar: 'qual',
    description: 'Margin durability, revenue quality, pricing power, competitive moat',
    signalCount: 11,
    groupNames: { A: 'Margin & Return Durability', B: 'Revenue Fragility', C: 'Pricing Power', D: 'Earnings Backing' },
    anchorGroup: 'A',
  },
  {
    id: 'capital_discipline', name: 'Capital Discipline', pillar: 'qual',
    description: 'Dilution history, capital deployment quality, shareholder returns',
    signalCount: 16,
    groupNames: { A: 'Dilution & Funding', B: 'Capital Deployment', C: 'Capital Returns', D: 'Acquisition Track Record' },
    anchorGroup: 'C',
  },
  {
    id: 'earnings_quality', name: 'Earnings Quality', pillar: 'qual',
    description: 'Cash conversion, balance sheet quality, reporting integrity',
    signalCount: 14,
    groupNames: { A: 'Cash Conversion', B: 'Balance Sheet Quality', C: 'Reporting Integrity', D: 'Pattern Anomalies' },
    anchorGroup: 'A',
  },
  {
    id: 'execution_quality', name: 'Execution Quality', pillar: 'qual',
    description: 'Financial delivery vs guidance, operational KPIs, communication quality',
    signalCount: 10,
    groupNames: { A: 'Financial Delivery', B: 'Operational Delivery', C: 'Communication Quality' },
    anchorGroup: 'A',
  },
]

// News & Events taxonomy (not scored — separate section)
export const NEWS_BUCKETS = [
  { id: 'financial_performance', name: 'Financial Performance', eventCount: 8 },
  { id: 'corporate_actions', name: 'Corporate Actions', eventCount: 6 },
  { id: 'governance_ownership', name: 'Governance & Ownership', eventCount: 6 },
  { id: 'strategic_business', name: 'Strategic & Business', eventCount: 6 },
  { id: 'external_macro', name: 'External & Macro', eventCount: 6 },
  { id: 'market_signals', name: 'Market Signals', eventCount: 4 },
  { id: 'sentiment_third_party', name: 'Sentiment & Third Party', eventCount: 4 },
  { id: 'documents_reference', name: 'Documents & Reference', eventCount: 4 },
] as const

// Combined V2 segment list for reference
export const segmentDefinitionsV2 = {
  quant: QUANT_SEGMENTS,
  qual: QUAL_FACTORS,
  newsBuckets: NEWS_BUCKETS,
}

/**
 * Map V1 segment ID to V2 segment ID
 */
export function mapV1ToV2Segment(v1SegmentId: string): string | null {
  const mapping: Record<string, string> = {
    profitability: 'profitability',
    financial_ratios: 'financial_health',
    growth: 'growth',
    valuation: 'valuation',
    price_volume: 'performance',
    technical: 'technical',
    broker_ratings: 'institutional_signals',
    ownership: 'institutional_signals',  // FII/DII part; promoter goes to MG
    stock_deals: '',  // DROPPED
    income_statement: 'financial_health',
    balance_sheet: 'financial_health',
  }
  return mapping[v1SegmentId] || null
}
