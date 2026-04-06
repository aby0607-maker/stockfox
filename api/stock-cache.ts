/**
 * Vercel Function — Stock Cache API
 *
 * GET /api/stock-cache          → Read latest cached stock data from Vercel Blob
 * GET /api/stock-cache?symbol=X → Read single stock from cache
 * PUT /api/stock-cache          → Write-through: update a stock's cached data (from Scorecard)
 *
 * Data is stored in Vercel Blob as `v2-stock-data/latest.json`.
 * The nightly cron overwrites this file. Write-through from Scorecard
 * patches individual stocks without a full rewrite.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { put, head, list } from '@vercel/blob'

const BLOB_PATH = 'v2-stock-data/latest.json'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'GET') {
    try {
      // Find the blob URL
      const blobs = await list({ prefix: 'v2-stock-data/latest' })
      const blob = blobs.blobs[0]

      if (!blob) {
        // Fallback: read from static JSON file (seed data)
        return res.status(200).json({
          source: 'static-fallback',
          message: 'Vercel Blob not yet populated. Using static seed data.',
        })
      }

      // If requesting a specific symbol, we still return the full blob
      // Client-side filtering is simpler and blob reads are fast
      const response = await fetch(blob.url)
      const data = await response.json()

      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
      return res.status(200).json(data)
    } catch (error) {
      console.error('[StockCache] Read error:', error)
      return res.status(500).json({ error: 'Failed to read stock cache' })
    }
  }

  if (req.method === 'PUT') {
    try {
      const body = req.body
      if (!body || !body.stocks) {
        return res.status(400).json({ error: 'Missing stocks data' })
      }

      const blob = await put(BLOB_PATH, JSON.stringify(body), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
      })

      return res.status(200).json({
        success: true,
        url: blob.url,
        stockCount: body.stocks?.length ?? 0,
      })
    } catch (error) {
      console.error('[StockCache] Write error:', error)
      return res.status(500).json({ error: 'Failed to write stock cache' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
