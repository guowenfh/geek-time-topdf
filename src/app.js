const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')
const util = require('util')
const mkdir = util.promisify(fs.mkdir)
const ProgressBar = require('progress')

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
        await page.goto('https://time.geekbang.org/')
        await page.waitForSelector('.control', { timeout: 30000 })
        // 点击登录
        page.click('.control a.pc')
        // 页面跳转
        const navigationPromise = await page.waitForNavigation()
        await page.waitForSelector('.nw-phone-wrap .nw-input', { timeout: 30000 })
        // 登录
        await page.type('.nw-phone-wrap .nw-input', String(account.phone))
        await page.type('.input-wrap .input', account.password, { delay: 20 })
        page.click('.mybtn')
        // 页面跳转回来
        await page.waitForNavigation()
        // 点击跳转到文章页面
        const href = await page.evaluate(() => {
            const $nav = document.querySelector('.download-why a')
            return $nav.getAttribute('href')
        })
        await page.goto(href)
        let scrollEnable = true
        let scrollStep = 1000 //每次滚动的步长
        await page.waitForSelector('.column-item-bd-info-hd')
        while (scrollEnable) {
            scrollEnable = await page.evaluate(async scrollStep => {
                let scrollTop = document.scrollingElement.scrollTop
                document.scrollingElement.scrollTop = scrollTop + scrollStep
                await new Promise(res => setTimeout(res, 200))
                return document.body.clientHeight > scrollTop + 1080 ? true : false
            }, scrollStep)
        }
        const subList = await page.evaluate(() => {
            const itemList = [...document.querySelectorAll('.column-item')].filter(item => {
                return item.innerText.indexOf('已订阅') !== -1 || item.innerText.indexOf('已购买') !== -1
            })
            return itemList.map(item => {
                return {
                    title: item.querySelector('.column-item-bd-info-bd-title').innerText,
                    link: item.getAttribute('data-gk-spider-link')
                }
            })
        })
        console.log(!subList.length && '无已订阅课程')
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
        // const link = await page.evaluate((courseName) => {
        //     const curr = [...document.querySelectorAll('.column-item')].find(item => {
        //         return item.innerText.indexOf(courseName) !== -1
        //     })
        //     if (!curr) return false
        //     return curr && curr.getAttribute('data-gk-spider-link')
        // }, course)
        console.log('搜索中, 请耐心等待...')
        const curr = subList.find(item => item.title.indexOf(course.trim()) !== -1)
        if (!curr) throw Error('no search course')
        await page.goto(`https://time.geekbang.org${curr.link}`)
        await page.waitForSelector('.article-item-title')
        let scrollEnable = true
        let scrollStep = 1000 //每次滚动的步长
        while (scrollEnable) {
            scrollEnable = await page.evaluate(async scrollStep => {
                let scrollTop = document.scrollingElement.scrollTop
                document.scrollingElement.scrollTop = scrollTop + scrollStep
                await new Promise(res => setTimeout(res, 500))
                return document.body.clientHeight > scrollTop + 1080 ? true : false
            }, scrollStep)
        }
        const articleList = await page.evaluate(() => {
            return [...document.querySelectorAll('.article-item')].map(item => {
                var href = item.querySelector('a').href
                var title = item.querySelector('h2').innerText
                return { href, title }
            })
        })
        // page.close()
        console.log(`《${curr.title}》:一共查找到 ( ${articleList.length} ) 篇文章。`)
        return { courseName: curr.title, articleList }
    } catch (error) {
        console.error('未搜索到课程', error)
    }
}
async function pageToPdf(articleList, course, basePath) {
    try {
        if (basePath) {
            basePath = `${path.resolve(path.normalize(basePath))}/${course}/`
        } else {
            basePath = `${process.cwd()}/${course}/`
        }
        const err = fs.existsSync(basePath)
        if (!err) {
            await mkdir(`${process.cwd()}/${course}/`)
        }
        const bar = new ProgressBar('  printing: :current/:total [:bar]  :title', {
            complete: '=',
            width:20,
            total: articleList.length
        });
        // 这里也可以使用promise all，但cpu可能吃紧，谨慎操作
        for (let i = 0,len = articleList.length; i < len; i++) {

            let articlePage = await browser.newPage()

            var a = articleList[i]
            bar.tick({
                title:a.title
            });

            await articlePage.goto(a.href)

            let scrollEnable = true
            let scrollStep = 1000 //每次滚动的步长
            while (scrollEnable) {
                scrollEnable = await page.evaluate(async scrollStep => {
                    let scrollTop = document.scrollingElement.scrollTop
                    document.scrollingElement.scrollTop = scrollTop + scrollStep
                    await new Promise(res => setTimeout(res, 200))
                    return document.body.clientHeight > scrollTop + 1080 ? true : false
                }, scrollStep)
            }

            await articlePage.pdf({ path: `${basePath}${a.title}.pdf` })

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
exports.pageToPdf = pageToPdf
