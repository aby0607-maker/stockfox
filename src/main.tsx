import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { injectSpeedInsights } from '@vercel/speed-insights'
import App from './App'
import './index.css'

// Enable Vercel Speed Insights
injectSpeedInsights()

// Preload stock cache immediately — ensures instant Scorecard loading
// The 3MB JSON starts fetching in parallel with initial page render
import('./services/stockCacheService').catch(() => {})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
