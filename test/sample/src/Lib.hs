-- | A library to do stuff.
module Lib
    (
      ourAdd
    ) where

-- | Add two 'Int' values.
ourAdd :: Int  -- ^ left
       -> Int  -- ^ right
       -> Int  -- ^ sum
ourAdd x y = x + y

--let bounds = [(0,9700),(9701,26791), (26792, 71826), (71827, 152108), (192108,10000000000)]
bounds :: [(Double, Double)]
bounds = [(9700, 0), (26791, 0.14), (71826, 0.3) ,(152108, 0.41) ,(10000000000, 0.45)]

bounds2 :: Double -> [(Double, Double)] -> [(Double, Double)]
bounds2 _ [] = []
bounds2 _ (x:[]) = [x]
bounds2 l ((level,rate):xs) = ((level - l),rate) : bounds2 level xs

--huhu = inconnu 5

taxe m =
  foldl calculate (0,m) (bounds2 0 bounds)
  where
    calculate :: (Double, Double) -> (Double, Double) -> (Double, Double)
    calculate (accuTaxe, leftToTaxe) (level, rate)
      | leftToTaxe <= 0     = (accuTaxe, 0)
      | leftToTaxe <= level = (accuTaxe + leftToTaxe * rate, 0)
      | otherwise           = (accuTaxe + level * rate, leftToTaxe - level)
