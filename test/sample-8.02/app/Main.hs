module Main where

import System.IO
import Control.Monad
import qualified Data.IntMap.Strict as M

import Lib

import Text.Printf (printf)

main :: IO ()
main = printf "2 + 3 = %d\n" (ourAdd 2 5)

getM x = M.lookup x (M.fromList [(1, "e"), (2, "p")] )

ttt = M.fromList

aaa :: Num a => t -> a
aaa x = 3

xxx = 3 + abc + 1
    where
        innerfunc :: t -> t
        innerfunc a = a
        abc = 1
        foo = 5

f xxx = (xxx)



foo :: Int -> Int
foo x = foo' (x + 1)
    where
        foo' a = a - 1



g x = x

t = g.f


--adju = M.

he x = x

y''' = "e" ++abc++"e"
    where
        abc = "salut"
-- test = 3 + "e"

-- test2 = 3 + "e"

