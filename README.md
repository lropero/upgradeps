# upgradeps
Command-line utility to upgrade all packages in package.json to latest version, potentially upgrading across major versions.

### Installation
```sh
yarn add --dev upgradeps
```

### Usage
```sh
yarn run upgradeps
```
If upgrades, run `rm -f ./yarn.lock && rm -rf ./node_modules && yarn` and commit `package.json` and `yarn.lock`.

### Philosophy
I believe that dependencies should be updated at the beginning of every sprint and refactor any breaking changes. For more information on why this is a good practice watch [this](https://www.youtube.com/watch?v=dQw4w9WgXcQ).
