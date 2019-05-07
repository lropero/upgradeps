#!/usr/bin/env node
const chalk = require('chalk')
const { execSync } = require('child_process')

const { dependencies = {}, devDependencies = {}, peerDependencies = {} } = require('./package.json')

console.log(chalk.yellow('Starting upgrade'))
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
