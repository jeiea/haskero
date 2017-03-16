module Main where

import Data.IntMap.Strict as M

names :: IntMap [Char]
names = M.fromList [(1,"Rhyton"), (2, "René")]

main :: IO ()
main = return ()