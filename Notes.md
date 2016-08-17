# Notes on intero behavior

## Function *loc-at*

### syntaxe

- in `:loc-at filePath|moduleName line_start col_start line_end col_end text`
- out `filePath:(line_start,col_start)-(line_end,col_end)`


### sample
- in: `:loc-at C:\tmp\franklinchen\app\Main.hs 8 31 8 36 ourAdd`
- out found: `C:\tmp\franklinchen\src\Lib.hs:(11,1)-(11,7)`
- out not found: `Couldn't resolve to any modules.`