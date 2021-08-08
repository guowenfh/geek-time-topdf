const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')
const util = require('util')
const mkdir = util.promisify(fs.mkdir)
const access = util.promisify(fs.access)
const api = require('./api.js')
const ProgressBar = require('progress')
const utils = require('./utils')
let browser
let page

async function initBrowser() {
  try {
    browser = await puppeteer.launch({
      ignoreHTTPSErrors: true,
      timeout: 30000,
      headless: true // 是否启用无头模式页面
    })
    page = await browser.newPage()
    await page.setDefaultNavigationTimeout(0)
    // 设置头加上跳转
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36'
    )
    await page.setExtraHTTPHeaders({
      Origin: 'https://account.geekbang.org'
    })
    const cookie = utils.getCookie()
    await page.setCookie(...cookie)
  } catch (error) {
    console.error('初始化浏览器失败', error)
  }
}

async function downArticle({ article, pagePrint }) {
  if (!browser) {
    await initBrowser()
  }
  const curr = article.subList.find(item => item.title.indexOf(article.course.trim()) !== -1)
  let task = await api.getArticle(curr.extra.column_id)
  console.log(`找到${task.length}节课程`)
  await pageToFile(task, article.course, pagePrint.path, pagePrint.fileType)
}
/**
 * Print Page to file
 *
 * @param {Array} articleList 文章列表
 * @param {String} course 打印的课程名称 （文件夹名称
 * @param {String} basePath 路径前缀
 * @param {String}} fileType 打印的类型 pdf png
 */
async function pageToFile(articleList, course, basePath, fileType) {
  try {
    // 路径处理
    if (basePath) {
      basePath = path.join(path.resolve(path.normalize(basePath)), course)
    } else {
      basePath = path.join(process.cwd(), course)
    }
    const err = fs.existsSync(basePath)
    if (!err) {
      await mkdir(basePath)
    }
    // 进度条
    const progressBar = new ProgressBar('  printing: :current/:total [:bar]  :title', {
      complete: '=',
      width: 20,
      total: articleList.length
    })
    // 这里也可以使用 Promise.all，但 cpu 和网络可能都吃紧，谨慎操作
    for (let i = 0, len = articleList.length; i < len; i++) {
      let articlePage = await browser.newPage()
      let a = articleList[i]
      const fileName = filterName(`${i}-${a.article_title}`)
      const fileFullName = `${fileName}.${fileType}`.replace(/\\|\/|:|\*|\?|"|<|>|\|/g, '')
      const fileFullPath = path.join(basePath, fileFullName)
      progressBar.tick({ title: a.article_title })
      // 检查当前目录中是否存在该文件。
      try {
        await access(fileFullPath, fs.constants.F_OK)
        console.log(`${fileFullName} has already existed, next one`)
        continue
      } catch (e) {
        //console.log('Error : ',e)
      }
      await setPageInfo(articlePage, a.href)
      await new Promise(res => setTimeout(res, 2000))
      // Print
      await printPage(articlePage, fileFullPath, fileType)
      articlePage.close()
    }
    console.log(`《${course}》:Download Completed`)
    return true
  } catch (error) {
    console.error('Printing Error: ', error)
  }
}

async function setPageInfo(pageInstance, href) {
  await pageInstance.setViewport({
    width: 1380,
    height: 800
  })
  await pageInstance.setExtraHTTPHeaders({
    Origin: 'https://time.geekbang.org',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.119 Safari/537.36'
  })
  await pageInstance.goto(href, {
    referer: 'https://time.geekbang.org/',
    waitUntil: 'networkidle0',
    timeout: 0
  })

  await setCss(pageInstance)
}

async function printPage(pageInstance, fileFullPath, fileType) {
  if (fileType == 'pdf') {
    await pageInstance.pdf({
      path: fileFullPath,
      height: 1080 + 'px',
      width: 920 + 'px'
    })
  } else if (fileType == 'png') {
    await pageInstance.screenshot({
      path: fileFullPath,
      type: 'png',
      fullPage: true
    })
  }
}
/**
 *注入css，美化打印后的效果
 *
 * @param {*} pageInstance
 */
async function setCss(pageInstance) {
  await pageInstance.evaluate(async () => {
    const $ = document.querySelector.bind(document)
    const contentDom = $('#app > div >div:nth-child(2)')
    const hideDomMap = {
      // 去订阅文字
      goSubscriptionText: $('.bottom'),
      // 侧边栏菜单
      sideMenu: $('#app > div >div:nth-child(1)'),
      // 音频播放
      //audio: contentDom.querySelector('div:nth-child(2) > div:nth-child(1) > div:nth-child(3) > div:nth-child(2)'),
      audio: contentDom.querySelector(
        'div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(3) > div:nth-child(2)'
      ),
      // 课程推荐
      courseAD: contentDom.querySelector(
        'div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(3) > div:nth-last-child(2)'
      ),
      // 顶部菜单
      topBar: contentDom.querySelector('div'),
      // 评论输入框
      //commentInputBlock: $('#app > div >div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(4)'),
      commentInputBlock: contentDom.querySelector(
        'div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(4)'
      ),
      // 两侧导航icon
      iconLeft: $('#app > div >div:nth-child(2) > div:nth-child(3)'),
      iconRight: $('#app > div >div:nth-child(2) > div:nth-child(4)')
    }
    const fixPosDomMap = {
      body: $('#app > div'),
      bodyChild: $('#app > div >div:nth-child(2)'),
      bodyLast: $('#app > div >div:nth-child(2) >div:nth-child(2)')
    }
    setStyleObjetc(hideDomMap, 'display', 'none')
    setStyleObjetc(fixPosDomMap, 'position', 'initial')

    function setStyleObjetc(obj, attr, value) {
      Object.values(obj).map(dom => {
        if (dom) {
          dom.style[attr] = value
        }
      })
    }
  })
}

function close() {
  page.close()
  browser.close()
  process.exit()
}
/**
 *格式化文件名，防止特殊字符导致错误
 *
 * @param {string} name
 * @returns
 */
function filterName(name) {
  const reg = /[`~!@#$%^&*()_+<>?:"{},./;'[\]]/gim
  return name.replace(reg, '')
}
exports.downArticle = downArticle
exports.close = close
