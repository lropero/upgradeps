# upgradeps &middot; [![npm version](https://badge.fury.io/js/upgradeps.svg)](https://www.npmjs.com/package/upgradeps)&nbsp;[![Project Status: Active – The project has reached a stable, usable state and is being actively developed.](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)

Blazingly fast command-line utility to audit and **upgra**de all **dep**endencie**s** in package.json, potentially updating packages across major versions.

### Installation and usage

Installation not required, simply run in project's root anytime you'd like to audit package.json:

```sh
npx upgradeps
```

### Options

##### `-g` / `--groups <groups>`

Groups to process (defaults to all)

```sh
npx upgradeps -g devDependecies,peerDependencies
```

##### `-m` / `--minor`

Process only minor/patch updates when available

```sh
npx upgradeps -m
```

##### `-r` / `--registry <registry>`

Set npm registry to use

```sh
npx upgradeps -r https://registry.npmjs.org/
```

##### `-v` / `--verbose`

Prints information for latest dependencies too

```sh
npx upgradeps -v
```

##### `-u` / `--upgrade`

Upgrade package.json

```sh
npx upgradeps -u
```

##### `-f` / `--fixed`

No ^carets

```sh
npx upgradeps -u -f
```

##### `-s` / `--skip <packages>`

Skip packages

```sh
npx upgradeps -u -s react,react-dom
```

##### `-y` / `--yarn`

Use yarn instead of npm

```sh
npx upgradeps -u -y
```
