const program = require("commander");
const inquirer = require("inquirer");
const utils = require("./utils");
const pkg = require("../package.json");
const app = require("./app");
const api = require("./api.js");
const start = async () => {
  try {
    // get login info
    if (!utils.getCookie().length) {
      await login();
    }

    //get List of courses
    const subList = await getList();
    console.log(
      subList.length ? `共查找到 ${subList.length} 门课程。` : "无已订阅课程"
    );
    await searchPrint(subList);
  } catch (error) {
    console.error(error);
  }
};

async function login() {
  const account = await inquirer.prompt(utils.getAccountPromptList());
  await api.login(account).catch((e) => {
    console.log(e);
    return login();
  });
}
async function getList() {
  let data;
  while (!data) {
    try {
      data = await api.getList();
      break;
    } catch (err) {
      await login();
    }
  }
  return data;
}

/**
 * Search and print courses
 * @param {Array} subList 搜索到的课程列表
 * @returns
 */
const searchPrint = async (subList) => {
  //Select course to print
  const courses = utils.getCoursePromptList(subList.map((item) => item.title));
  const { course } = await inquirer.prompt(courses);
  const { path } = await inquirer.prompt(utils.getCoursePathPromptList());
  const { fileType } = await inquirer.prompt(utils.getOutputFileType());
  await app.downArticle({
    article: {
      course,
      subList,
    },
    pagePrint: {
      path,
      fileType,
    },
  });
  const { isRepeat } = await inquirer.prompt(utils.getIsRepeatType());
  if (isRepeat) {
    searchPrint(subList);
  } else {
    return app.close();
  }
};

//command entry
program
  .version(pkg.version, "-v, --version")
  .command("init")
  .description("打印 pdf 初始化需要填写信息：手机号码，密码。")
  .action(start);
program.command("clear").description("清除账户信息。").action(utils.clear);
program.parse(process.argv);
if (process.argv.length < 3) {
  program.help();
}
