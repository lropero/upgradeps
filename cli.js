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
  .option('-n, --npm', 'Force npm')
  .option('-s, --skip <packages>', 'Skip packages')
  .parse(process.argv)
const useYarn = commandExistsSync('yarn') && !commander.npm
console.log(chalk[useYarn ? 'green' : 'blue'](`upgradeps v${version}`))
const lists = { dependencies, devDependencies }
const options = useYarn
  ? { dependencies: '', devDependencies: ' --dev' }
  : { dependencies: ' --save', devDependencies: ' --save-dev' }
const skip = (commander.skip || '').split(',')
Object.keys(lists).map((group) => {
  console.log(chalk.yellow(`…${group}`))
  Object.keys(lists[group]).map((pckg) => {
    const install = useYarn ? `yarn remove ${pckg} && yarn add ${pckg}${options[group]}` : `npm uninstall ${pckg} && npm install ${pckg}${options[group]}`
    const version = useYarn ? `yarn info ${pckg} version` : `npm view ${pckg} version`
    try {
      const current = lists[group][pckg].replace(/[\^~]/, '').trim()
      const [latest1, latest2] = execSync(version, { stdio: [] }).toString().split('\n')
      const latest = latest2 || latest1
      if (current !== latest) {
        const skips = skip.includes(pckg)
        !skips && execSync(install, { stdio: [] })
        console.log(`${chalk.cyan(pckg)} ${skips ? chalk.yellow(figures.cross) : chalk.green(figures.tick)} ${current} ${chalk.yellow(figures.arrowRight)} ${latest}`)
      }
    } catch (error) {
      console.log(`${chalk.cyan(pckg)} ${chalk.red(figures.cross)} ${chalk.yellow(error.toString())}`)
    }
  })
})
