const program = require('commander')
const inquirer = require('inquirer')
const utils = require('./utils')
const pkg = require('../package.json')
const app = require('./app')
program
    .version(pkg.version)
    .command('init')
    .description('初始化需要填写信息：手机号码，密码，课程。')
    .action((async () => {
        console.log('初始化需要填写信息：手机号码，密码。');
        try {
            const account = await inquirer.prompt(utils.getAccountPromptList())
            await app.start(account)
            const {course} = await inquirer.prompt(utils.getCoursePromptList())
            const articleList = await app.searchCourse(course)
            const {path} = await inquirer.prompt(utils.getCoursePathPromptList())
            await app.pageToPdf(articleList, course, path)
        } catch (error) {
            console.error(error);
        }


    }))

program
    .parse(process.argv);
