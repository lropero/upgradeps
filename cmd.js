#!/usr/bin/env node
const chalk = require('chalk')
const commander = require('commander')
const detectIndent = require('detect-indent')
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
  const packageContents = readFileSync(packagePath, 'utf8')
  const packageIndent = detectIndent(packageContents)
  const packageJSON = JSON.parse(packageContents)
  const { dependencies = {}, devDependencies = {} } = packageJSON
  return {
    deps: { dependencies, devDependencies },
    packageIndent,
    packageJSON,
    packagePath,
    pckgs: Object.keys(dependencies).concat(Object.keys(devDependencies))
  }
}

const queryVersions = async (pckgs) => {
  console.log(chalk.gray('querying versions'))
  const responses = await Promise.all(pckgs.map(async (pckg) => {
    try {
      const { version = false } = await manifest(pckg)
      return { [pckg]: version }
    } catch (error) {
      if (error.statusCode === 404) {
        return { [pckg]: false }
      }
      throw error
    }
  }))
  return responses.reduce((versions, response) => Object.values(response)[0] ? { ...versions, ...response } : versions, {})
}

const run = async (options) => {
  try {
    console.log(chalk.green(`upgradeps v${version}`))
    const { deps, packageIndent, packageJSON, packagePath, pckgs } = getInfo()
    const versions = await queryVersions(pckgs)
    await upgrade({ deps, options, packageIndent, packageJSON, packagePath, versions })
  } catch (error) {
    console.log(`${chalk.red(cross)} ${errorToString(error)}`)
    if (error.stack) {
      console.log(chalk.yellow(error.stack))
    }
    process.exit(1)
  }
}

const upgrade = async ({ deps, options, packageIndent, packageJSON, packagePath, versions }) => {
  const found = Object.keys(versions)
  let hasUpdates = false
  for (const group of Object.keys(deps)) {
    for (const pckg of Object.keys(deps[group])) {
      if (found.includes(pckg)) {
        const current = deps[group][pckg].replace(/[\^~]/, '').trim()
        const latest = versions[pckg]
        if (current !== latest) {
          const skips = options.skip.includes(pckg)
          if (!skips) {
            deps[group][pckg] = `^${latest}`
            hasUpdates = true
          }
          console.log(`${chalk.cyan(pckg)} ${skips || options.test ? chalk.yellow(cross) : chalk.green(tick)} ${current} ${chalk.yellow(arrowRight)} ${latest}`)
        }
      }
    }
  }
  if (hasUpdates) {
    if (options.test) {
      console.log(chalk.blue('package.json not upgraded, run without -t option to upgrade'))
    } else {
      await writePackage({ deps, packageIndent, packageJSON, packagePath, useYarn: commandExistsSync('yarn') && !options.npm })
      console.log(chalk.blue('package.json upgraded'))
    }
  } else {
    console.log(chalk.blue('no updates'))
  }
}

const writePackage = ({ deps, packageIndent, packageJSON, packagePath, useYarn }) => {
  if (packageJSON.dependencies) {
    packageJSON.dependencies = deps.dependencies
  }
  if (packageJSON.devDependencies) {
    packageJSON.devDependencies = deps.devDependencies
  }
  const indent = packageIndent.type === 'tab' ? '\t' : packageIndent.amount
  writeFileSync(packagePath, JSON.stringify(packageJSON, null, indent) + '\n', 'utf8')
  if (existsSync(pathResolve(process.cwd(), 'node_modules'))) {
    console.log(chalk.gray(`running ${useYarn ? 'yarn' : 'npm install'}`))
    execSync(useYarn ? 'yarn' : 'npm install', { stdio: [] })
  }
}

commander
  .version(version, '-v, --version')
  .option('-n, --npm', 'Force npm instead of yarn')
  .option('-s, --skip <packages>', 'Skip packages')
  .option('-t, --test', 'Query versions without upgrading')
  .parse(process.argv)
run({ npm: !!commander.npm, skip: (commander.skip || '').split(','), test: !!commander.test })