const puppeteer = require('puppeteer')
const cookie = require('../config').cookie
let browser
let pool = []
const userAgent = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36'
]
async function initBrowser() {
  try {
    browser = await puppeteer.launch({
      ignoreHTTPSErrors: true,
      headless: true, // 是否启用无头模式页面
      timeout: 30000
    })
    const page = await browser.newPage()
    // 设置头加上跳转
    await page.setUserAgent(userAgent[Math.round(Math.random())])
    await page.setExtraHTTPHeaders({
      Origin: 'https://account.geekbang.org'
    })
    await page.setCookie(...cookie)
  } catch (error) {
    console.error('初始化浏览器失败', error)
  }
}

async function initPagePool(n) {
  while (n) {
    const pageInstance = await browser.newPage()
    await pageInstance.setViewport({
      width: 1380,
      height: 800
    })
    await pageInstance.setExtraHTTPHeaders({
      Origin: 'https://time.geekbang.org',
      'User-Agent': userAgent[Math.round(Math.random())]
    })
    pool.push(pageInstance)
    n = n - 1
  }
}
// Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36
async function getPage() {
  while (!pool.length) {
    await new Promise(reslove => {
      setTimeout(() => reslove(), 200)
    })
  }
  return pool.shift()
}

function hirePage(pageInstance) {
  pool.push(pageInstance)
}

async function initPage(n) {
  await initBrowser()
  await initPagePool(n)
  return pool
}
process.on('exit', () => {
  if (browser) {
    browser.close()
  }
})
module.exports = {
  initPage,
  getPage,
  hirePage
}
