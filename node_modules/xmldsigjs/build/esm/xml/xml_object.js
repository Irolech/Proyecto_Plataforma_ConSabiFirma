import { __decorate } from "tslib";
import { XmlCollection, XmlObject, XmlElement } from 'xml-core';
import { XmlSignature } from './xml_names.js';
let XmlSignatureObject = class XmlSignatureObject extends XmlObject {
};
XmlSignatureObject = __decorate([
    XmlElement({
        localName: 'xmldsig',
        namespaceURI: XmlSignature.NamespaceURI,
        prefix: XmlSignature.DefaultPrefix,
    })
], XmlSignatureObject);
export { XmlSignatureObject };
let XmlSignatureCollection = class XmlSignatureCollection extends XmlCollection {
};
XmlSignatureCollection = __decorate([
    XmlElement({
        localName: 'xmldsig_collection',
        namespaceURI: XmlSignature.NamespaceURI,
        prefix: XmlSignature.DefaultPrefix,
    })
], XmlSignatureCollection);
export { XmlSignatureCollection };
