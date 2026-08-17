"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.References = exports.Reference = void 0;
const tslib_1 = require("tslib");
const xml_core_1 = require("xml-core");
const digest_method_js_1 = require("./digest_method.js");
const transform_collection_js_1 = require("./transform_collection.js");
const xml_names_js_1 = require("./xml_names.js");
const xml_object_js_1 = require("./xml_object.js");
let Reference = class Reference extends xml_object_js_1.XmlSignatureObject {
    constructor(uri) {
        super();
        this.DigestMethod = new digest_method_js_1.DigestMethod();
        if (uri) {
            this.Uri = uri;
        }
    }
};
exports.Reference = Reference;
tslib_1.__decorate([
    (0, xml_core_1.XmlAttribute)({
        defaultValue: '',
    }),
    tslib_1.__metadata("design:type", String)
], Reference.prototype, "Id", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlAttribute)({
        localName: xml_names_js_1.XmlSignature.AttributeNames.URI,
    }),
    tslib_1.__metadata("design:type", String)
], Reference.prototype, "Uri", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlAttribute)({
        localName: xml_names_js_1.XmlSignature.AttributeNames.Type,
        defaultValue: '',
    }),
    tslib_1.__metadata("design:type", String)
], Reference.prototype, "Type", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        parser: transform_collection_js_1.Transforms,
    }),
    tslib_1.__metadata("design:type", transform_collection_js_1.Transforms)
], Reference.prototype, "Transforms", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        required: true,
        parser: digest_method_js_1.DigestMethod,
    }),
    tslib_1.__metadata("design:type", digest_method_js_1.DigestMethod)
], Reference.prototype, "DigestMethod", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        required: true,
        localName: xml_names_js_1.XmlSignature.ElementNames.DigestValue,
        namespaceURI: xml_names_js_1.XmlSignature.NamespaceURI,
        prefix: xml_names_js_1.XmlSignature.DefaultPrefix,
        converter: xml_core_1.XmlBase64Converter,
    }),
    tslib_1.__metadata("design:type", Uint8Array)
], Reference.prototype, "DigestValue", void 0);
exports.Reference = Reference = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: xml_names_js_1.XmlSignature.ElementNames.Reference,
    }),
    tslib_1.__metadata("design:paramtypes", [String])
], Reference);
let References = class References extends xml_object_js_1.XmlSignatureCollection {
};
exports.References = References;
exports.References = References = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: 'References',
        parser: Reference,
    })
], References);
