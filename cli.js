#!/usr/bin/env node
const chalk = require('chalk')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const pckg = path.resolve(process.cwd(), 'package.json')
if (!fs.existsSync(pckg)) {
  process.exit(1)
}
const { dependencies = {}, devDependencies = {}, peerDependencies = {} } = require(pckg)
const { version } = require('./package.json')

console.log(chalk.yellow(`Upgradeps v${version}`))
const lists = { dependencies, devDependencies, peerDependencies }
const options = { dependencies: '', devDependencies: ' --dev', peerDependencies: ' --peer' }
Object.keys(lists).map((group) => {
  console.log(chalk.yellow(`…${group}`))
  Object.keys(lists[group]).map((item) => {
    try {
      const current = lists[group][item].replace(/[\^~]/, '').trim()
      const latest = execSync(`yarn info ${item} version`, { stdio: [] }).toString().trim()
      if (current !== latest) {
        execSync(`yarn remove ${item} && yarn add${options[group]} ${item}`, { stdio: [] })
        console.log(`${chalk.cyan(item)} ${chalk.green('✔')} ${current + chalk.yellow(' ➡ ') + latest}`)
      }
    } catch (error) {
      console.log(`${chalk.cyan(item)} ${chalk.red('✘')} ${chalk.yellow(error.toString())}`)
    }
  })
})
