import { __decorate, __metadata } from "tslib";
import { XmlAttribute, XmlElement } from 'xml-core';
import { XmlSignature } from './xml_names.js';
import { XmlSignatureObject } from './xml_object.js';
let DigestMethod = class DigestMethod extends XmlSignatureObject {
    constructor(hashNamespace) {
        super();
        if (hashNamespace) {
            this.Algorithm = hashNamespace;
        }
    }
};
__decorate([
    XmlAttribute({
        localName: XmlSignature.AttributeNames.Algorithm,
        required: true,
        defaultValue: XmlSignature.DefaultDigestMethod,
    }),
    __metadata("design:type", String)
], DigestMethod.prototype, "Algorithm", void 0);
DigestMethod = __decorate([
    XmlElement({
        localName: XmlSignature.ElementNames.DigestMethod,
    }),
    __metadata("design:paramtypes", [String])
], DigestMethod);
export { DigestMethod };
