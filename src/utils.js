const fs = require('fs')
const path = require('path')
/**
 * 获取账号名密码配置
 * @returns {Array}
 */
exports.getAccountPromptList = function() {
  return [
    //account number : cellphone
    {
      type: 'input',
      name: 'cellphone',
      message: 'Please input your cellphone：',
      validate: function(input) {
        // this.async() is inquirer use
        var done = this.async()
        if (isNaN(Number(input))) return done('input must be number')
        return done(null, true)
      }
    },
    //password
    {
      type: 'password',
      name: 'password',
      message: 'Please input your password：',
      validate: function(input) {
        // this.async() is inquirer use
        var done = this.async()
        if (input.length < 6 || input.length > 24) {
          return done('password length is between 6 - 24')
        }
        return done(null, true)
      }
    },
    //country code
    {
      type: 'countryCode',
      name: 'countryCode',
      message: 'Please input your country code：',
      validate: function(input) {
        // this.async() is inquirer use
        var done = this.async()
        if (isNaN(Number(input)) && input.length > 4) return done('country code must be number and not longer than 4 digits')
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
exports.getCoursePromptList = function(choices) {
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
exports.getCoursePathPromptList = function() {
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
exports.getOutputFileType = function() {
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
exports.getIsRepeatType = function() {
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
exports.saveCookie = function(cookieArr) {
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
exports.getCookie = function() {
  const cookieStr = fs.readFileSync(path.resolve(__dirname, '../cookie.json'), 'utf8')
  return JSON.parse(cookieStr)
}
/**
 * 调试用
 * @returns {undefined}
 */
exports.savePage = function(apge) {
  fs.writeFileSync(path.resolve(__dirname, '../page.html'), apge)
}

exports.clear = function() {
  fs.writeFileSync(path.resolve(__dirname, '../cookie.json'), '[]')
}
