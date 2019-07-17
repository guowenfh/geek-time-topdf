const fs = require('fs')
const path = require('path')
const util = require('util')
const mkdir = util.promisify(fs.mkdir)
const access = util.promisify(fs.access)
const api = require('./api.js')
const ProgressBar = require('progress')
const pageObj = require('./page.js')
const queue = require('./queue.js')
const concurrent = 2 // 并发数量
const restCount = 20 // 休息防止和谐
let pagePool
async function downArticle({ article, pagePrint }) {
  if (!pagePool) {
    pagePool = await pageObj.initPage(concurrent)
  }
  const curr = article.subList.find(item => item.title.indexOf(article.course.trim()) !== -1)
  let task = await api.getArticle(curr.extra.column_id)
  console.log(`找到${task.length}节课程`)
  await pageToFile(task, article.course, pagePrint.path, pagePrint.fileType)
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
    basePath = await fixPath(basePath, course)
    // 进度条
    const progressBar = getProgressBar(articleList.length)
    const queueTask = articleList.map((article, index) => {
      return async () => {
        let articlePage = await pageObj.getPage()
        const { article_title: title, href } = article
        const fileName = filterName(`${index}-${title}`)
        const fileFullName = `${fileName}.${fileType}`
        const fileFullPath = path.join(basePath, fileFullName)
        progressBar.tick({ title })
        console.log('title', title)
        // 检查当前目录中是否存在该文件。
        try {
          await access(fileFullPath, fs.constants.F_OK)
          console.log(`${fileFullName} 已经存在， 进行下一个`)
          pageObj.hirePage(articlePage)
          return Promise.resolve()
        } catch (e) {
          // console.log('开始下载')
        }
        if (!(index % restCount)) {
          console.log('休息一下')
          await new Promise(res => setTimeout(res, 10000))
        }
        await setPageInfo(articlePage, href)
        await new Promise(res => setTimeout(res, 500))
        // 打印
        await printPage(articlePage, fileFullPath, fileType)
        pageObj.hirePage(articlePage)
      }
    })
    await queue(queueTask, concurrent)
    console.log(`《${course}》:任务完成`)
    return true
  } catch (error) {
    console.error('打印出错', error)
  }
}

async function setPageInfo(pageInstance, href) {
  await pageInstance.goto(href, {
    referer: 'https://time.geekbang.org/',
    waitUntil: 'networkidle0'
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
      audio: contentDom.querySelector('div:nth-child(2) > div:nth-child(1) > div:nth-child(3) > div:nth-child(2)'),
      // 顶部菜单
      topBar: contentDom.querySelector('div'),
      // 评论输入框
      commentInputBlock: $('#app > div >div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(4)'),
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

async function fixPath(basePath, course) {
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
  return basePath
}

function getProgressBar(length) {
  return new ProgressBar('  printing: :current/:total [:bar]  :title', {
    complete: '=',
    width: 20,
    total: length
  })
}

/**
 *格式化文件名，防止特殊字符导致错误
 *
 * @param {string} name
 * @returns
 */
function filterName(name) {
  const reg = /[`~!@#$%^&*()_+<>?:"{},./;'[\]]/im
  return name.replace(reg, '')
}

function close() {
  process.exit()
}

exports.downArticle = downArticle
exports.close = close
