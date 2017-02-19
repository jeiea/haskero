# Haskero, a Haskell IDE
Haskero is a full featured haskell IDE using [Intero backend](https://github.com/commercialhaskell/intero)

**Key features**

* Code Highlight and snippets (automatic dependency on [Haskell Syntax Highlighting](https://marketplace.visualstudio.com/items?itemName=justusadam.language-haskell))
* Compilation errors and warnings
* Insert type signature
* Goto definition
* Find all references
* Identifiers types on hover
* Code completion
* Switching cabal targets

## Installation instructions

See [installation instructions](https://gitlab.com/vannnns/haskero/blob/master/client/doc/installation.md)

## Features

### GHC Warnings and errors (on save)

**Errors on save**

![GHC Errors](https://gitlab.com/vannnns/haskero/raw/master/client/media/error-on-save.gif "GHC Errors")

**Warnings on save**

![GHC Warnings](https://gitlab.com/vannnns/haskero/raw/master/client/media/warning-on-save.gif "GHC Warnings")


### Automatic types insertion

**Insert identifier type**

Haskero can insert any identifier type one live above.
```haskell
taxe m =
  foldl calculate (0,m) (bounds2 0 bounds)
```
with `ctrl+shift+p > haskell: Instert Type` it becomes

```haskell
taxe :: Double -> (Double, Double)
taxe m =
  foldl calculate (0,m) (bounds2 0 bounds)
```

You can associate a short cut (here **ctrl+k t**):

keybindings.json (File > Preferences > Keyboard Shortcuts)
```json
{
    "key": "ctrl+k t",
    "command": "haskero.insertType",
    "when": "editorTextFocus"
}
```

### Identifier type definition

**Type definition on hover (or ctr+k,ctr+i)**

![Type definition](https://gitlab.com/vannnns/haskero/raw/master/client/media/type-at.gif "Type definition")

### Goto definition

**Goto Identifier definition (or F12)**

![Goto definition](https://gitlab.com/vannnns/haskero/raw/master/client/media/loc-at.gif "Goto definition")

### Find all references

Find all references of a symbol in the **same module** (shift+F12)

## Incoming improvements

- [x] Support switching cabal targets
- [ ] Better auto completion (support dot notation for qualified imports, ...)
- [x] Insert identifier type one line above
- [ ] Goto definition in hackage
- [ ] Live evaluation of random haskell code in the current module scope

## Dependencies

* It works on `stack` projects only (stack 1.2.0 minimum) - see [Installing stack](https://docs.haskellstack.org/en/stable/install_and_upgrade)
* It needs intero to be installed in the stack project - see [Installing intero](https://github.com/commercialhaskell/intero/blob/master/TOOLING.md#installing)
* Automatic dependency (auto install) [Haskell Syntax Highlighting](https://marketplace.visualstudio.com/items?itemName=justusadam.language-haskell)

## Feedback

### Bugs

To fill a bug, go to my gitlab repository, [open an issue](https://gitlab.com/vannnns/haskero/issues) and use the following pattern:

- Bug description :

- Observed behaviour :

- Expected behaviour :

- OS: windows | linux | macos

- Plugin **(ghc, stack, intero and haskero)** version and **VSCode** version used :

- Steps to reproduce:

1.

2.

3.

- If the issue is hard to repeat on an empty haskell project, a link to a repository containing a sample repeating the issue

### Features

To ask for a feature, check if the feature is already requested ([features](https://gitlab.com/vannnns/haskero/issues?label_name%5B%5D=Feature) on the gitlab repository).
If not, create a new issue with the *feature requested* label.

## How it works ?

For technical information, please refer to the server project [readme](https://gitlab.com/vannnns/haskero/blob/master/server/README.md)

### License
[CeCILL](LICENSE)