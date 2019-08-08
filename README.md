# upgradeps &middot; [![npm version](https://badge.fury.io/js/upgradeps.svg)](https://www.npmjs.com/package/upgradeps)
Blazingly fast command-line utility to **upgra**de all **dep**endencie**s** in package.json to latest version, potentially updating packages across major versions. Uses yarn when available, npm otherwise. Inspired by [yarn-upgrade-all](https://github.com/tylerlong/yarn-upgrade-all#readme).

### Installation and usage
Installation not required, simply run in project's root anytime you'd like to update dependencies:
```sh
npx upgradeps
```
>Not using npx? Then `yarn add upgradeps --dev` to install locally, then `yarn run upgradeps`. Not using yarn? `npm install upgradeps --save-dev`, then `./node_modules/.bin/upgradeps` or create the following script in package.json: `"upgradeps": "upgradeps"`, then `npm run upgradeps`.

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
##### `-t` / `--test`
Query versions without upgrading
```sh
npx upgradeps -t
```
