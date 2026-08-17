"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanonicalizationMethod = void 0;
const tslib_1 = require("tslib");
const xml_core_1 = require("xml-core");
const xml_names_js_1 = require("./xml_names.js");
const xml_object_js_1 = require("./xml_object.js");
let CanonicalizationMethod = class CanonicalizationMethod extends xml_object_js_1.XmlSignatureObject {
};
exports.CanonicalizationMethod = CanonicalizationMethod;
tslib_1.__decorate([
    (0, xml_core_1.XmlAttribute)({
        localName: xml_names_js_1.XmlSignature.AttributeNames.Algorithm,
        required: true,
        defaultValue: xml_names_js_1.XmlSignature.DefaultCanonMethod,
    }),
    tslib_1.__metadata("design:type", String)
], CanonicalizationMethod.prototype, "Algorithm", void 0);
exports.CanonicalizationMethod = CanonicalizationMethod = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: xml_names_js_1.XmlSignature.ElementNames.CanonicalizationMethod,
    })
], CanonicalizationMethod);
