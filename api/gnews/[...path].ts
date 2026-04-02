/**
 * Vercel Serverless Function — Google News RSS Proxy
 *
 * Proxies requests from /api/gnews/* to https://news.google.com/*
 * No auth needed. Passes through RSS XML responses.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

const GNEWS_BASE = 'https://news.google.com'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const rawPath = req.query["...path"] ?? req.query.path; const path = rawPath
  const gnewsPath = Array.isArray(path) ? `/${path.join('/')}` : `/${path}`

  // Reconstruct query params (q, hl, gl, ceid)
  const queryParams = new URLSearchParams()
  for (const [key, val] of Object.entries(req.query)) {
    if (key === 'path') continue
    if (typeof val === 'string') queryParams.set(key, val)
  }
  const qs = queryParams.toString()
  const targetUrl = `${GNEWS_BASE}${gnewsPath}${qs ? '?' + qs : ''}`

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StockFox/1.0)',
      },
    })

    const body = await upstream.text()
    const contentType = upstream.headers.get('content-type') || 'application/xml'

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200')
    res.setHeader('Access-Control-Allow-Origin', '*')

    return res.status(upstream.status).send(body)
  } catch (error) {
    console.error(`[GNews Proxy] Failed to fetch ${targetUrl}:`, error)
    return res.status(502).json({ error: 'Upstream error' })
  }
}
