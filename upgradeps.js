#!/usr/bin/env node
/**
 * Copyright (c) 2023, Luciano Ropero <lropero@gmail.com>
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
import chalkAnimation from 'chalk-animation'
import detectIndent from 'detect-indent'
import figures from 'figures'
import latestSemver from 'latest-semver'
import pacote from 'pacote'
import semverDiff from 'semver-diff'
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
import { basename as pathBasename, resolve as pathResolve } from 'path'
import { execSync } from 'child_process'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { program } from 'commander'

const VERSION = '2.1.0'
TimeAgo.addDefaultLocale(en)

const getColor = differenceType => {
  switch (differenceType) {
    case 'latest':
      return 'green'
    case 'major':
      return 'red'
    case 'minor':
      return 'yellow'
    case 'patch':
      return 'blue'
    default:
      return 'magenta'
  }
}

const getConfig = () => {
  const configPath = pathResolve(process.cwd(), 'upgradeps.json')
  if (existsSync(configPath)) {
    try {
      const configContents = readFileSync(configPath, 'utf8')
      return JSON.parse(configContents)
    } catch (error) {
      console.log(` ${chalk.yellow(figures.warning)} ${chalk.blue('error parsing upgradeps.json, using defaults')}`)
      return {}
    }
  }
  return {}
}

const getDependencies = dependencies => {
  return dependencies
    ? ` ${chalk.cyan(`${dependencies.amount} dependenc${dependencies.amount > 1 ? 'ies' : 'y'}`)}${
        dependencies.audit
          ? ` ${Object.keys(dependencies.audit)
              .map(differenceType => getDifferenceType({ amount: dependencies.audit[differenceType], differenceType }))
              .join(chalk.gray(', '))}`
          : ''
      }`
    : ''
}

const getDetails = ({ currentVersion, differenceType, version }) => {
  const background = getColor(differenceType)
  return `${differenceType === 'latest' ? currentVersion : `${chalk[`bg${`${background.charAt(0).toUpperCase()}${background.slice(1)}`}`](currentVersion)} ${chalk.yellow(figures.arrowRight)} ${version}`} ${getDifferenceType({ differenceType })}`
}

const getDifferenceType = ({ amount = 0, differenceType }) => {
  return chalk[getColor(differenceType)](`${amount > 0 ? `${amount} ` : ''}${differenceType}`)
}

const getFigure = differenceType => {
  return chalk[getColor(differenceType)](figures[differenceType === 'latest' ? 'tick' : 'cross'])
}

const getPackageInfo = () => {
  const path = pathResolve(process.cwd(), 'package.json')
  const contents = readFileSync(path, 'utf8')
  const indent = detectIndent(contents)
  const json = JSON.parse(contents)
  const { bundledDependencies = {}, dependencies = {}, devDependencies = {}, optionalDependencies = {}, peerDependencies = {} } = json
  const current = { bundledDependencies, dependencies, devDependencies, optionalDependencies, peerDependencies }
  return { current, indent, json, path }
}

const normalizeSemver = version => {
  const normalized = version.replace('.x', '.0').replace(/[\^~]/, '').trim()
  const parts = normalized.split('.')
  while (parts.length < 3) {
    parts.push('0')
  }
  return parts.join('.')
}

const print = ({ options, versions }) =>
  new Promise(resolve => {
    const stats = { amount: 0 }
    const timeAgo = new TimeAgo()
    Object.keys(versions).forEach(pckg => {
      const { currentVersion, dependencies, differenceType = 'latest', latest, time } = versions[pckg]
      if (!stats.audit) {
        stats.audit = {}
      }
      if (differenceType !== 'latest' || options.verbose) {
        if (!stats.audit[differenceType]) {
          stats.audit[differenceType] = 0
        }
        stats.amount++
        stats.audit[differenceType]++
        const ago = time ? `last publish ${timeAgo.format(new Date(time))}` : ''
        const color = ago.includes('2 years') ? 'bgMagenta' : ago.includes('years') ? 'bgRed' : ago.includes('year') ? 'bgYellow' : 'gray'
        console.log(`  ${getFigure(differenceType)} ${chalk.cyan(pckg)} ${getDetails({ currentVersion, differenceType, version: latest })}${getDependencies(dependencies)}${ago.length > 0 ? ` ${chalk[color](ago)}` : ''}`)
      }
    })
    const emojis = ['ヽ(´▽`)ノ', 'ԅ(≖‿≖ԅ)', 'ᕕ( ᐛ )ᕗ']
    const animation = chalkAnimation[stats.amount === 0 ? 'rainbow' : 'neon'](stats.amount === 0 ? `  ${figures.tick} no updates ${emojis[Math.floor(Math.random() * emojis.length)]}` : ` ${getDependencies(stats)}`, 1.2)
    setTimeout(() => {
      animation.stop()
      return resolve()
    }, 1500)
  })

const queryVersions = async ({ current, options }) => {
  const dependencies = Object.keys(current)
    .filter(group => options.groups.includes(group))
    .reduce((dependencies, group) => ({ ...dependencies, ...current[group] }), {})
  const responses = await Promise.all(
    Object.keys(dependencies).map(async pckg => {
      try {
        let details = {}
        const currentVersion = normalizeSemver(dependencies[pckg])
        const packument = await pacote.packument(pckg, { fullMetadata: true, ...(options.registry.length > 0 && { registry: options.registry }) })
        const innerDependencies = packument.versions[currentVersion]?.dependencies || {}
        const keys = Object.keys(innerDependencies)
        if (keys.length > 0) {
          const counter = { build: 0, major: 0, minor: 0, patch: 0, premajor: 0, preminor: 0, prepatch: 0, prerelease: 0 }
          await Promise.all(
            keys.map(async pckg => {
              try {
                const manifest = options.registry.length ? await pacote.manifest(pckg, { registry: options.registry }) : await pacote.manifest(pckg)
                const differenceType = semverDiff(normalizeSemver(innerDependencies[pckg]), manifest.version)
                if (differenceType) {
                  counter[differenceType]++
                }
              } catch (error) {
                // Skip packages with invalid semver ranges
              }
            })
          )
          const audit = Object.keys(counter)
            .filter(differenceType => counter[differenceType] > 0)
            .reduce((dependencies, differenceType) => ({ ...dependencies, [differenceType]: counter[differenceType] }), {})
          details = {
            dependencies: {
              amount: keys.length,
              ...(Object.keys(audit).length > 0 && { audit })
            }
          }
        }
        try {
          const differenceType = semverDiff(currentVersion, packument['dist-tags'].latest)
          details = {
            currentVersion,
            ...details,
            ...(differenceType && { differenceType }),
            latest: packument['dist-tags'].latest,
            time: packument.time[packument['dist-tags'].latest]
          }
          let result = { [pckg]: false }
          if (options.minor) {
            const patch = latestSemver(
              Object.keys(packument.versions).filter(version => {
                const differenceType = semverDiff(currentVersion, version)
                return differenceType && ['minor', 'patch'].includes(differenceType)
              })
            )
            if (patch) {
              details.differenceType = semverDiff(currentVersion, patch)
              details.latest = patch
              result = { [pckg]: details }
            } else if (!differenceType && options.verbose) {
              result = { [pckg]: details }
            }
          } else {
            result = { [pckg]: details }
          }
          return result
        } catch (error) {
          return { [pckg]: false }
        }
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

const syncModules = options => {
  const lock = options.yarn ? 'yarn.lock' : 'package-lock.json'
  if (existsSync(pathResolve(process.cwd(), lock))) {
    unlinkSync(lock)
  }
  if (existsSync(pathResolve(process.cwd(), 'node_modules'))) {
    execSync(`${options.yarn ? 'yarn' : 'npm install'}${options.registry.length ? ` --registry ${options.registry}` : ''}`, { stdio: [] })
  }
}

const upgrade = ({ info, options, versions }) => {
  const { current: upgraded } = info
  let hasChanges = false
  Object.keys(upgraded)
    .filter(group => options.groups.includes(group))
    .forEach(group => {
      for (const pckg of Object.keys(upgraded[group])) {
        if (!options.skip.includes(pckg)) {
          if (versions[pckg]?.differenceType) {
            upgraded[group][pckg] = `^${versions[pckg].latest}`
            hasChanges = true
          }
          if (options.fixed) {
            upgraded[group][pckg] = upgraded[group][pckg].replace('^', '')
          }
        }
      }
    })
  writePackage({ info, options, upgraded })
  if (hasChanges) {
    syncModules(options)
  }
}

const writePackage = ({ info, options, upgraded }) => {
  const { indent, json, path } = info
  Object.keys(upgraded)
    .filter(group => options.groups.includes(group))
    .forEach(group => {
      if (json[group]) {
        json[group] = upgraded[group]
      }
    })
  writeFileSync(path, JSON.stringify(json, null, indent.type === 'tab' ? '\t' : indent.amount) + '\n', 'utf8')
}

program
  .version(VERSION)
  .option('-f, --fixed', 'remove ^carets when upgrading (use with -u)')
  .option('-g, --groups <groups>', 'specify dependency groups to process (defaults to all) -> e.g. "-g dependencies,devDependecies"')
  .option('-m, --minor', 'process only minor and patch updates')
  .option('-r, --registry <registry>', 'set custom npm registry URL')
  .option('-s, --skip <packages>', 'packages to skip during upgrade -> e.g. "-s react,react-dom" (use with -u)')
  .option('-u, --upgrade', 'automatically upgrade package.json')
  .option('-v, --verbose', 'print information for latest dependencies as well')
  .option('-y, --yarn', 'use yarn instead of npm (use with -u)')
  .action(async options => {
    console.log(`${chalk.magenta(figures.play)} ${chalk.green(`upgradeps v${VERSION}`)} ${chalk.magenta(`<${pathBasename(process.cwd())}>`)} ${chalk.gray(`${figures.line} run with -h to output usage information`)}`)
    const config = Object.keys(options).length > 0 ? {} : getConfig()
    if (Object.keys(config).length > 0) {
      console.log(` ${chalk.blue(figures.bullet)} ${chalk.blue('using configuration from upgradeps.json')}`)
    }
    options = {
      fixed: options.fixed !== undefined ? !!options.fixed : config.fixed !== undefined ? !!config.fixed : false,
      groups: options.groups ? options.groups.split(',').filter(group => ['bundledDependencies', 'dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'].includes(group)) : config.groups && config.groups.length > 0 ? config.groups.filter(group => ['bundledDependencies', 'dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'].includes(group)) : 'bundledDependencies,dependencies,devDependencies,optionalDependencies,peerDependencies'.split(','),
      minor: options.minor !== undefined ? !!options.minor : config.minor !== undefined ? !!config.minor : false,
      registry: options.registry !== undefined ? options.registry : config.registry || '',
      skip: options.skip ? options.skip.split(',').filter(skip => skip.length > 0) : config.skip && config.skip.length > 0 ? config.skip : [],
      upgrade: options.upgrade !== undefined ? !!options.upgrade : config.upgrade !== undefined ? !!config.upgrade : false,
      verbose: options.verbose !== undefined ? !!options.verbose : config.verbose !== undefined ? !!config.verbose : false,
      yarn: options.yarn !== undefined ? !!options.yarn : config.yarn !== undefined ? !!config.yarn : false
    }
    try {
      const info = getPackageInfo()
      const { current } = info
      const versions = await queryVersions({ current, options })
      await print({ options, versions })
      if (options.upgrade) {
        upgrade({ info, options, versions })
      }
    } catch (error) {
      console.log(`${chalk.red(figures.cross)} ${error.toString()}`)
      process.exit(1)
    }
  })
  .parse(process.argv)
