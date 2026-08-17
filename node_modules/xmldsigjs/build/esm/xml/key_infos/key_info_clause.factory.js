import { XE, XmlError } from 'xml-core';
import { keyValueRegistry } from './key_info_clause.registry.js';
export class KeyInfoClauseFactory {
    static create(type) {
        const ctor = keyValueRegistry.get(type);
        if (!ctor) {
            throw new XmlError(XE.KEY_INFO_CLAUSE_NOT_SUPPORTED, type);
        }
        return new ctor();
    }
}
