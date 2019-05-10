#!/usr/bin/env node
const chalk = require('chalk')
const commandExistsSync = require('command-exists').sync
const commander = require('commander')
const figures = require('figures')
const { execSync } = require('child_process')
const { existsSync } = require('fs')
const { resolve } = require('path')

const packageFile = resolve(process.cwd(), 'package.json')
if (!existsSync(packageFile)) { process.exit(1) }
const { dependencies = {}, devDependencies = {} } = require(packageFile)
const { version } = require('./package.json')

commander
  .version(version, '-v, --version')
  .option('-s --skip <packages>', 'Skip packages')
  .parse(process.argv)
const hasYarn = commandExistsSync('yarn')
console.log(chalk[hasYarn ? 'green' : 'yellow'](`Upgradeps v${version}`))
const lists = { dependencies, devDependencies }
const options = hasYarn
  ? { dependencies: '', devDependencies: ' --dev' }
  : { dependencies: ' --save', devDependencies: ' --save-dev' }
const skip = (commander.skip || '').split(',')
Object.keys(lists).map((group) => {
  console.log(chalk.yellow(`…${group}`))
  Object.keys(lists[group]).map((pckg) => {
    const install = hasYarn ? `yarn remove ${pckg} && yarn add ${pckg}${options[group]}` : `npm uninstall ${pckg} && npm install ${pckg}${options[group]}`
    const version = hasYarn ? `yarn info ${pckg} version` : `npm view ${pckg} version`
    try {
      const current = lists[group][pckg].replace(/[\^~]/, '').trim()
      const [latest1, latest2] = execSync(version, { stdio: [] }).toString().trim().split('\n')
      const latest = latest2 || latest1
      if (current !== latest) {
        !skip.includes(pckg) && execSync(install, { stdio: [] })
        console.log(`${chalk.cyan(pckg)} ${skip.includes(pckg) ? chalk.yellow(figures.cross) : chalk.green(figures.tick)} ${current} ${chalk.yellow(figures.arrowRight)} ${latest}`)
      }
    } catch (error) {
      console.log(`${chalk.cyan(pckg)} ${chalk.red(figures.cross)} ${chalk.yellow(error.toString())}`)
    }
  })
})
