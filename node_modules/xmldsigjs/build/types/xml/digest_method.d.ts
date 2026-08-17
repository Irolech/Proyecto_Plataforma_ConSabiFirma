import { XmlSignatureObject } from './xml_object.js';
/**
 * Represents the <DigestMethod> element of an XML signature.
 *
 * ```xml
 * <element name="DigestMethod" type="ds:DigestMethodType"/>
 * <complexType name="DigestMethodType" mixed="true">
 *   <sequence>
 *     <any namespace="##other" processContents="lax" minOccurs="0" maxOccurs="unbounded"/>
 *   </sequence>
 *   <attribute name="Algorithm" type="anyURI" use="required"/>
 * </complexType>
 * ```
 */
export declare class DigestMethod extends XmlSignatureObject {
    Algorithm: string;
    constructor(hashNamespace?: string);
}
