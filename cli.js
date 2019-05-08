#!/usr/bin/env node
const chalk = require('chalk')
const commandExistsSync = require('command-exists').sync
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const pckg = path.resolve(process.cwd(), 'package.json')
if (!fs.existsSync(pckg)) {
  process.exit(1)
}
const { dependencies = {}, devDependencies = {} } = require(pckg)
const { version } = require('./package.json')

const hasYarn = commandExistsSync('yarn')
console.log(chalk[hasYarn ? 'green' : 'yellow'](`Upgradeps v${version}`))
const getCommand = (which, args) => {
  switch (which) {
    case 1: return hasYarn ? `yarn info ${args.item} version` : `npm view ${args.item} version`
    case 2: return hasYarn ? `yarn remove ${args.item} && yarn add ${args.item}${args.option}` : `npm uninstall ${args.item} && npm install ${args.item}${args.option}`
  }
}
const lists = { dependencies, devDependencies }
const options = hasYarn
  ? { dependencies: '', devDependencies: ' --dev' }
  : { dependencies: ' --save', devDependencies: ' --save-dev' }
Object.keys(lists).map((group) => {
  console.log(chalk.yellow(`…${group}`))
  Object.keys(lists[group]).map((item) => {
    try {
      const current = lists[group][item].replace(/[\^~]/, '').trim()
      const latest = execSync(getCommand(1, { item }), { stdio: [] }).toString().trim()
      if (current !== latest) {
        execSync(getCommand(2, { item, option: options[group] }), { stdio: [] })
        console.log(`${chalk.cyan(item)} ${chalk.green('✔')} ${current + chalk.yellow(' ➡ ') + latest}`)
      }
    } catch (error) {
      console.log(`${chalk.cyan(item)} ${chalk.red('✘')} ${chalk.yellow(error.toString())}`)
    }
  })
})
