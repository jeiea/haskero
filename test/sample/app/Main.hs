module Main where

import Lib (ourAdd)

import Text.Printf (printf)

main :: IO ()
main = printf "2 + 3 = %d\n" (ourAdd 2 "r")

test = 3 + "e"

test2 = 3 + "e"

