module.exports = {
  env: {
    browser: true,
    commonjs: true,
    node: true,
    es6: true
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 2018
  },
  rules: {
    'no-console': [0],
    indent: ['error', 2],
    'linebreak-style': ['error', 'unix'],
    quotes: ['error', 'single'],
    semi: ['error', 'never']
  }
}
