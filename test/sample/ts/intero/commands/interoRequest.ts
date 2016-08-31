import {InteroProxy} from '../interoProxy.ts'

export interface InteroRequest {
    send(interoProxy : InteroProxy, onInteroResponse : (InteroResponse) => void) : void;
}
