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

import chalk from 'chalk'
import detectIndent from 'detect-indent'
import figures from 'figures'
import latestSemver from 'latest-semver'
import pacote from 'pacote'
import semverDiff from 'semver-diff'
import { execSync } from 'child_process'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { program } from 'commander'
import { resolve as pathResolve } from 'path'
import { sync as commandExistsSync } from 'command-exists'

const VERSION = '1.6.3'

const getInfo = () => {
  const packagePath = pathResolve(process.cwd(), 'package.json')
  const packageContents = readFileSync(packagePath, 'utf8')
  const packageIndent = detectIndent(packageContents)
  const packageJSON = JSON.parse(packageContents)
  const { dependencies = {}, devDependencies = {} } = packageJSON
  return {
    currentDependencies: { dependencies, devDependencies },
    packageIndent,
    packageJSON,
    packagePath
  }
}

const queryVersions = async ({ currentDependencies, options }) => {
  const { dev, patch, registry } = options
  console.log(chalk.blue(`querying versions${dev ? ' (devDependencies only)' : ''}`))
  const deps = dev ? currentDependencies.devDependencies : { ...currentDependencies.dependencies, ...currentDependencies.devDependencies }
  const responses = await Promise.all(
    Object.keys(deps).map(async pckg => {
      try {
        let version = false
        if (patch) {
          const packument = await pacote.packument(pckg)
          const current = deps[pckg].replace(/[\^~]/, '').trim()
          const versions = Object.keys(packument.versions).filter(version => {
            const differenceType = semverDiff(current, version)
            return differenceType && !differenceType.startsWith('pre') && !differenceType.endsWith('major')
          })
          if (versions.length) {
            version = latestSemver(versions)
          }
        } else {
          const manifest = registry.length ? await pacote.manifest(pckg, { registry }) : await pacote.manifest(pckg)
          version = manifest.version
        }
        return { [pckg]: version }
      } catch (error) {
        if (error.statusCode === 404) {
          return { [pckg]: false }
        }
        throw error
      }
    })
  )
  return responses.reduce((versions, response) => (Object.values(response)[0] ? { ...versions, ...response } : versions), {})
}

const run = async options => {
  try {
    console.log(`${chalk.green(`upgradeps v${VERSION}`)} ${chalk.gray(`${figures.line} run with -h to output usage information`)}`)
    const { currentDependencies, packageIndent, packageJSON, packagePath } = getInfo()
    const versions = await queryVersions({ currentDependencies, options })
    await upgrade({ currentDependencies, options, packageIndent, packageJSON, packagePath, versions })
  } catch (error) {
    console.error(`${chalk.red(figures.cross)} ${error.toString()}`)
    process.exit(0)
  }
}

const syncModules = options => {
  const { modules, registry, yarn } = options
  for (const lockFile of ['package-lock.json', 'yarn.lock']) {
    if (existsSync(pathResolve(process.cwd(), lockFile))) {
      unlinkSync(lockFile)
    }
  }
  if (existsSync(pathResolve(process.cwd(), 'node_modules'))) {
    const useYarn = yarn && commandExistsSync('yarn')
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

const upgrade = async ({ currentDependencies, options, packageIndent, packageJSON, packagePath, versions }) => {
  const { query, skip } = options
  const differenceTypes = ['build', 'major', 'minor', 'patch']
  const found = Object.keys(versions)
  let hasUpdates = false
  for (const group of Object.keys(currentDependencies)) {
    for (const pckg of Object.keys(currentDependencies[group])) {
      if (found.includes(pckg)) {
        const current = currentDependencies[group][pckg].replace(/[\^~]/, '').trim()
        const latest = versions[pckg]
        const differenceType = semverDiff(current, latest)
        if (differenceTypes.includes(differenceType)) {
          const skips = skip.includes(pckg)
          if (!skips) {
            currentDependencies[group][pckg] = `^${latest}`
            hasUpdates = true
          }
          console.log(`${chalk.cyan(pckg)} ${query || skips ? chalk.yellow(figures.cross) : chalk.green(figures.tick)} ${current} ${chalk.yellow(figures.arrowRight)} ${latest} ${chalk[differenceType.slice(-5) === 'major' ? 'red' : 'magenta'](differenceType)}`)
        }
      }
    }
  }
  if (hasUpdates) {
    if (query) {
      console.log(chalk.yellow('package.json not upgraded, run without -q option to upgrade'))
    } else {
      await writePackage({ currentDependencies, packageIndent, packageJSON, packagePath })
      const synced = await syncModules(options)
      console.log(chalk.blue(`${synced ? 'dependencies' : 'package.json'} upgraded`))
    }
  } else {
    console.log(chalk.blue('no updates'))
  }
}

const writePackage = ({ currentDependencies, packageIndent, packageJSON, packagePath }) => {
  if (packageJSON.dependencies) {
    packageJSON.dependencies = currentDependencies.dependencies
  }
  if (packageJSON.devDependencies) {
    packageJSON.devDependencies = currentDependencies.devDependencies
  }
  const indent = packageIndent.type === 'tab' ? '\t' : packageIndent.amount
  writeFileSync(packagePath, JSON.stringify(packageJSON, null, indent) + '\n', 'utf8')
}

program
  .option('-d, --dev', 'upgrade devDependencies only')
  .option('-m, --modules', 'sync node_modules if updates')
  .option('-p, --patch', 'skip major version upgrades')
  .option('-q, --query', 'query versions without upgrading (dry run)')
  .option('-r, --registry <registry>', 'set the npm registry to use')
  .option('-s, --skip <packages>', 'skip packages')
  .option('-y, --yarn', 'use yarn instead of npm')
  .parse(process.argv)

const options = program.opts()

run({
  dev: !!options.dev,
  modules: !!options.modules,
  patch: !!options.patch,
  query: !!options.query,
  registry: options.registry || '',
  skip: (options.skip || '').split(','),
  yarn: !!options.yarn
})
