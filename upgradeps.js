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
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
import { execSync } from 'child_process'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { program } from 'commander'
import { resolve as pathResolve } from 'path'
import { sync as commandExistsSync } from 'command-exists'

const VERSION = '2.0.1'
TimeAgo.addDefaultLocale(en)

const getInfo = () => {
  const path = pathResolve(process.cwd(), 'package.json')
  const contents = readFileSync(path, 'utf8')
  const indent = detectIndent(contents)
  const json = JSON.parse(contents)
  const { bundledDependencies = {}, dependencies = {}, devDependencies = {}, optionalDependencies = {}, peerDependencies = {} } = json
  const current = { bundledDependencies, dependencies, devDependencies, optionalDependencies, peerDependencies }
  return { current, indent, json, path }
}

const print = ({ options, versions }) => {
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
  const getDependencies = dependencies => {
    return dependencies
      ? `${chalk.cyan(`${dependencies.amount} dependenc${dependencies.amount > 1 ? 'ies' : 'y'}`)}${
          dependencies.audit
            ? ` ${Object.keys(dependencies.audit)
                .map(differenceType => getDifferenceType({ amount: dependencies.audit[differenceType], differenceType }))
                .join(chalk.cyan(', '))}`
            : ''
        } `
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
  const timeAgo = new TimeAgo()
  Object.keys(versions).map(pckg => {
    const { currentVersion, dependencies, differenceType = 'latest', latest, modified } = versions[pckg]
    const ago = `modified ${timeAgo.format(new Date(modified))}`
    console.log(`${getFigure(differenceType)} ${chalk.cyan(pckg)} ${getDetails({ currentVersion, differenceType, version: latest })}${!options.minor ? ` ${getDependencies(dependencies)}${chalk[ago.includes('year') ? 'red' : 'gray'](ago)}` : ''}`)
  })
}

const queryVersions = async ({ current, options }) => {
  const dependencies = Object.keys(current)
    .filter(group => options.groups.includes(group))
    .reduce((dependencies, group) => ({ ...dependencies, ...current[group] }), {})
  const responses = await Promise.all(
    Object.keys(dependencies).map(async pckg => {
      try {
        let details = {}
        const currentVersion = dependencies[pckg]
          .replace('.x', '.0')
          .replace(/[\^~]/, '')
          .trim()
        const packument = options.registry.length ? await pacote.packument(pckg, { registry: options.registry }) : await pacote.packument(pckg)
        const innerDependencies = (packument.versions[currentVersion] || packument.versions[packument['dist-tags'].latest]).dependencies
        if (innerDependencies) {
          const counter = { build: 0, major: 0, minor: 0, patch: 0, premajor: 0, preminor: 0, prepatch: 0, prerelease: 0 }
          const keys = Object.keys(innerDependencies)
          await Promise.all(
            keys.map(async pckg => {
              const manifest = options.registry.length ? await pacote.manifest(pckg, { registry: options.registry }) : await pacote.manifest(pckg)
              try {
                const differenceType = semverDiff(
                  innerDependencies[pckg]
                    .replace('.x', '.0')
                    .replace(/[\^~]/, '')
                    .trim(),
                  manifest.version
                )
                if (differenceType) {
                  counter[differenceType]++
                }
              } catch (error) {}
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
            modified: packument.modified
          }
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
              return { [pckg]: details }
            }
            return { [pckg]: false }
          } else {
            return { [pckg]: details }
          }
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

const run = async options => {
  try {
    const info = getInfo()
    const { current } = info
    console.log(`${chalk.green(`upgradeps v${VERSION}`)} ${chalk.gray(`${figures.line} run with -h to output usage information`)}`)
    const versions = await queryVersions({ current, options })
    print({ options, versions })
    if (options.upgrade) {
      upgrade({ info, options, versions })
    }
  } catch (error) {
    console.error(`${chalk.red(figures.cross)} ${error.toString()}`)
    process.exit(0)
  }
}

const syncModules = options => {
  const useYarn = options.yarn && commandExistsSync('yarn')
  const lock = useYarn ? 'yarn.lock' : 'package-lock.json'
  if (existsSync(pathResolve(process.cwd(), lock))) {
    unlinkSync(lock)
  }
  if (existsSync(pathResolve(process.cwd(), 'node_modules'))) {
    execSync(`${useYarn ? 'yarn' : 'npm install'}${options.registry.length ? ` --registry ${options.registry}` : ''}`, { stdio: [] })
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
            upgraded[group][pckg] = `${options.fixed ? '' : '^'}${versions[pckg].latest}`
            hasChanges = true
          }
        }
      }
    })
  if (hasChanges) {
    writePackage({ info, options, upgraded })
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
  .option('-g, --groups <groups>', "groups to process (defaults to all) -> e.g. '-g devDependecies,peerDependencies'")
  .option('-m, --minor', 'process only minor/patch updates when available')
  .option('-r, --registry <registry>', 'set npm registry to use')
  .option('-u, --upgrade', 'upgrade package.json')
  .option('-f, --fixed', 'no ^carets (used with -u)')
  .option('-s, --skip <packages>', "skip packages (used with -u) -> e.g. '-s react,react-dom'")
  .option('-y, --yarn', 'use yarn instead of npm (used with -u)')
  .parse(process.argv)

const options = program.opts()

run({
  fixed: !!options.fixed,
  groups: (options.groups || 'bundledDependencies,dependencies,devDependencies,optionalDependencies,peerDependencies').split(',').filter(group => ['bundledDependencies', 'dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'].includes(group)),
  minor: !!options.minor,
  registry: options.registry || '',
  skip: (options.skip || '').split(','),
  upgrade: !!options.upgrade,
  yarn: !!options.yarn
})
