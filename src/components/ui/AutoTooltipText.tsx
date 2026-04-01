import { useMemo } from 'react'
import { Tooltip } from './Tooltip'

/**
 * Dictionary of financial abbreviations and jargon with plain-English definitions.
 * Sorted by length (longest first) at runtime so compound terms like "EV/EBITDA"
 * match before their sub-parts.
 */
const ABBREVIATIONS: Record<string, string> = {
  // Ratios & metrics
  'EV/EBITDA': 'Enterprise Value to EBITDA — compares a company\'s total value (including debt) to its operating earnings. Lower = potentially cheaper.',
  'OCF/PAT': 'Operating Cash Flow to Profit After Tax — measures how much reported profit is backed by actual cash. >1x is healthy.',
  'P/E': 'Price-to-Earnings ratio — how much investors pay per rupee of earnings. Lower may indicate value, higher may indicate growth expectations.',
  'P/B': 'Price-to-Book ratio — compares market price to the company\'s net asset value per share.',
  'D/E': 'Debt-to-Equity ratio — how much debt a company uses relative to shareholder equity. Lower = less financial risk.',
  'PEG': 'Price/Earnings-to-Growth ratio — P/E adjusted for growth rate. Below 1 may suggest the stock is undervalued relative to growth.',

  // Profitability & returns
  'ROCE': 'Return on Capital Employed — profit generated per rupee of capital used. Higher = more efficient use of capital.',
  'ROE': 'Return on Equity — profit generated per rupee of shareholder equity. Measures how well the company uses your money.',
  'ROA': 'Return on Assets — profit generated per rupee of total assets. Shows overall efficiency.',
  'ROIC': 'Return on Invested Capital — measures how efficiently a company allocates capital to profitable investments.',
  'WACC': 'Weighted Average Cost of Capital — the blended cost of all funding (debt + equity). Projects should earn above WACC to create value.',

  // Cash flow & earnings
  'EBITDA': 'Earnings Before Interest, Tax, Depreciation and Amortisation — a proxy for operating cash generation before financing and accounting choices.',
  'PAT': 'Profit After Tax — the company\'s bottom-line net profit after all expenses and taxes.',
  'OCF': 'Operating Cash Flow — actual cash generated from core business operations, excluding investments and financing.',
  'FCF': 'Free Cash Flow — cash left after the company funds its operations and capital expenditure. Available for dividends, buybacks, or debt repayment.',
  'CFO': 'Cash Flow from Operations — same as OCF; cash generated from the company\'s main business activities.',
  'EPS': 'Earnings Per Share — net profit divided by number of shares. Higher = more earnings attributable to each share.',

  // Market & institutional
  'FII': 'Foreign Institutional Investor — overseas funds (mutual funds, pension funds, hedge funds) that invest in Indian markets.',
  'DII': 'Domestic Institutional Investor — Indian mutual funds, insurance companies, and banks that invest in the stock market.',
  'MF': 'Mutual Fund — a pooled investment vehicle managed by a professional fund manager.',

  // Regulatory & governance
  'SEBI': 'Securities and Exchange Board of India — the market regulator that oversees stock exchanges, brokers, and listed companies.',
  'NPA': 'Non-Performing Asset — a loan or advance where the borrower has stopped making payments. High NPA = risky for banks.',
  'RPT': 'Related Party Transaction — deals between the company and its promoters, directors, or their relatives. Requires disclosure and scrutiny.',
  'ESOP': 'Employee Stock Ownership Plan — shares granted to employees as compensation. Dilutes existing shareholders if excessive.',

  // Banking-specific
  'CRAR': 'Capital to Risk-weighted Assets Ratio — a bank\'s capital buffer against potential losses. Higher = safer bank.',
  'NIM': 'Net Interest Margin — the difference between interest earned and interest paid, as a percentage of assets. Core profitability metric for banks.',
  'GNPA': 'Gross Non-Performing Assets — total bad loans before any provisions or write-offs.',
  'NNPA': 'Net Non-Performing Assets — bad loans remaining after deducting provisions. Shows the real risk on the balance sheet.',
  'CASA': 'Current Account Savings Account ratio — proportion of low-cost deposits. Higher CASA = cheaper funding for the bank.',
  'PCR': 'Provision Coverage Ratio — percentage of bad loans covered by provisions. Higher = better prepared for losses.',

  // Technical & market
  'RSI': 'Relative Strength Index — momentum indicator (0-100). Above 70 = potentially overbought, below 30 = potentially oversold.',
  'MACD': 'Moving Average Convergence Divergence — trend-following momentum indicator that shows the relationship between two moving averages.',
  'DMA': 'Day Moving Average — the average closing price over a set number of days. Used to identify trends (e.g., 200 DMA for long-term trend).',
  'SMA': 'Simple Moving Average — average of closing prices over a period. Smooths out daily noise to reveal the underlying trend.',
  'EMA': 'Exponential Moving Average — weighted moving average that gives more importance to recent prices.',
  'ADX': 'Average Directional Index — measures trend strength (0-100). Above 25 = strong trend, below 20 = weak or no trend.',

  // Valuation & corporate
  'EV': 'Enterprise Value — total company value including market cap + debt minus cash. A more complete measure than market cap alone.',
  'DCF': 'Discounted Cash Flow — a valuation method that estimates what future cash flows are worth today.',
  'CAGR': 'Compound Annual Growth Rate — the smoothed annual growth rate over a period. Useful for comparing growth across different time frames.',
  'IPO': 'Initial Public Offering — when a company first sells shares to the public on a stock exchange.',
  'QoQ': 'Quarter-on-Quarter — comparison of a metric between consecutive quarters.',
  'YoY': 'Year-on-Year — comparison of a metric between the same quarter or period in consecutive years.',
  'TTM': 'Trailing Twelve Months — the sum of the last four quarters. Used to get a full-year picture from the most recent data.',
  'FY': 'Financial Year — the 12-month accounting period (in India, April to March).',

  // Surveillance & flags
  'ASM': 'Additional Surveillance Measure — SEBI\'s watch list for stocks with unusual price or volume movements. Triggers higher margin requirements.',
  'GSM': 'Graded Surveillance Measure — stricter than ASM; restricts trading in stocks with poor fundamentals or suspicious activity.',

  // Ownership
  'FPI': 'Foreign Portfolio Investor — similar to FII; overseas investors buying Indian securities.',
  'HNI': 'High Net-worth Individual — wealthy individual investors, typically with portfolios above 2 crore.',

  // Business quality
  'TAM': 'Total Addressable Market — the total revenue opportunity available for a product or service. Larger TAM = more room to grow.',
  'CAPEX': 'Capital Expenditure — money spent on acquiring or upgrading physical assets like factories, equipment, or technology.',
  'OPEX': 'Operating Expenditure — day-to-day running costs of the business (salaries, rent, utilities).',
  'OPM': 'Operating Profit Margin — operating profit as a percentage of revenue. Shows how efficiently the company runs its core business.',
  'NPM': 'Net Profit Margin — net profit as a percentage of revenue. The final measure of profitability after all costs.',
  'GPM': 'Gross Profit Margin — revenue minus cost of goods sold, as a percentage of revenue.',
}

// Pre-compute the sorted terms (longest first) and compiled regex
const SORTED_TERMS = Object.keys(ABBREVIATIONS).sort((a, b) => b.length - a.length)

// Escape special regex characters in terms (for P/E, D/E, EV/EBITDA etc.)
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\\/&]/g, '\\$&')
}

const PATTERN = new RegExp(
  `(?<=^|[\\s(,;:\\u2013\\u2014\\u201c\\u2018])(?:${SORTED_TERMS.map(escapeRegex).join('|')})(?=$|[\\s).,;:\\u2013\\u2014\\u201d\\u2019!?])`,
  'g'
)

interface AutoTooltipTextProps {
  /** The plain text to scan for abbreviations */
  text: string
  /** Base text styling class */
  className?: string
}

/**
 * Renders text with known financial abbreviations automatically wrapped in Tooltips.
 * Uses word-boundary matching to avoid false positives inside other words.
 */
export function AutoTooltipText({ text, className }: AutoTooltipTextProps) {
  const parts = useMemo(() => {
    if (!text) return []

    const result: { text: string; tooltip?: string }[] = []
    let lastIndex = 0

    // Reset regex state
    PATTERN.lastIndex = 0

    let match: RegExpExecArray | null
    while ((match = PATTERN.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        result.push({ text: text.slice(lastIndex, match.index) })
      }
      // Add the matched abbreviation with its tooltip
      result.push({ text: match[0], tooltip: ABBREVIATIONS[match[0]] })
      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      result.push({ text: text.slice(lastIndex) })
    }

    return result
  }, [text])

  // If no abbreviations found, render plain text
  if (parts.length <= 1 && !parts[0]?.tooltip) {
    return <span className={className}>{text}</span>
  }

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.tooltip ? (
          <Tooltip key={i} content={part.tooltip} position="bottom" maxWidth={300}>
            <span className="cursor-help border-b border-dotted border-neutral-600">
              {part.text}
            </span>
          </Tooltip>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  )
}
