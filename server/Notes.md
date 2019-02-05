# Current work notes

Hovering a word when intero is rebooting (eg: while changing intera targets) and more generaly sending a LSP request when intero is rebooting, cause haskero do fall out os sync with interoProxy and next request
doesn't receive a response

# Ideas

## Rename

To rename an identifier: 
- change the identifier in the source
- :r in ghci
- parse compilation errors to extract reference locations and rename each location

## Type aware autocompletion

Use the new _ placeholder:
- replace the current token with a _
- :l file in ghci
- parse response to extract type aware autocompletion list
- filter the list with the token previously removed


# Notes on intero behavior


## GET url on hoogle
https://www.haskell.org/hoogle/?hoogle=a-%3Ea&mode=json

## full cmd

sample of a cmd launched by emacsmode :

`stack ghci --with-ghc intero "--docker-run-args=--interactive=true --tty=false" --no-build --no-load --ghci-options -odir=/home/jchia/git/tms/hs/.stack-work/intero/intero31725Fz1 --ghci-options -hidir=/home/jchia/git/tms/hs/.stack-work/intero/intero31725Fz1 rgr-automation`

## Indices

intero indices are 1 based.
ex: the first char of a source code is at (line 1 - column 1)

a range starts at the first char and ends at the last char + 1: [line/col first char, (line/col)+1 last char]
ex:
 - range of text foo in `hi foo is great` is [line 1 - col 4, line 1 col 7]
 - range of text foo in `hi foo` is [line 1 - col 4, line 2 col 1]

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

### Variable not in scope

E:\haskell\codinggame\hypersonic\src\Lib.hs:11:5: error:

    * Variable not in scope:
 replicateM :: Int -> IO () -> IO a0
    * Perhaps you meant `replicate' (imported from Prelude)

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
