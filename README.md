# upgradeps &middot; [![npm version](https://badge.fury.io/js/upgradeps.svg)](https://www.npmjs.com/package/upgradeps)&nbsp;[![Project Status: Active – The project has reached a stable, usable state and is being actively developed.](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)

Audit and **upgra**de all **dep**endencie**s** in `package.json`.

![upgradeps](https://user-images.githubusercontent.com/4450399/184115801-ca0fa405-32f3-49b3-9db3-bfb86a804845.png)

### Installation

Installation not required, run `npx upgradeps` in project's root anytime you'd like to audit `package.json` (dry run).

### Options

##### `-v` / `--verbose`

Print information for latest dependencies too

```sh
npx upgradeps -v
```

##### `-g` / `--groups <groups>`

Specify groups to process (defaults to all, available options are `bundledDependencies`, `dependencies`, `devDependencies`, `optionalDependencies` and `peerDependencies`)

```sh
npx upgradeps -g dependencies,devDependecies
```

##### `-m` / `--minor`

Process only `minor` and `patch` updates when available

```sh
npx upgradeps -m
```

##### `-r` / `--registry <registry>`

Set registry to use

```sh
npx upgradeps -r https://registry.npmjs.org
```

##### `-u` / `--upgrade`

Upgrade `package.json`

```sh
npx upgradeps -u
```

##### `-f` / `--fixed`

Remove `^`carets (used with -u)

```sh
npx upgradeps -u -f
```

##### `-s` / `--skip <packages>`

Skip packages (used with -u)

```sh
npx upgradeps -u -s react,react-dom
```

##### `-y` / `--yarn`

Use `yarn` instead of `npm` (used with -u)

```sh
npx upgradeps -u -y
```
