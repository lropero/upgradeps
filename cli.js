#!/usr/bin/env node
const chalk = require('chalk')
const commandExistsSync = require('command-exists').sync
const commander = require('commander')
const { arrowRight, cross, tick } = require('figures')
const { concatMap } = require('rxjs/operators')
const { exec, execSync } = require('child_process')
const { existsSync } = require('fs')
const { forkJoin, from } = require('rxjs')
const { resolve } = require('path')

const packageFile = resolve(process.cwd(), 'package.json')
if (!existsSync(packageFile)) { process.exit(1) }
const { dependencies = {}, devDependencies = {} } = require(packageFile)
const { version } = require('./package.json')

commander
  .version(version, '-v, --version')
  .option('-n, --npm', 'Force npm instead of yarn')
  .option('-s, --skip <packages>', 'Skip packages')
  .parse(process.argv)
const npm = !!commander.npm
const skip = (commander.skip || '').split(',')

const useYarn = commandExistsSync('yarn') && !npm
console.log(chalk[useYarn ? 'green' : 'blue'](`upgradeps v${version}`))
const deps = { dependencies, devDependencies }
const groups = Object.keys(deps)
const options = useYarn ? { dependencies: '', devDependencies: ' --dev' } : { dependencies: ' --save', devDependencies: ' --save-dev' }
from(groups).pipe(
  concatMap((group) => new Promise(async (resolve, reject) => {
    console.log(chalk.yellow(`…${group}`))
    const pckgs = Object.keys(deps[group])
    const sources = pckgs.reduce((sources, pckg) => ({
      ...sources,
      [pckg]: new Promise((resolve, reject) => {
        try {
          exec(`npm view ${pckg} version`, { stdio: [] }, (error, stdout) => {
            if (error) { return resolve(false) }
            return resolve(stdout.trim())
          })
        } catch (error) {
          return resolve(false)
        }
      })
    }), {})
    const versions = await forkJoin(sources).toPromise()
    const latests = Object.keys(versions).reduce((latests, pckg) => {
      if (versions[pckg]) {
        latests[pckg] = versions[pckg]
      }
      return latests
    }, {})
    Object.keys(latests).map((pckg) => {
      const current = deps[group][pckg].replace(/[\^~]/, '').trim()
      const latest = latests[pckg]
      if (current !== latest) {
        try {
          const skips = skip.includes(pckg)
          !skips && execSync(useYarn ? `yarn remove ${pckg} && yarn add ${pckg}${options[group]} --ignore-scripts` : `npm uninstall ${pckg} && npm install ${pckg}${options[group]} --ignore-scripts`, { stdio: [] })
          console.log(`${chalk.cyan(pckg)} ${skips ? chalk.yellow(cross) : chalk.green(tick)} ${current} ${chalk.yellow(arrowRight)} ${latest}`)
        } catch (error) {
          console.log(`${chalk.cyan(pckg)} ${chalk.red(cross)} ${chalk.yellow(error.toString())}`)
        }
      }
    })
    return resolve()
  }))
).subscribe()
