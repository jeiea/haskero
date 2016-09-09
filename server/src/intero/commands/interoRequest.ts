import {InteroProxy} from '../interoProxy.ts'
import {InteroResponse} from './interoResponse'

export interface InteroRequest {
    send(interoProxy : InteroProxy) : Promise<InteroResponse>;
}
