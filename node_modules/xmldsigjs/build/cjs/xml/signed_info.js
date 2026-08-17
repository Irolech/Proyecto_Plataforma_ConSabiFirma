"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignedInfo = void 0;
const tslib_1 = require("tslib");
const xml_core_1 = require("xml-core");
const canonicalization_method_js_1 = require("./canonicalization_method.js");
const reference_js_1 = require("./reference.js");
const signature_method_js_1 = require("./signature_method.js");
const xml_names_js_1 = require("./xml_names.js");
const xml_object_js_1 = require("./xml_object.js");
let SignedInfo = class SignedInfo extends xml_object_js_1.XmlSignatureObject {
};
exports.SignedInfo = SignedInfo;
tslib_1.__decorate([
    (0, xml_core_1.XmlAttribute)({
        localName: xml_names_js_1.XmlSignature.AttributeNames.Id,
        defaultValue: '',
    }),
    tslib_1.__metadata("design:type", String)
], SignedInfo.prototype, "Id", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        parser: canonicalization_method_js_1.CanonicalizationMethod,
        required: true,
    }),
    tslib_1.__metadata("design:type", canonicalization_method_js_1.CanonicalizationMethod)
], SignedInfo.prototype, "CanonicalizationMethod", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        parser: signature_method_js_1.SignatureMethod,
        required: true,
    }),
    tslib_1.__metadata("design:type", signature_method_js_1.SignatureMethod)
], SignedInfo.prototype, "SignatureMethod", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        parser: reference_js_1.References,
        minOccurs: 1,
        noRoot: true,
    }),
    tslib_1.__metadata("design:type", reference_js_1.References)
], SignedInfo.prototype, "References", void 0);
exports.SignedInfo = SignedInfo = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: xml_names_js_1.XmlSignature.ElementNames.SignedInfo,
    })
], SignedInfo);
