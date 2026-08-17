import { KeyInfoClause } from './key_info_clause.js';
/**
 * Represents the <SPKIData> element of an XML signature.
 *
 * ```xml
 * <element name="SPKIData" type="ds:SPKIDataType"/>
 * <complexType name="SPKIDataType">
 *   <sequence maxOccurs="unbounded">
 *     <element name="SPKISexp" type="base64Binary"/>
 *     <any namespace="##other" processContents="lax" minOccurs="0"/>
 *   </sequence>
 * </complexType>
 * ```
 */
export declare class SPKIData extends KeyInfoClause {
    Key: CryptoKey;
    SPKIexp: Uint8Array | null;
    importKey(key: CryptoKey): Promise<this>;
    exportKey(alg: Algorithm): Promise<CryptoKey>;
}
