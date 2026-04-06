/**
 * Vercel Serverless Function — NSE Archives Proxy
 *
 * Proxies requests to nsearchives.nseindia.com for surveillance CSV data.
 * No auth needed — NSE archives are public.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

const NSE_BASE = 'https://nsearchives.nseindia.com'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const rawPath = req.query['...path'] ?? req.query.path
  const nsePath = Array.isArray(rawPath) ? `/${rawPath.join('/')}` : (rawPath ? `/${rawPath}` : '')

  if (!nsePath || nsePath.includes('..')) {
    return res.status(400).json({ error: 'Invalid path' })
  }

  const targetUrl = `${NSE_BASE}${nsePath}`

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StockFox/1.0)',
        'Referer': 'https://www.nseindia.com/',
      },
    })

    const body = await upstream.text()
    const contentType = upstream.headers.get('content-type') || 'text/csv'

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200')
    res.setHeader('Access-Control-Allow-Origin', '*')

    return res.status(upstream.status).send(body)
  } catch (error) {
    console.error(`[NSE Archives Proxy] Failed:`, error)
    return res.status(502).json({ error: 'Upstream error' })
  }
}
