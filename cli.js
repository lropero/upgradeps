#!/usr/bin/env node
const chalk = require('chalk')
const commander = require('commander')
const { arrowRight, cross, tick } = require('figures')
const { exec, execSync } = require('child_process')
const { forkJoin } = require('rxjs')
const { readFileSync, writeFileSync } = require('fs')
const { resolve } = require('path')
const { sync: commandExistsSync } = require('command-exists')

const { version } = require('./package.json')

const errorToString = (error) => {
  if (!(error instanceof Error)) {
    error = new Error(error.toString())
  }
  error.name = ''
  const string = error.toString()
  return string.charAt(0).toUpperCase() + string.slice(1)
}

const upgrade = async (options) => {
  try {
    const packagePath = resolve(process.cwd(), 'package.json')
    const packageJSON = JSON.parse(readFileSync(packagePath, 'utf8'))
    const { dependencies = {}, devDependencies = {} } = packageJSON
    const deps = { dependencies, devDependencies }
    const pckgs = Object.keys(dependencies).concat(Object.keys(devDependencies))
    const sources = pckgs.reduce((sources, pckg) => ({
      ...sources,
      [pckg]: new Promise((resolve, reject) => {
        exec(`npm view ${pckg} version`, { stdio: [] }, (error, stdout) => {
          if (error) {
            if (error.code === 1) {
              return resolve(false)
            }
            return reject(error)
          }
          return resolve(stdout.trim())
        })
      })
    }), {})
    const latests = await forkJoin(sources).toPromise()
    let hasUpdates = false
    Object.keys(deps).map((group) => {
      Object.keys(deps[group]).map((pckg) => {
        if (latests[pckg]) {
          const current = deps[group][pckg].replace(/[\^~]/, '').trim()
          const latest = latests[pckg]
          if (current !== latest) {
            const skips = options.skip.includes(pckg)
            if (!skips) {
              deps[group][pckg] = `^${latest}`
              hasUpdates = true
            }
            console.log(`${chalk.cyan(pckg)} ${skips ? chalk.yellow(cross) : chalk.green(tick)} ${current} ${chalk.yellow(arrowRight)} ${latest}`)
          }
        }
      })
    })
    if (hasUpdates) {
      if (packageJSON.dependencies) {
        packageJSON.dependencies = deps.dependencies
      }
      if (packageJSON.devDependencies) {
        packageJSON.devDependencies = deps.devDependencies
      }
      writeFileSync(packagePath, JSON.stringify(packageJSON, null, 2) + '\n', 'utf8')
      const useYarn = commandExistsSync('yarn') && !options.npm
      console.log(chalk.gray(`running ${useYarn ? 'yarn' : 'npm install'}`))
      execSync(useYarn ? 'yarn' : 'npm install', { stdio: [] })
      console.log(chalk.blue('package.json upgraded'))
    } else {
      console.log(chalk.blue('no updates'))
    }
  } catch (error) {
    console.log(`${chalk.red(cross)} ${errorToString(error)}`)
    process.exit(1)
  }
}

commander
  .version(version, '-v, --version')
  .option('-n, --npm', 'Force npm instead of yarn')
  .option('-s, --skip <packages>', 'Skip packages')
  .parse(process.argv)
console.log(chalk.green(`upgradeps v${version}`))
upgrade({
  npm: !!commander.npm,
  skip: (commander.skip || '').split(',')
})
