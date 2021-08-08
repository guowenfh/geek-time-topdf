const fs = require('fs')
const path = require('path')
const jsonPath = path.resolve(__dirname, '../cookie.json')
/**
 * 获取账号名密码配置
 * @returns {Array}
 */
exports.getAccountPromptList = function () {
  return [
    //account number : cellphone
    {
      type: 'input',
      name: 'cellphone',
      message: '请输入你的手机号码：',
      validate: function (input) {
        // this.async() is inquirer use
        var done = this.async()
        if (isNaN(Number(input))) return done('手机号码必须是数字')
        return done(null, true)
      }
    },
    //password
    {
      type: 'password',
      name: 'password',
      message: '请输入你的密码：',
      validate: function (input) {
        // this.async() is inquirer use
        var done = this.async()
        if (input.length < 6 || input.length > 24) {
          return done('请输入6-24位的密码')
        }
        return done(null, true)
      }
    },
    //country code
    {
      type: 'number',
      name: 'countryCode',
      message: '请输入你的国家代码：',
      default: 86,
      validate: function (input) {
        // this.async() is inquirer use
        var done = this.async()
        if (isNaN(Number(input)) && input.length > 4) return done('国家代码必须是数字且不超过 4 位')
        return done(null, true)
      }
    }
  ]
}

/**
 * 搜索课程列表的配置
 * @param {Array} choices
 * @returns {Array}
 */
exports.getCoursePromptList = function (choices) {
  return [
    {
      type: 'list',
      name: 'course',
      message: '请选择你要打印的课程：',
      choices
    }
  ]
}

/**
 * 目录配置
 * @returns {Array}
 */
exports.getCoursePathPromptList = function () {
  return [
    {
      type: 'input',
      name: 'path',
      message: '请输入你想要输出的目录（默认会在当前目录下创建课程目录）：'
    }
  ]
}

/**
 * 输出类型配置
 * @returns {Array}
 */
exports.getOutputFileType = function () {
  return [
    {
      type: 'rawlist',
      name: 'fileType',
      choices: ['pdf', 'png'],
      default: 'pdf',
      message: '输出的文件类型（默认 pdf ）：'
    }
  ]
}
/**
 * 输出类型配置
 * @returns {Array}
 */
exports.getIsRepeatType = function () {
  return [
    {
      type: 'confirm',
      name: 'isRepeat',
      default: 'Y',
      message: '是否继续搜索课程：'
    }
  ]
}
/**
 * 保存cookie到配置文件
 * @returns {undefined}
 */
exports.saveCookie = function (cookieArr) {
  cookieArr = cookieArr.map(item => {
    // 在puppeteer设置cookie的时候必须设置url，去掉时间，避免
    item.url = 'https://time.geekbang.org'
    delete item.expires
    delete item.maxAge
    return item
  })
  const str = JSON.stringify(cookieArr, null, 2)
  fs.writeFileSync(path.resolve(__dirname, '../cookie.json'), str)
}
/**
 * 取出cookie到配置文件
 * @returns {Array}
 */
exports.getCookie = function () {
  if (!fs.existsSync(jsonPath)) return []
  const cookieStr = fs.readFileSync(jsonPath, 'utf8')
  return JSON.parse(cookieStr)
}
/**
 * 调试用
 * @returns {undefined}
 */
exports.savePage = function (page) {
  fs.writeFileSync(path.resolve(__dirname, '../page.html'), page)
}

exports.clear = function () {
  fs.writeFileSync(jsonPath, '[]')
}
