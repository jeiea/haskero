# Haskero for VSCode
Language server for Haskell using [Intero backend](https://github.com/commercialhaskell/intero)

**Key features**

* Code Highlight and snippets (automatic dependency on [Haskell Syntax Highlighting](https://marketplace.visualstudio.com/items?itemName=justusadam.language-haskell))
* Compilation errors and warnings
* Goto definition
* Identifiers types on hover
* Code completion

**Dependencies**

* It works on `stack` projects only
* It needs intero to be installed (see : [Installing intero](https://github.com/commercialhaskell/intero/blob/master/TOOLING.md#installing))
* [Haskell Syntax Highlighting](https://marketplace.visualstudio.com/items?itemName=justusadam.language-haskell)

## Features

### GHC Warnings and errors (on save)

**Errors on save**

![GHC Errors](https://gitlab.com/vannnns/haskero/raw/master/client/media/error-on-save.gif "GHC Errors")

**Warnings on save**

![GHC Warnings](https://gitlab.com/vannnns/haskero/raw/master/client/media/warning-on-save.gif "GHC Warnings")


### Identifier type definition

**Type definition on hover (or ctr+k,ctr+i)**

![Type definition](https://gitlab.com/vannnns/haskero/raw/master/client/media/type-at.gif "Type definition")

### Goto definition

**Goto Identifier definition (or F12)**

![Goto definition](https://gitlab.com/vannnns/haskero/raw/master/client/media/loc-at.gif "Goto definition")

## Incoming improvements

- [ ] Better auto completion (support dot notation for qualified imports, ...)
- [ ] Insert identifier type one line above
- [ ] Goto definition in hackage
- [ ] Live evaluation of random haskell code in the current module scope

## Feedback

### Bugs

To fill a bug, go to my gitlab repository, [open an issue](https://gitlab.com/vannnns/haskero/issues) and use the following pattern:
> Bug description :

> Observed behaviour :

> Expected behaviour :

> Plugin (ghc, stack, intero and haskero) version and VSCode version used :

> If the issue is hard to repeat on an empty haskell project, a link to a repository containing a sample repeating the issue

### Features

To ask for a feature, check if the feature is already requested ([features](https://gitlab.com/vannnns/haskero/issues?label_name%5B%5D=Feature) on the gitlab repository).
If not, create a new issue with the *feature requested* label.

## How it works ?

For technical information, please refer to the server project [readme](https://gitlab.com/vannnns/haskero/blob/master/server/README.md)

### License
[CeCILL](LICENSE)