const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')
const util = require('util')
const mkdir = util.promisify(fs.mkdir)
const ProgressBar = require('progress')

const scrollStep = 1000 //每次滚动的步长
const pageWaitTime = 1200 // 每次滚动页面等待下一次滚动的时间
const courseWaitTime = 2000 // 搜索一个课程有多少小姐时使用
let browser
let page
/**
 * 启动 puppeteer 开始登陆
 * @param {Object} account
 * @returns {Promise}
 */
async function start(account) {
  try {
    browser = await puppeteer.launch({
      ignoreHTTPSErrors: true,
      headless: true, // 是否启用无头模式页面
      // devtools:true,
      timeout: 0
    })
    // 打开新页面
    page = await browser.newPage()
    await page.setViewport({
      width: 1380,
      height: 800
    })
    // 设置头加上跳转
    await page.setExtraHTTPHeaders({
      Origin: 'https://time.geekbang.org',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.119 Safari/537.36'
    })
    await page.goto('https://time.geekbang.org/', {
      referer: 'https://time.geekbang.org/'
    })
    await page.waitForSelector('.control')

    // 点击登录
    page.click('.control a.pc')

    // 页面跳转,现在登陆改版了
    await page.waitForNavigation()
    await page.waitForSelector('.nw-phone-wrap .nw-input')

    // 还是走老的密码登陆
    await page.click('.forget a')
    await new Promise(res => setTimeout(res, 1000))
    await page.waitForSelector('.input-wrap .input')

    // 登录输入账号密码
    await page.type('.nw-phone-wrap .nw-input', String(account.phone))
    await page.type('.input-wrap .input', account.password, { delay: 20 })
    page.click('.mybtn')

    // 页面跳转回来
    await page.waitForNavigation()
    //  第一个卡片被渲染
    await page.waitForSelector('.column-list')

    let scrollEnable = true
    console.log('正在查找课程列表, 请耐心等待...')
    // 滚动到页面最底部，以保证所有的课程都被加载
    while (scrollEnable) {
      scrollEnable = await page.evaluate(
        async (scrollStep, pageWaitTime) => {
          let scrollTop = document.scrollingElement.scrollTop
          document.scrollingElement.scrollTop = scrollTop + scrollStep
          await new Promise(res => setTimeout(res, pageWaitTime))
          // 如果整个 body 的高比当前滚动的 scrollTop 高 2000 以上那么就进行下一轮
          if (document.body.clientHeight > scrollTop + 2000) {
            try {
              // 添加滚动步伐
              document.scrollingElement.scrollTop = scrollTop + scrollStep
              // 检查最后的 footer 有没有在 dom 中显示，1s 的等待时间
              await page.waitForSelector('.page-footer', {
                visible: true,
                timeout: 1000
              })
              // 滚动结束
              return false
            } catch (error) {
              // 版权信息没显示的话表示 还没滚动到底，滚动一下
              document.scrollingElement.scrollTop = scrollTop + scrollStep
              return true
            }
          }
          document.scrollingElement.scrollTop = scrollTop + scrollStep
          // 滚动结束
          return false
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
          link: item.querySelector('a').getAttribute('href'),
          isSubscibe: item.innerText.indexOf('已订阅') !== -1 || item.innerText.indexOf('已购买') !== -1
        }))
        .filter(item => item.isSubscibe)
    })
    console.log(subList.length ? `共查找到${subList.length}门课程。` : '无已订阅课程')
    return subList
  } catch (error) {
    console.error('用户登录失败', error)
  }
}

/**
 * 确定需要打印的课程，输出课程目录
 * @param {String} course 搜索的课程
 * @param {Array} subList 已经订阅的课程列表
 * @returns {Promise}
 */
async function searchCourse(course, subList) {
  try {
    console.log('搜索中文章列表中, 请耐心等待...')
    const curr = subList.find(item => item.title.indexOf(course.trim()) !== -1)
    if (!curr) throw Error('no search course')
    // 打开一个新窗口
    let coursePage = await browser.newPage()
    await coursePage.setExtraHTTPHeaders({
      Origin: 'https://time.geekbang.org',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.119 Safari/537.36'
    })
    await coursePage.goto(`https:${curr.link}`.replace('/intro', ''), {
      referer: 'https://time.geekbang.org/'
    }) // 现在连接 html 上没有连接了

    await new Promise(res => setTimeout(res, 2000))
    await coursePage.waitForSelector('.article-item-title')

    let scrollEnable = true

    // 滚动页面
    while (scrollEnable) {
      scrollEnable = await coursePage.evaluate(
        async (scrollStep, courseWaitTime) => {
          let scrollTop = document.scrollingElement.scrollTop
          document.scrollingElement.scrollTop = scrollTop + scrollStep
          await new Promise(res => setTimeout(res, courseWaitTime))
          return document.body.clientHeight > scrollTop + 2000 ? true : false
        },
        scrollStep,
        courseWaitTime
      )
    }
    await new Promise(res => setTimeout(res, pageWaitTime))

    // 拿到所有的文章列表
    const articleList = await coursePage.evaluate(() => {
      return [...document.querySelectorAll('.article-item')].map(item => {
        let href = item.querySelector('a').href
        let title = item
          .querySelector('h2')
          .innerText.replace(/\u{2F}|\u{5C}|\u{7C}|\u{22}/gu, '_')
          .replace(/\s+/g, '')
        return { href, title }
      })
    })
    await coursePage.close()
    console.log(`《${curr.title}》:一共查找到 ( ${articleList.length} ) 篇文章。`)
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
    const progressBar = new ProgressBar('  printing: :current/:total [:bar]  :title', {
      complete: '=',
      width: 20,
      total: articleList.length
    })
    // 这里也可以使用 Promise.all，但 cpu 和网络可能都吃紧，谨慎操作
    for (let i = 0, len = articleList.length; i < len; i++) {
      let articlePage = await browser.newPage()

      let a = articleList[i]
      progressBar.tick({ title: a.title })
      await articlePage.setExtraHTTPHeaders({
        Origin: 'https://time.geekbang.org',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.119 Safari/537.36'
      })
      await articlePage.goto(a.href, { referer: 'https://time.geekbang.org/' })

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
    console.log(`《${course}》:任务完成`)
    return true
  } catch (error) {
    console.error('打印出错', error)
  }
}
function colse() {
  page.close()
  browser.close()
  process.exit()
}
exports.start = start
exports.searchCourse = searchCourse
exports.pageToFile = pageToFile
exports.colse = colse
