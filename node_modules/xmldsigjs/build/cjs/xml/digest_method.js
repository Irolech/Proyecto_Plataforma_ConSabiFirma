"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DigestMethod = void 0;
const tslib_1 = require("tslib");
const xml_core_1 = require("xml-core");
const xml_names_js_1 = require("./xml_names.js");
const xml_object_js_1 = require("./xml_object.js");
let DigestMethod = class DigestMethod extends xml_object_js_1.XmlSignatureObject {
    constructor(hashNamespace) {
        super();
        if (hashNamespace) {
            this.Algorithm = hashNamespace;
        }
    }
};
exports.DigestMethod = DigestMethod;
tslib_1.__decorate([
    (0, xml_core_1.XmlAttribute)({
        localName: xml_names_js_1.XmlSignature.AttributeNames.Algorithm,
        required: true,
        defaultValue: xml_names_js_1.XmlSignature.DefaultDigestMethod,
    }),
    tslib_1.__metadata("design:type", String)
], DigestMethod.prototype, "Algorithm", void 0);
exports.DigestMethod = DigestMethod = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: xml_names_js_1.XmlSignature.ElementNames.DigestMethod,
    }),
    tslib_1.__metadata("design:paramtypes", [String])
], DigestMethod);
