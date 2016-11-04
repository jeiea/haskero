'use strict';

import {InteroProxy} from '../interoProxy'
import {InteroResponse} from './interoResponse'

export interface InteroRequest {
    send(interoProxy : InteroProxy) : Promise<InteroResponse>;
}
