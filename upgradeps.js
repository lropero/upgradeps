#!/usr/bin/env node
/**
 * Copyright (c) 2019, Luciano Ropero <lropero@gmail.com>
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

const chalk = require('chalk')
const commander = require('commander')
const detectIndent = require('detect-indent')
const { arrowRight, cross, tick } = require('figures')
const { execSync } = require('child_process')
const { existsSync, readFileSync, unlinkSync, writeFileSync } = require('fs')
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

const queryVersions = async ({ pckgs, registry }) => {
  console.log(chalk.gray('querying versions'))
  const responses = await Promise.all(pckgs.map(async (pckg) => {
    try {
      const { version = false } = await manifest(pckg, { registry })
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
    const versions = await queryVersions({ pckgs, registry: options.registry })
    await upgrade({ deps, options, packageIndent, packageJSON, packagePath, versions })
  } catch (error) {
    console.log(`${chalk.red(cross)} ${errorToString(error)}`)
    process.exit(0)
  }
}

const syncFiles = ({ options }) => {
  for (const lockFile of ['package-lock.json', 'yarn.lock']) {
    if (existsSync(pathResolve(process.cwd(), lockFile))) {
      unlinkSync(lockFile)
    }
  }
  if (existsSync(pathResolve(process.cwd(), 'node_modules'))) {
    const useYarn = commandExistsSync('yarn') && !options.npm
    const command = useYarn ? 'yarn' : 'npm install'
    if (options.modules) {
      console.log(chalk.gray(`running ${command}`))
      execSync(command, { stdio: [] })
      return true
    } else {
      console.log(chalk.yellow(`node_modules not synced, run ${command} to sync files`))
    }
  }
  return false
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
      console.log(chalk.yellow('package.json not upgraded, run without -t option to upgrade'))
    } else {
      await writePackage({ deps, packageIndent, packageJSON, packagePath })
      const synced = await syncFiles({ options })
      console.log(chalk.blue(`${synced ? 'dependencies' : 'package.json'} upgraded`))
    }
  } else {
    console.log(chalk.blue('no updates'))
  }
}

const writePackage = ({ deps, packageIndent, packageJSON, packagePath }) => {
  if (packageJSON.dependencies) {
    packageJSON.dependencies = deps.dependencies
  }
  if (packageJSON.devDependencies) {
    packageJSON.devDependencies = deps.devDependencies
  }
  const indent = packageIndent.type === 'tab' ? '\t' : packageIndent.amount
  writeFileSync(packagePath, JSON.stringify(packageJSON, null, indent) + '\n', 'utf8')
}

commander
  .version(version, '-v, --version')
  .option('-m, --modules', 'Sync node_modules if updates')
  .option('-n, --npm', 'Force npm instead of yarn')
  .option('-r, --registry <registry>', 'Set the npm registry to use')
  .option('-s, --skip <packages>', 'Skip packages')
  .option('-t, --test', 'Query versions without upgrading')
  .parse(process.argv)

run({
  modules: !!commander.modules,
  npm: !!commander.npm,
  registry: commander.registry || 'https://registry.npmjs.org/',
  skip: (commander.skip || '').split(','),
  test: !!commander.test
})
