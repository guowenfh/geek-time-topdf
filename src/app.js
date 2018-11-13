const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')
const util = require('util')
const mkdir = util.promisify(fs.mkdir)
const ProgressBar = require('progress')

const scrollStep = 1000 //每次滚动的步长
const pageWaitTime = 1200 // 每次滚动页面等待下一次滚动的时间
let browser
let page

async function start(account) {
  try {
    browser = await puppeteer.launch({
      ignoreHTTPSErrors: true,
      headless: true, // 是否启用无头模式页面
      timeout: 0
    })
    // 打开新页面
    page = await browser.newPage()
    await page.setViewport({
      width: 1200,
      height: 800
    })
    await page.goto('https://time.geekbang.org/')
    await page.waitForSelector('.control', { timeout: 60000 })
    // 点击登录
    page.click('.control a.pc')
    // 页面跳转
    await page.waitForNavigation()
    await page.waitForSelector('.nw-phone-wrap .nw-input', { timeout: 60000 })
    // 登录
    await page.type('.nw-phone-wrap .nw-input', String(account.phone))
    await page.type('.input-wrap .input', account.password, { delay: 20 })
    page.click('.mybtn')
    // 页面跳转回来
    await page.waitForNavigation()
    //  第一个卡片被渲染
    await page.waitForSelector('.column-list')

    let scrollEnable = true
    // 滚动到页面最底部，以保证所有的课程都被加载
    while (scrollEnable) {
      scrollEnable = await page.evaluate(
        async (scrollStep, pageWaitTime) => {
          let scrollTop = document.scrollingElement.scrollTop
          document.scrollingElement.scrollTop = scrollTop + scrollStep
          await new Promise(res => setTimeout(res, pageWaitTime))
          return document.body.clientHeight > scrollTop + 1080 ? true : false
        },
        scrollStep,
        pageWaitTime
      )
    }
    // 查找到所有已经被订阅的文章列表
    const subList = await page.evaluate(() => {
      return [...document.querySelectorAll('.column-list>li')]
        .map((item, index) => ({
          title: item.querySelector('h6').innerText.trim(),
          index: index,
          isSubscibe:
            item.innerText.indexOf('已订阅') !== -1 ||
            item.innerText.indexOf('已购买') !== -1
        }))
        .filter(item => item.isSubscibe)
    })
    console.log(
      subList.length ? `共查找到${subList.length}门课程。` : '无已订阅课程'
    )
    return subList
  } catch (error) {
    console.error('用户登录失败', error)
  }
}

/**
 * 确定需要打印的课程，输出课程目录
 * @param {String} course 搜索的课程
 * @param {Array} subList 已经订阅的课程列表
 * @returns
 */
async function searchCourse(course, subList) {
  try {
    console.log('搜索中, 请耐心等待...')
    const curr = subList.find(item => item.title.indexOf(course.trim()) !== -1)
    if (!curr) throw Error('no search course')
    let browserCreated = false
    // 在点击之前监听浏览器的新建窗口的事件
    browser.once('targetcreated', () => {
      browserCreated = true
    })
    // await page.goto(`https://time.geekbang.org${curr.link}`) // 现在连接 html 上没有连接了
    // 点击标题跳转
    await page.tap(`.column-list>li:nth-child(${curr.index + 1}) h6`)
    // 等待新建页面
    while (!browserCreated) {
      await new Promise(res => setTimeout(res, 1000))
    }
    const pageList = await browser.pages()
    // 新建的页面就是我们需要的
    page = pageList[pageList.length - 1]
    await page.waitForSelector('.article-item-title')

    let scrollEnable = true

    // 滚动页面
    while (scrollEnable) {
      scrollEnable = await page.evaluate(
        async (scrollStep, pageWaitTime) => {
          let scrollTop = document.scrollingElement.scrollTop
          document.scrollingElement.scrollTop = scrollTop + scrollStep
          await new Promise(res => setTimeout(res, pageWaitTime))
          return document.body.clientHeight > scrollTop + 1080 ? true : false
        },
        scrollStep,
        pageWaitTime
      )
    }
    await new Promise(res => setTimeout(res, scrollStep))
    // 拿到所有的文章列表
    const articleList = await page.evaluate(() => {
      return [...document.querySelectorAll('.article-item')].map(item => {
        var href = item.querySelector('a').href
        var title = item
          .querySelector('h2')
          .innerText.replace(/\u{2F}|\u{5C}|\u{7C}|\u{22}/gu, '_')
          .replace(/\s+/g, '')
        return { href, title }
      })
    })
    // page.close()
    console.log(
      `《${curr.title}》:一共查找到 ( ${articleList.length} ) 篇文章。`
    )
    return { courseName: curr.title, articleList }
  } catch (error) {
    console.error('未搜索到课程', error)
  }
}

/**
 * 把文件进行打印
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
    const bar = new ProgressBar('  printing: :current/:total [:bar]  :title', {
      complete: '=',
      width: 20,
      total: articleList.length
    })
    // 这里也可以使用 Promise.all，但cpu可能吃紧，谨慎操作
    for (let i = 0, len = articleList.length; i < len; i++) {
      let articlePage = await browser.newPage()

      var a = articleList[i]
      bar.tick({ title: a.title })

      await articlePage.goto(a.href)

      let scrollEnable = true

      // 滚动
      while (scrollEnable) {
        scrollEnable = await page.evaluate(
          async (scrollStep, pageWaitTime) => {
            let scrollTop = document.scrollingElement.scrollTop
            document.scrollingElement.scrollTop = scrollTop + scrollStep
            await new Promise(res => setTimeout(res, pageWaitTime))
            return document.body.clientHeight > scrollTop + 1080 ? true : false
          },
          scrollStep,
          pageWaitTime
        )
      }
      await new Promise(res => setTimeout(res, scrollStep))
      // 打印
      if (fileType == 'pdf') {
        await articlePage.pdf({ path: path.join(basePath, `${a.title}.pdf`) })
      } else if (fileType == 'png') {
        await articlePage.screenshot({
          path: path.join(basePath, `${a.title}.png`),
          type: 'png',
          fullPage: true
        })
      }

      articlePage.close()
    }
    console.log('任务完成')
    page.close()
    browser.close()
    process.exit()
  } catch (error) {
    console.error('打印出错', error)
  }
}
exports.start = start
exports.searchCourse = searchCourse
exports.pageToFile = pageToFile
