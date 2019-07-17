module.exports = async function queue(tasks, n) {
  n = Math.min(n || 5, tasks.length)
  let temp = []
  let ret = []
  let pointer = 0

  const initQueue = new Array(n).fill('').map(async () => {
    await init()
  })

  async function init() {
    const task = push()
    await task.res
    leave(task)
    if (pointer < tasks.length) {
      await init()
    }
  }

  function push() {
    const res = tasks[pointer]()
    const index = temp.push(res)
    const id = pointer
    pointer = pointer + 1
    return {
      res,
      index,
      id
    }
  }

  async function leave({ res, index, id }) {
    ret[id] = res
    temp.splice(index, 1)
  }
  await Promise.all(initQueue)
  return Promise.all(ret).finally(ret)
}
