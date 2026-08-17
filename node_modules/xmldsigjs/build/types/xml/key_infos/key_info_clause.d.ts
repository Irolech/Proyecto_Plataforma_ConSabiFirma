import { XmlSignatureObject } from '../xml_object.js';
export declare abstract class KeyInfoClause extends XmlSignatureObject {
    Key: CryptoKey | null;
    abstract importKey(key: CryptoKey): Promise<this>;
    abstract exportKey(alg?: Algorithm): Promise<CryptoKey>;
    static canImportCryptoKey(_key: CryptoKey): boolean;
}
export interface KeyInfoClauseConstructable {
    new (): KeyInfoClause;
    canImportCryptoKey(key: CryptoKey): boolean;
}
