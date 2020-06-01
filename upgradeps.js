#!/usr/bin/env node
/**
 * Copyright (c) 2020, Luciano Ropero <lropero@gmail.com>
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
const compareVersions = require('compare-versions')
const detectIndent = require('detect-indent')
const { arrowRight, cross, line, tick } = require('figures')
const { execSync } = require('child_process')
const { existsSync, readFileSync, unlinkSync, writeFileSync } = require('fs')
const { manifest } = require('pacote')
const { resolve: pathResolve } = require('path')
const { sync: commandExistsSync } = require('command-exists')

const { version } = require('./package.json')

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
  console.log(chalk.blue('querying versions'))
  const responses = await Promise.all(pckgs.map(async (pckg) => {
    try {
      const { version = false } = registry.length ? await manifest(pckg, { registry }) : await manifest(pckg)
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
    console.log(`${chalk.green(`upgradeps v${version}`)} ${chalk.gray(`${line} run with -h option to output usage information`)}`)
    const { deps, packageIndent, packageJSON, packagePath, pckgs } = getInfo()
    const versions = await queryVersions({ pckgs, registry: options.registry })
    await upgrade({ deps, options, packageIndent, packageJSON, packagePath, versions })
  } catch (error) {
    console.error(`${chalk.red(cross)} ${error.toString()}`)
    process.exit(0)
  }
}

const syncModules = ({ modules, npm, registry }) => {
  for (const lockFile of ['package-lock.json', 'yarn.lock']) {
    if (existsSync(pathResolve(process.cwd(), lockFile))) {
      unlinkSync(lockFile)
    }
  }
  if (existsSync(pathResolve(process.cwd(), 'node_modules'))) {
    const useYarn = commandExistsSync('yarn') && !npm
    const command = `${useYarn ? 'yarn' : 'npm install'}${registry.length ? ' --registry ' + registry : ''}`
    if (modules) {
      console.log(chalk.blue(`running '${command}'`))
      execSync(command, { stdio: [] })
      return true
    } else {
      console.log(chalk.yellow(`node_modules not synced, run '${command}' to sync files`))
    }
  }
  return false
}

const upgrade = async ({ deps, options, packageIndent, packageJSON, packagePath, versions }) => {
  const { modules, npm, query, registry, skip } = options
  const found = Object.keys(versions)
  let hasUpdates = false
  for (const group of Object.keys(deps)) {
    for (const pckg of Object.keys(deps[group])) {
      if (found.includes(pckg)) {
        const current = deps[group][pckg].replace(/[\^~]/, '').trim()
        const latest = versions[pckg]
        if (compareVersions(latest, current, '>')) {
          const skips = skip.includes(pckg)
          if (!skips) {
            deps[group][pckg] = `^${latest}`
            hasUpdates = true
          }
          console.log(`${chalk.cyan(pckg)} ${query || skips ? chalk.yellow(cross) : chalk.green(tick)} ${current} ${chalk.yellow(arrowRight)} ${latest}`)
        }
      }
    }
  }
  if (hasUpdates) {
    if (query) {
      console.log(chalk.yellow('package.json not upgraded, run without -q option to upgrade'))
    } else {
      await writePackage({ deps, packageIndent, packageJSON, packagePath })
      const synced = await syncModules({ modules, npm, registry })
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
  .option('-m, --modules', 'sync node_modules if updates')
  .option('-n, --npm', 'use npm instead of yarn')
  .option('-q, --query', 'query versions without upgrading (dry run)')
  .option('-r, --registry <registry>', 'set the npm registry to use')
  .option('-s, --skip <packages>', 'skip packages')
  .parse(process.argv)

run({
  modules: !!commander.modules,
  npm: !!commander.npm,
  query: !!commander.query,
  registry: commander.registry || '',
  skip: (commander.skip || '').split(',')
})
