const axios = require('axios')
const config = require('../config.js')
const setCookie = require('set-cookie-parser')
const utils = require('./utils')
const urls = {
  login: 'https://account.geekbang.org/account/ticket/login',
  productsAll: 'https://time.geekbang.org/serv/v1/my/products/all',
  articles: 'https://time.geekbang.org/serv/v1/column/articles'
}
const axiosInstance = axios.create({})
function updateHeaders(cookie = []) {
  axiosInstance.defaults.headers = {
    Host: 'time.geekbang.org',
    'Content-Type': 'application/json',
    Origin: 'https://time.geekbang.org',
    Cookie: cookie.reduce((a, b) => {
      a = a + `${b.name}=${b.value};`
      return a
    }, ''),
    Referer: 'https://account.geekbang.org/dashboard/buy',
    'User-Agent':
      ' Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36'
  }
}

updateHeaders(config.cookie)

axiosInstance.interceptors.response.use(
  function(response) {
    const failLoginCode = [-2000]
    let errorCode = response.data.error.code
    if (failLoginCode.includes(errorCode)) {
      clearEffects()
      return Promise.reject('登录失效')
    }
    return response
  },
  function(error) {
    if (error.response.status == 452) {
      clearEffects()
      return Promise.reject('登录失效')
    }
    console.log(error)
  }
)

function getList() {
  return axiosInstance.get(urls.productsAll).then(res => {
    const data = res.data.data
    return data[0].list.map((item, index) => {
      item.index = index
      return item
    })
  })
}

function getArticle(cid) {
  const params = {
    cid,
    size: 200,
    prev: 0,
    order: 'earliest',
    sample: false
  }
  return axiosInstance.post(urls.articles, params).then(res => {
    return res.data.data.list.map(item => {
      item.href = `https://time.geekbang.org/column/article/${item.id}`
      return item
    })
  })
}

function login({ cellphone, password }) {
  const params = {
    country: 86, // 国家默认为中国
    cellphone,
    password,
    captcha: '',
    remember: 1,
    platform: 3,
    appid: 1
  }
  const headers = {
    Accept: 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    Origin: 'https://account.geekbang.org',
    Referer: 'https://account.geekbang.org/login',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36'
  }
  return axios
    .post(urls.login, params, {
      headers
    })
    .then(res => {
      const data = res.data
      if (data.code != 0) {
        return Promise.reject(data.error.msg)
      } else {
        const cookie = setCookie.parse(res)
        utils.saveCookie(cookie)
        updateHeaders(cookie)
        return data
      }
    })
}

function clearEffects() {
  utils.saveCookie([])
  updateHeaders([])
}

module.exports = {
  getList,
  login,
  getArticle
}
