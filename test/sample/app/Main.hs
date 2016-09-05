module Main where

import Lib (ourAdd)

import Text.Printf (printf)


aaa x = 3

main :: IO ()
main = printf "2 + 3 = %d\n" (ourAdd 2 5)


-- test = 3 + "e"

-- test2 = 3 + "e"

