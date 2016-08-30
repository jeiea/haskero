# Notes on intero behavior

## Errors/Warnings

### parse error

    [2 of 2] Compiling Main             ( E:\haskell\VSCode-haskell-intero\test\sample\app\Main.hs, interpreted )

    E:\haskell\VSCode-haskell-intero\test\sample\app\Main.hs:6:1:
        parse error on input \`<'

### Not in scope

    [2 of 2] Compiling Main             ( E:\haskell\VSCode-haskell-intero\test\sample\app\Main.hs, interpreted )

    E:\haskell\VSCode-haskell-intero\test\sample\app\Main.hs:10:8:
        Not in scope: \`ahah'


### Multiple declarations

    E:\haskell\VSCode-haskell-intero\test\sample\app\Main.hs:12:1:
        Multiple declarations of `test'
        Declared at: E:\haskell\VSCode-haskell-intero\test\sample\app\Main.hs:10:1
                     E:\haskell\VSCode-haskell-intero\test\sample\app\Main.hs:12:1

### Type error

    [2 of 2] Compiling Main             ( E:\haskell\VSCode-haskell-intero\test\sample\app\Main.hs, interpreted )

    E:\haskell\VSCode-haskell-intero\test\sample\app\Main.hs:8:40:
         Couldn't match expected type \`Int' with actual type \`[Char]'
         In the second argument of \`ourAdd', namely \`"r"'
         In the second argument of \`printf', namely \`(ourAdd 2 "r")'
         In the expression: printf "2 + 3 = %d\n" (ourAdd 2 "r") `


### Warnings

     E:\haskell\VSCode-haskell-intero\test\sample\src\Lib.hs:15:1: Warning:
        Defined but not used: `bounds'

### Several errors/warnings

    E:\haskell\VSCode-haskell-intero\test\sample\src\Lib.hs:15:1: Warning:
        Defined but not used: `bounds'

    E:\haskell\VSCode-haskell-intero\test\sample\src\Lib.hs:18:1: Warning:
        Defined but not used: `bounds2'

    E:\haskell\VSCode-haskell-intero\test\sample\src\Lib.hs:24:1: Warning:
        Defined but not used: `taxe'

    E:\haskell\VSCode-haskell-intero\test\sample\src\Lib.hs:24:1: Warning:
        Top-level binding with no type signature:
          taxe :: Double -> (Double, Double)

    E:\haskell\VSCode-haskell-intero\test\sample\app\Main.hs:8:40:
        Couldn't match expected type `Int' with actual type `[Char]'
        In the second argument of `ourAdd', namely `"r"'
        In the second argument of `printf', namely `(ourAdd 2 "r")'
        In the expression: printf "2 + 3 = %d\n" (ourAdd 2 "r")

    E:\haskell\VSCode-haskell-intero\test\sample\app\Main.hs:10:10:
        No instance for (Num [Char]) arising from a use of `+'
        In the expression: 3 + "e"
        In an equation for `test': test = 3 + "e"

    E:\haskell\VSCode-haskell-intero\test\sample\app\Main.hs:12:11:
        No instance for (Num [Char]) arising from a use of `+'
        In the expression: 3 + "e"
        In an equation for `test2': test2 = 3 + "e"
    Failed, modules loaded: Lib.


## Function *loc-at*

### syntaxe

- in `:loc-at filePath|moduleName line_start col_start line_end col_end text`
- out `filePath:(line_start,col_start)-(line_end,col_end)`


### sample
- in: `:loc-at C:\tmp\franklinchen\app\Main.hs 8 31 8 36 ourAdd`
- out found: `C:\tmp\franklinchen\src\Lib.hs:(11,1)-(11,7)`
- out not found: `Couldn't resolve to any modules.`


# Notes on stack

## File path

File path white spaces aren't supported: cmd like `stack ghci` are broken. See issue [stack #2266](https://github.com/commercialhaskell/stack/issues/2266)
