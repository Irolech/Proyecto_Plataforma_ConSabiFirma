import { __decorate, __metadata } from "tslib";
import { XmlAttribute, XmlElement } from 'xml-core';
import { XmlSignature } from './xml_names.js';
import { XmlSignatureObject } from './xml_object.js';
let CanonicalizationMethod = class CanonicalizationMethod extends XmlSignatureObject {
};
__decorate([
    XmlAttribute({
        localName: XmlSignature.AttributeNames.Algorithm,
        required: true,
        defaultValue: XmlSignature.DefaultCanonMethod,
    }),
    __metadata("design:type", String)
], CanonicalizationMethod.prototype, "Algorithm", void 0);
CanonicalizationMethod = __decorate([
    XmlElement({
        localName: XmlSignature.ElementNames.CanonicalizationMethod,
    })
], CanonicalizationMethod);
export { CanonicalizationMethod };
