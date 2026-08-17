import { __decorate, __metadata } from "tslib";
import { XmlAttribute, XmlChildElement, XmlElement } from 'xml-core';
import { CanonicalizationMethod } from './canonicalization_method.js';
import { References } from './reference.js';
import { SignatureMethod } from './signature_method.js';
import { XmlSignature } from './xml_names.js';
import { XmlSignatureObject } from './xml_object.js';
let SignedInfo = class SignedInfo extends XmlSignatureObject {
};
__decorate([
    XmlAttribute({
        localName: XmlSignature.AttributeNames.Id,
        defaultValue: '',
    }),
    __metadata("design:type", String)
], SignedInfo.prototype, "Id", void 0);
__decorate([
    XmlChildElement({
        parser: CanonicalizationMethod,
        required: true,
    }),
    __metadata("design:type", CanonicalizationMethod)
], SignedInfo.prototype, "CanonicalizationMethod", void 0);
__decorate([
    XmlChildElement({
        parser: SignatureMethod,
        required: true,
    }),
    __metadata("design:type", SignatureMethod)
], SignedInfo.prototype, "SignatureMethod", void 0);
__decorate([
    XmlChildElement({
        parser: References,
        minOccurs: 1,
        noRoot: true,
    }),
    __metadata("design:type", References)
], SignedInfo.prototype, "References", void 0);
SignedInfo = __decorate([
    XmlElement({
        localName: XmlSignature.ElementNames.SignedInfo,
    })
], SignedInfo);
export { SignedInfo };
