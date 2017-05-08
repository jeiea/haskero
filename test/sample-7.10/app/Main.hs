module Main where

import System.IO


import System.IO.Unsafe as P
import Control.Concurrent.QSem
import qualified Data.IntMap.Strict as M

import Lib (ourAdd)

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

function2 :: Num a => a -> a -> a
function2 c d = function1 c d

function1 :: Num a => a -> a -> a
function1 a b = a + b