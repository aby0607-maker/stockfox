/**
 * Vercel Serverless Function — Yahoo Finance Proxy
 *
 * Proxies requests to query2.finance.yahoo.com for OHLCV price data.
 * No auth needed — Yahoo Finance chart API is public.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

const YAHOO_BASE = 'https://query2.finance.yahoo.com'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const rawPath = req.query['...path'] ?? req.query.path
  const yahooPath = Array.isArray(rawPath) ? `/${rawPath.join('/')}` : (rawPath ? `/${rawPath}` : '')

  if (!yahooPath || yahooPath.includes('..')) {
    return res.status(400).json({ error: 'Invalid path' })
  }

  // Reconstruct query params
  const queryParams = new URLSearchParams()
  for (const [key, val] of Object.entries(req.query)) {
    if (key === '...path' || key === 'path') continue
    if (typeof val === 'string') queryParams.set(key, val)
  }
  const qs = queryParams.toString()
  const targetUrl = `${YAHOO_BASE}${yahooPath}${qs ? '?' + qs : ''}`

  try {
    const upstream = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StockFox/1.0)' },
    })

    const body = await upstream.text()
    const contentType = upstream.headers.get('content-type') || 'application/json'

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200')
    res.setHeader('Access-Control-Allow-Origin', '*')

    return res.status(upstream.status).send(body)
  } catch (error) {
    console.error(`[Yahoo Proxy] Failed:`, error)
    return res.status(502).json({ error: 'Upstream error' })
  }
}
