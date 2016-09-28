module Main where

import Lib (ourAdd)

import Text.Printf (printf)

aaa x = 3

-- ourAddComment
main :: IO ()
main = printf "2 + 3 = %d\n" (ourAdd 2 5)

xxx = 3
    where
        innerfunc a = a

f xxx = xxx + aaa
-- test = 3 + "e"

-- test2 = 3 + "e"

