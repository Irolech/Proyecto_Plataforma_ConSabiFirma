"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Signature = void 0;
const tslib_1 = require("tslib");
const xml_core_1 = require("xml-core");
const data_object_js_1 = require("./data_object.js");
const key_info_js_1 = require("./key_info.js");
const signed_info_js_1 = require("./signed_info.js");
const xml_names_js_1 = require("./xml_names.js");
const xml_object_js_1 = require("./xml_object.js");
let Signature = class Signature extends xml_object_js_1.XmlSignatureObject {
};
exports.Signature = Signature;
tslib_1.__decorate([
    (0, xml_core_1.XmlAttribute)({
        localName: xml_names_js_1.XmlSignature.AttributeNames.Id,
        defaultValue: '',
    }),
    tslib_1.__metadata("design:type", String)
], Signature.prototype, "Id", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        parser: signed_info_js_1.SignedInfo,
        required: true,
    }),
    tslib_1.__metadata("design:type", signed_info_js_1.SignedInfo)
], Signature.prototype, "SignedInfo", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        localName: xml_names_js_1.XmlSignature.ElementNames.SignatureValue,
        namespaceURI: xml_names_js_1.XmlSignature.NamespaceURI,
        prefix: xml_names_js_1.XmlSignature.DefaultPrefix,
        required: true,
        converter: xml_core_1.XmlBase64Converter,
        defaultValue: null,
    }),
    tslib_1.__metadata("design:type", Object)
], Signature.prototype, "SignatureValue", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        parser: key_info_js_1.KeyInfo,
    }),
    tslib_1.__metadata("design:type", key_info_js_1.KeyInfo)
], Signature.prototype, "KeyInfo", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        parser: data_object_js_1.DataObjects,
        noRoot: true,
    }),
    tslib_1.__metadata("design:type", data_object_js_1.DataObjects)
], Signature.prototype, "ObjectList", void 0);
exports.Signature = Signature = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: xml_names_js_1.XmlSignature.ElementNames.Signature,
    })
], Signature);
