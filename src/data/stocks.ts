import type { Stock } from '@/types'

export const stocks: Stock[] = [
  {
    id: 'zomato',
    symbol: 'ZOMATO',
    name: 'Eternal (Zomato)',
    sector: 'Food Tech',
    subSector: 'Quick Commerce & Food Delivery',
    currentPrice: 229,
    previousClose: 232,
    change: -3,
    changePercent: -1.29,
    marketCap: 228250,
    high52w: 368,
    low52w: 195,
    beta: 1.8,
    peerGroup: ['Swiggy', 'Nykaa', 'Paytm', 'PolicyBazaar'],
  },
  {
    id: 'axisbank',
    symbol: 'AXISBANK',
    name: 'Axis Bank',
    sector: 'Banking',
    subSector: 'Private Sector Banks',
    currentPrice: 1160,
    previousClose: 1155,
    change: 5,
    changePercent: 0.43,
    marketCap: 381619,
    high52w: 1418,
    low52w: 1011,
    beta: 1.2,
    peerGroup: ['HDFC Bank', 'ICICI Bank', 'Kotak Bank', 'IndusInd Bank'],
  },
  {
    id: 'tcs',
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    sector: 'IT Services',
    subSector: 'Large Cap IT',
    currentPrice: 3451,
    previousClose: 3480,
    change: -29,
    changePercent: -0.83,
    marketCap: 1248000,
    high52w: 4592,
    low52w: 3311,
    beta: 0.7,
    peerGroup: ['Infosys', 'Wipro', 'HCL Tech', 'Tech Mahindra'],
  },
]

export const getStockById = (id: string): Stock | undefined => {
  return stocks.find(s => s.id === id || s.symbol.toLowerCase() === id.toLowerCase())
}

export const getStockBySymbol = (symbol: string): Stock | undefined => {
  return stocks.find(s => s.symbol.toLowerCase() === symbol.toLowerCase())
}
