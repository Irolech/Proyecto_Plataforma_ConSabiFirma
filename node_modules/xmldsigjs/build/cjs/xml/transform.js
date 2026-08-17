"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transform = void 0;
const tslib_1 = require("tslib");
const xml_core_1 = require("xml-core");
const xml_names_js_1 = require("./xml_names.js");
const xml_object_js_1 = require("./xml_object.js");
let Transform = class Transform extends xml_object_js_1.XmlSignatureObject {
    constructor() {
        super(...arguments);
        this.innerXml = null;
    }
    GetOutput() {
        throw new xml_core_1.XmlError(xml_core_1.XE.METHOD_NOT_IMPLEMENTED);
    }
    LoadInnerXml(node) {
        if (!node) {
            throw new xml_core_1.XmlError(xml_core_1.XE.PARAM_REQUIRED, 'node');
        }
        this.innerXml = node;
    }
    GetInnerXml() {
        return this.innerXml;
    }
};
exports.Transform = Transform;
tslib_1.__decorate([
    (0, xml_core_1.XmlAttribute)({
        localName: xml_names_js_1.XmlSignature.AttributeNames.Algorithm,
        defaultValue: '',
    }),
    tslib_1.__metadata("design:type", String)
], Transform.prototype, "Algorithm", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        localName: xml_names_js_1.XmlSignature.ElementNames.XPath,
        defaultValue: '',
    }),
    tslib_1.__metadata("design:type", String)
], Transform.prototype, "XPath", void 0);
exports.Transform = Transform = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: xml_names_js_1.XmlSignature.ElementNames.Transform,
    })
], Transform);
