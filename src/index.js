const program = require('commander')
const inquirer = require('inquirer')
const utils = require('geek-time-topdf/src/utils')
const pkg = require('geek-time-topdf/package')
const app = require('geek-time-topdf/src/app')
const api = require('geek-time-topdf/src/api')
const { DOWNLOAD_ALL_COURSE_TYPE, DOWNLOAD_SINGLE_COURSE_TYPE } = require('./constants')

const start = async () => {
  try {
    // 获取登录帐号信息
    if (!utils.getCookie().length) {
      await login()
    }
    const subList = await getList()
    console.log(subList.length ? `共查找到${subList.length}门课程。` : '无已订阅课程')
    const { type } = await inquirer.prompt(utils.getDownloadTypePromptList())
    if (type === DOWNLOAD_SINGLE_COURSE_TYPE) {
      await searchPrint(subList)
    } else if (type === DOWNLOAD_ALL_COURSE_TYPE) {
      await downloadAllCourses(subList, 0)
    }
  } catch (error) {
    console.error(error)
  }
}

async function login() {
  const account = await inquirer.prompt(utils.getAccountPromptList())
  await api.login(account).catch(e => {
    console.log(e)
    return login()
  })
}
async function getList() {
  let data
  while (!data) {
    try {
      data = await api.getList()
      break
    } catch (err) {
      await login()
    }
  }
  return data
}

/**
 * 搜索并打印课程
 * @param {Array} subList 搜索到的课程列表
 * @returns
 */
const searchPrint = async subList => {
  // 选择打印的课程
  const courses = utils.getCoursePromptList(subList.map(item => item.title))
  const { course } = await inquirer.prompt(courses)
  const { path } = await inquirer.prompt(utils.getCoursePathPromptList())
  const { fileType } = await inquirer.prompt(utils.getOutputFileType())
  await app.downArticle({
    article: { course, subList },
    pagePrint: {
      path,
      fileType
    }
  })
  const { isRepeat } = await inquirer.prompt(utils.getIsRepeatType())
  if (isRepeat) {
    searchPrint(subList)
  } else {
    return app.close()
  }
}

const downloadAllCourses = async (subList, curCourseIndex = 0) => {
  if (curCourseIndex < subList.length && subList.length > 0) {
    const curCourse = subList[curCourseIndex]
    if (!curCourse) {
      console.log('课程不存在，程序将退出')
      return app.close()
    }
    // 选择打印的课程
    await app.downArticle({
      curCourseIndex,
      subList,
      course: curCourse,
      pagePrint: {
        fileType: 'pdf'
      }
    })
    // const { isRepeat } = await inquirer.prompt(utils.getIsRepeatType())
    const isRepeat = true
    if (isRepeat) {
      downloadAllCourses(subList, curCourseIndex + 1)
    } else {
      return app.close()
    }
  } else {
    return app.close()
  }
}

program
  .version(pkg.version, '-v, --version')
  .command('init')
  .description('打印 pdf 初始化需要填写信息：手机号码，密码。')
  .action(start)
program.command('clear').description('清除账户信息。').action(utils.clear)
program.parse(process.argv)
if (process.argv.length < 3) {
  program.help()
}
