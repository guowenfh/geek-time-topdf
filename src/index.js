const program = require('commander')
const inquirer = require('inquirer')
const utils = require('./utils')
const pkg = require('../package.json')
const app = require('./app')
const start = async () => {
  console.log('打印 pdf 初始化需要填写信息：手机号码，密码。')
  try {
    // 获取登录帐号信息
    const account = await inquirer.prompt(utils.getAccountPromptList())
    console.log('正在登录中，请耐心等候..')
    // 登录，并且拿到已订阅的列表
    const subList = await app.start(account)
    await searchPrint(subList)
  } catch (error) {
    console.error(error)
  }
}

/**
 * 搜索并打印课程
 * @param {Array} subList 搜索到的课程列表
 * @returns
 */
const searchPrint = async subList => {
  // 选择打印的课程
  const { course } = await inquirer.prompt(utils.getCoursePromptList(subList.map(item => item.title)))
  // 搜索文章列表
  const { courseName, articleList } = await app.searchCourse(course, subList)
  // 设置打印路径
  const { path } = await inquirer.prompt(utils.getCoursePathPromptList())
  const { fileType } = await inquirer.prompt(utils.getOutputFileType())
  await app.pageToFile(articleList, courseName, path, fileType)
  const { isRepeat } = await inquirer.prompt(utils.getIsRepeatType())
  if (isRepeat) {
    await searchPrint(subList)
  } else {
    return app.colse()
  }
}
program
  .version(pkg.version, '-v, --version')
  .command('init')
  .description('打印 pdf 初始化需要填写信息：手机号码，密码。')
  .action(start)

program.parse(process.argv)
if (process.argv.length < 3) {
  program.help()
}
