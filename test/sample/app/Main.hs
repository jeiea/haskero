module Main where

import System.IO
import Control.Monad
import qualified Data.IntMap.Strict as M

import Lib

import Text.Printf (printf)

main :: IO ()
main = printf "2 + 3 = %d\n" (ourAdd 2 5)

aaa x = 3

xxx = 3 + abc + 1
    where
        innerfunc a = a
        abc = 1

f xxx = (xxx)



g x = x

t = g.f


--adju = M.

he x = x

y''' = "e" ++abc++"e"
    where
        abc = "salut"
-- test = 3 + "e"

-- test2 = 3 + "e"

