const program = require('commander')
const inquirer = require('inquirer')
const utils = require('./utils')
const pkg = require('../package.json')
const app = require('./app')
program
    .version(pkg.version, '-v, --version')
    .command('init')
    .description('初始化需要填写信息：手机号码，密码，课程。')
    .action(async () => {
        console.log('初始化需要填写信息：手机号码，密码，查找已订阅课程。')
        try {
            const account = await inquirer.prompt(utils.getAccountPromptList())
            console.log('正在登录中..')
            const subList = await app.start(account)
            const { course } = await inquirer.prompt(utils.getCoursePromptList())
            const { courseName, articleList } = await app.searchCourse(course, subList)
            const { path } = await inquirer.prompt(utils.getCoursePathPromptList())
            await app.pageToPdf(articleList, courseName, path)
        } catch (error) {
            console.error(error)
        }
    })

program.parse(process.argv)
if (process.argv.length < 3) {
    program.help()
}
