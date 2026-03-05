#!/usr/bin/env node
// Standalone screenshot script using puppeteer-core + the pre-installed Chromium
import puppeteer from 'puppeteer-core'
import { createServer } from 'http'
import { readFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, extname } from 'path'

const DIST = resolve(process.cwd(), 'dist')
const SCREENSHOTS = resolve(process.cwd(), 'screenshots')
const PORT = 5299

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
}

// Simple static file server for the dist build
// The app is built with base: '/Wordgame/' so strip that prefix when resolving files
const BASE = '/Wordgame/'

const server = createServer((req, res) => {
  let urlPath = req.url ?? '/'
  // Strip the base prefix to get the file path inside dist/
  if (urlPath.startsWith(BASE)) {
    urlPath = urlPath.slice(BASE.length)
  }
  if (!urlPath || !urlPath.includes('.')) urlPath = 'index.html'
  const file = resolve(DIST, urlPath)
  if (existsSync(file)) {
    const ext = extname(file)
    res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' })
    res.end(readFileSync(file))
  } else {
    // Fallback to index.html for SPA routing
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(readFileSync(resolve(DIST, 'index.html')))
  }
})

await new Promise(r => server.listen(PORT, r))
console.log(`Static server on http://localhost:${PORT}`)

const browser = await puppeteer.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  headless: true,
})

const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
await page.goto(`http://localhost:${PORT}${BASE}`, { waitUntil: 'networkidle0' })

// Wait for the letter wheel to be present
await page.waitForSelector('[data-testid="letter-wheel"]')
await new Promise(r => setTimeout(r, 600))

mkdirSync(SCREENSHOTS, { recursive: true })
const outPath = resolve(SCREENSHOTS, 'game.png')
await page.screenshot({ path: outPath, fullPage: false })

console.log(`Screenshot saved → ${outPath}`)
await browser.close()
server.close()
