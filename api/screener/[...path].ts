/**
 * Vercel Serverless Function — Screener.in Proxy
 *
 * Proxies requests to Screener.in company pages.
 * HTML parsing happens client-side in screener/companyData.ts.
 *
 * Route: /api/screener/company/{SYMBOL}/
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

const SCREENER_BASE = 'https://www.screener.in'

const ALLOWED_ORIGINS = [
  'https://stockfox.vercel.app',
  'https://sf-backtesting.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const rawPath = req.query["...path"] ?? req.query.path; const path = rawPath
  const screenerPath = Array.isArray(path) ? `/${path.join('/')}` : `/${path}`

  if (screenerPath.includes('..') || screenerPath.includes('//')) {
    return res.status(400).json({ error: 'Invalid path' })
  }

  if (!screenerPath.startsWith('/company/')) {
    return res.status(403).json({ error: 'Endpoint not allowed' })
  }

  const targetUrl = `${SCREENER_BASE}${screenerPath}`

  try {
    const headers: Record<string, string> = {
      'Accept': 'text/html',
      'User-Agent': 'Mozilla/5.0 (compatible; StockFox/1.0)',
    }

    const sessionId = process.env.SCREENER_SESSION_ID
    if (sessionId) {
      headers['Cookie'] = `sessionid=${sessionId}`
    }

    const upstream = await fetch(targetUrl, { headers })
    const body = await upstream.text()

    const origin = req.headers?.origin ?? ''
    if (ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'text/html')
    res.setHeader('X-Frame-Options', 'SAMEORIGIN')
    res.setHeader('X-Content-Type-Options', 'nosniff')

    if (upstream.ok) {
      res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=43200')
    }

    return res.status(upstream.status).send(body)
  } catch (error) {
    console.error(`[Screener Proxy] Failed to fetch ${targetUrl}:`, error)
    return res.status(502).json({ error: 'Upstream API error' })
  }
}
