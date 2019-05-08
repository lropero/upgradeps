# Upgradeps
Command-line utility to **upgra**de all **dep**endencie**s** in package.json to latest version, potentially updating packages across major versions. Uses yarn when available, npm otherwise. Inspired by [yarn-upgrade-all](https://github.com/tylerlong/yarn-upgrade-all#readme).

### Installation
yarn
```sh
yarn add upgradeps --dev
```
npm
```sh
npm install upgradeps --save-dev
```

### Usage
```sh
npx upgradeps
```
To skip some packages, use `-s` or `--skip` followed by a comma-separated list of packages to ignore:
```sh
npx upgradeps -s react,react-dom
```
