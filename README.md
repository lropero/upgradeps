# upgradeps &middot; [![npm version](https://badge.fury.io/js/upgradeps.svg)](https://www.npmjs.com/package/upgradeps)
Command-line utility to **upgra**de all **dep**endencie**s** in package.json to latest version, potentially updating packages across major versions. Uses yarn when available, npm otherwise. Inspired by [yarn-upgrade-all](https://github.com/tylerlong/yarn-upgrade-all#readme).

### Installation and usage
Installation not required, simply run in project's root anytime you'd like to update dependencies:
```sh
npx upgradeps
```
>Not using npx? Then `yarn add upgradeps --dev` (or `npm install upgradeps --save-dev`) to install locally, then `yarn run upgradeps` (or `npm run upgradeps`).

### Options
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
