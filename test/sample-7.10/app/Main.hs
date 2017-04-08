module Main where

import System.IO


import System.IO.Unsafe as P
import Control.Concurrent.QSem
import qualified Data.IntMap.Strict as M

import Lib

import Text.Printf (printf)

newtype MyType = MyType { unMyType :: String }

data MyData = String | Int

main :: IO ()
main = printf "2 + 3 = %d\n" (ourAdd 2 5)



aaa x = 3


xxx :: Integer
xxx = 3 + abc + 1
    where
        innerfunc a = a
        abc = 1
        foo = 6

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

