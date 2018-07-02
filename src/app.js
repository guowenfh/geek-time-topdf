const puppeteer = require('puppeteer');
const fs = require('fs')
const path = require('path')
const util = require('util')
const access = util.promisify(fs.access)
const mkdir = util.promisify(fs.mkdir)
const sleep = (time = 0) => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve()
        }, time)
    })
}

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
        await page.type('.nw-phone-wrap .nw-input', String(account.phone));
        await page.type('.input-wrap .input', account.password, { delay: 20 });
        page.click('.mybtn')
        // 页面跳转回来
        await page.waitForNavigation()
        // 点击跳转到文章页面
        const href = await page.evaluate(() => {
            const $nav = document.querySelector('.download-why a')
            return $nav.getAttribute('href')
        })
        await page.goto(href)
        let scrollEnable = true;
        let scrollStep = 1000; //每次滚动的步长
        await page.waitForSelector('.column-item-bd-info-hd')
        while (scrollEnable) {
            scrollEnable = await page.evaluate(async (scrollStep) => {
                let scrollTop = document.scrollingElement.scrollTop;
                document.scrollingElement.scrollTop = scrollTop + scrollStep;
                await new Promise(res => setTimeout(res, 200))
                return document.body.clientHeight > scrollTop + 1080 ? true : false
            }, scrollStep);
        }
        return scrollEnable
    } catch (error) {
        console.error('用户登录失败',error);
    }

}


async function searchCourse(course) {
    try {
        const link = await page.evaluate((courseName) => {
            const curr = [...document.querySelectorAll('.column-item')].find(item => {
                return item.innerText.indexOf(courseName) !== -1
            })
            if (!curr) return false
            return curr && curr.getAttribute('data-gk-spider-link')
        }, course)
        if (!link) throw Error('no search course')
        await page.goto(`https://time.geekbang.org${link}`)
        await page.waitForSelector('.article-item-title')
        let scrollEnable = true;
        let scrollStep = 1000; //每次滚动的步长
        while (scrollEnable) {
            console.error('----');
            scrollEnable = await page.evaluate(async (scrollStep) => {
                let scrollTop = document.scrollingElement.scrollTop;
                document.scrollingElement.scrollTop = scrollTop + scrollStep;
                // await new Promise(res => setTimeout(res, 2000))
                return document.body.clientHeight > scrollTop + 1080 ? true : false
            }, scrollStep);
        }
        const articleList = await page.evaluate(() => {
            return [...document.querySelectorAll('.article-item')].map(item => {
                var href = item.querySelector('a').href
                var title = item.querySelector('h2').innerText
                return { href, title }
            })
        })
        // page.close()
        return articleList
    } catch (error) {
        console.error('未搜索到课程',error);
    }
}
async function pageToPdf(articleList, course, basePath) {
    try {
        if(basePath){
            basePath = `${path.resolve(path.normalize(basePath))}/${course}/`
        }else{
            basePath = `${process.cwd()}/${course}/`
        }
        console.error(basePath);
        const err = fs.existsSync(basePath)
        if(!err){
            await mkdir(`${process.cwd()}/${course}/`)
        }

        // 这里也可以使用promise all，但cpu可能吃紧，谨慎操作
        for (var i = 1; i < articleList.length; i++) {
            let articlePage = await browser.newPage()

            var a = articleList[i];
            await articlePage.goto(a.href);

            await sleep(3000);

            await articlePage.pdf({ path: `${basePath}${a.title}.pdf`});

            articlePage.close();
        }
    } catch (error) {
        console.error('打印出错', error);
    }
}
exports.start = start
exports.searchCourse = searchCourse
exports.pageToPdf = pageToPdf
