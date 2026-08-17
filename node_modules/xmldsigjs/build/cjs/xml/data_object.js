"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataObjects = exports.DataObject = void 0;
const tslib_1 = require("tslib");
const xml_core_1 = require("xml-core");
const xml_names_js_1 = require("./xml_names.js");
const xml_object_js_1 = require("./xml_object.js");
let DataObject = class DataObject extends xml_object_js_1.XmlSignatureObject {
};
exports.DataObject = DataObject;
tslib_1.__decorate([
    (0, xml_core_1.XmlAttribute)({
        localName: xml_names_js_1.XmlSignature.AttributeNames.Id,
        defaultValue: '',
    }),
    tslib_1.__metadata("design:type", String)
], DataObject.prototype, "Id", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlAttribute)({
        localName: xml_names_js_1.XmlSignature.AttributeNames.MimeType,
        defaultValue: '',
    }),
    tslib_1.__metadata("design:type", String)
], DataObject.prototype, "MimeType", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlAttribute)({
        localName: xml_names_js_1.XmlSignature.AttributeNames.Encoding,
        defaultValue: '',
    }),
    tslib_1.__metadata("design:type", String)
], DataObject.prototype, "Encoding", void 0);
exports.DataObject = DataObject = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: xml_names_js_1.XmlSignature.ElementNames.Object,
    })
], DataObject);
let DataObjects = class DataObjects extends xml_object_js_1.XmlSignatureCollection {
};
exports.DataObjects = DataObjects;
exports.DataObjects = DataObjects = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: 'xmldsig_objects',
        parser: DataObject,
    })
], DataObjects);
