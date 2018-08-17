exports.getAccountPromptList = function() {
  return [
    {
      type: 'input',
      name: 'phone',
      message: '请输入你的手机号码：',
      validate: function(input) {
        // this.async() is inquirer use
        var done = this.async()
        if (isNaN(Number(input))) return done('手机号码必须是数字')
        if (input.length !== 11) return done('长度必须11位')
        return done(null, true)
      }
    },
    {
      type: 'password',
      name: 'password',
      message: '请输入你的密码：',
      validate: function(input) {
        // this.async() is inquirer use
        var done = this.async()
        if (input.length < 6 || input.length > 24) {
          return done('请输入6-24位的密码')
        }
        return done(null, true)
      }
    }
  ]
}
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
exports.getCoursePathPromptList = function() {
  return [
    {
      type: 'input',
      name: 'path',
      message: '请输入你想要输出的目录（默认会在当前目录下创建课程目录）：'
    }
  ]
}

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
