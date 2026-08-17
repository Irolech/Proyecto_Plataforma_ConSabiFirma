import { XmlSignatureObject } from '../xml_object.js';
export class KeyInfoClause extends XmlSignatureObject {
    static canImportCryptoKey(_key) {
        return false;
    }
}
