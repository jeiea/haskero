module Demo where

import Data.IntMap.Strict as M

names :: IntMap [Char]
names = M.fromList [(1,"Rhyton"), (2, "René")]