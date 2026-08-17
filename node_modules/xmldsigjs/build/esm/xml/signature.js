import { __decorate, __metadata } from "tslib";
import { XmlAttribute, XmlChildElement, XmlElement, XmlBase64Converter } from 'xml-core';
import { DataObjects } from './data_object.js';
import { KeyInfo } from './key_info.js';
import { SignedInfo } from './signed_info.js';
import { XmlSignature } from './xml_names.js';
import { XmlSignatureObject } from './xml_object.js';
let Signature = class Signature extends XmlSignatureObject {
};
__decorate([
    XmlAttribute({
        localName: XmlSignature.AttributeNames.Id,
        defaultValue: '',
    }),
    __metadata("design:type", String)
], Signature.prototype, "Id", void 0);
__decorate([
    XmlChildElement({
        parser: SignedInfo,
        required: true,
    }),
    __metadata("design:type", SignedInfo)
], Signature.prototype, "SignedInfo", void 0);
__decorate([
    XmlChildElement({
        localName: XmlSignature.ElementNames.SignatureValue,
        namespaceURI: XmlSignature.NamespaceURI,
        prefix: XmlSignature.DefaultPrefix,
        required: true,
        converter: XmlBase64Converter,
        defaultValue: null,
    }),
    __metadata("design:type", Object)
], Signature.prototype, "SignatureValue", void 0);
__decorate([
    XmlChildElement({
        parser: KeyInfo,
    }),
    __metadata("design:type", KeyInfo)
], Signature.prototype, "KeyInfo", void 0);
__decorate([
    XmlChildElement({
        parser: DataObjects,
        noRoot: true,
    }),
    __metadata("design:type", DataObjects)
], Signature.prototype, "ObjectList", void 0);
Signature = __decorate([
    XmlElement({
        localName: XmlSignature.ElementNames.Signature,
    })
], Signature);
export { Signature };
