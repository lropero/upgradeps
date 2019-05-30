#!/usr/bin/env node
const chalk = require('chalk')
const commander = require('commander')
const { arrowRight, cross, tick } = require('figures')
const { execSync } = require('child_process')
const { existsSync, readFileSync, writeFileSync } = require('fs')
const { manifest } = require('pacote')
const { resolve: pathResolve } = require('path')
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

const getInfo = () => {
  const packagePath = pathResolve(process.cwd(), 'package.json')
  const packageJSON = JSON.parse(readFileSync(packagePath, 'utf8'))
  const { dependencies = {}, devDependencies = {} } = packageJSON
  return { deps: { dependencies, devDependencies }, packageJSON, packagePath, pckgs: Object.keys(dependencies).concat(Object.keys(devDependencies)) }
}

const queryVersions = (pckgs) => new Promise(async (resolve, reject) => {
  try {
    console.log(chalk.gray('querying versions'))
    const responses = await Promise.all(pckgs.map((pckg) => new Promise(async (resolve, reject) => {
      try {
        const { version = false } = await manifest(pckg)
        return resolve({ [pckg]: version })
      } catch (error) {
        if (error.statusCode === 404) {
          return resolve({ [pckg]: false })
        }
        return reject(error)
      }
    })))
    return resolve(responses.reduce((versions, response) => Object.values(response)[0] ? { ...versions, ...response } : versions, {}))
  } catch (error) {
    return reject(error)
  }
})

const run = async (options) => {
  try {
    console.log(chalk.green(`upgradeps v${version}`))
    const { deps, packageJSON, packagePath, pckgs } = getInfo()
    const versions = await queryVersions(pckgs)
    await upgrade({ deps, options, packageJSON, packagePath, versions })
  } catch (error) {
    console.log(`${chalk.red(cross)} ${errorToString(error)}`)
    process.exit(0)
  }
}

const upgrade = ({ deps, options, packageJSON, packagePath, versions }) => new Promise(async (resolve, reject) => {
  try {
    let hasUpdates = false
    for (const group of Object.keys(deps)) {
      for (const pckg of Object.keys(deps[group])) {
        const current = deps[group][pckg].replace(/[\^~]/, '').trim()
        const latest = versions[pckg]
        if (current !== latest) {
          const skips = options.skip.includes(pckg)
          if (!skips) {
            deps[group][pckg] = `^${latest}`
            hasUpdates = true
          }
          console.log(`${chalk.cyan(pckg)} ${skips ? chalk.yellow(cross) : chalk.green(tick)} ${current} ${chalk.yellow(arrowRight)} ${latest}`)
        }
      }
    }
    if (hasUpdates) {
      await writePackage({ deps, packageJSON, packagePath, useYarn: commandExistsSync('yarn') && !options.npm })
      console.log(chalk.blue('package.json upgraded'))
    } else {
      console.log(chalk.blue('no updates'))
    }
    return resolve()
  } catch (error) {
    return reject(error)
  }
})

const writePackage = ({ deps, packageJSON, packagePath, useYarn }) => new Promise((resolve, reject) => {
  try {
    if (packageJSON.dependencies) {
      packageJSON.dependencies = deps.dependencies
    }
    if (packageJSON.devDependencies) {
      packageJSON.devDependencies = deps.devDependencies
    }
    writeFileSync(packagePath, JSON.stringify(packageJSON, null, 2) + '\n', 'utf8')
    if (existsSync(pathResolve(process.cwd(), 'node_modules'))) {
      console.log(chalk.gray(`running ${useYarn ? 'yarn' : 'npm install'}`))
      execSync(useYarn ? 'yarn' : 'npm install', { stdio: [] })
    }
    return resolve()
  } catch (error) {
    return reject(error)
  }
})

commander
  .version(version, '-v, --version')
  .option('-n, --npm', 'Force npm instead of yarn')
  .option('-s, --skip <packages>', 'Skip packages')
  .parse(process.argv)
run({ npm: !!commander.npm, skip: (commander.skip || '').split(',') })
