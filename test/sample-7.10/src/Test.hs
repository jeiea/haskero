module Test where

import Data.IntMap.Strict

l :: [(Int, String)]
l = [(1,"1"), (2,"2")]

getValue :: Int -> String
getValue key = findWithDefault "empty" key (fromList l)