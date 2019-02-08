'use strict';

import { HaskeroSettings } from '../haskeroSettings';
import { InteroFactory } from '../intero/interoAgent';
import assert = require('assert');

const emptySetting: HaskeroSettings = {
  debugMode: true,
  intero: {
    ghciOptions: [],
    ignoreDotGhci: true,
    stackPath: 'stack',
    startupParams: []
  },
  maxAutoCompletionDetails: 100
};

describe('intero ipc test', () => {
  it('tests intero spawning', async () => {
    const intero = await new InteroFactory(emptySetting).create([]);
    for (let i = 0; i < 7; i++) {
      intero.evaluate(':l "test/Convert.hs"');
    }
    const res = await intero.evaluate(':l "test/Convert.hs"');
    assert(res.rawerr.length > 50000);
  });
});
