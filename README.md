# upgradeps &middot; [![npm version](https://badge.fury.io/js/upgradeps.svg)](https://www.npmjs.com/package/upgradeps)&nbsp;[![Project Status: Active – The project has reached a stable, usable state and is being actively developed.](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)
Blazingly fast command-line utility to **upgra**de all **dep**endencie**s** in package.json to latest version, potentially updating packages across major versions. Uses yarn when available, npm otherwise.

### Installation and usage
Installation not required, simply run in project's root anytime you'd like to update dependencies:
```sh
npx upgradeps
```

### Options
##### `-m` / `--modules`
Sync node_modules
```sh
npx upgradeps -m
```
##### `-n` / `--npm`
Force npm instead of yarn
```sh
npx upgradeps -n
```
##### `-s` / `--skip`
Skip packages
```sh
npx upgradeps -s react,react-dom
```
##### `-t` / `--test`
Query versions without upgrading (dry run)
```sh
npx upgradeps -t
```
