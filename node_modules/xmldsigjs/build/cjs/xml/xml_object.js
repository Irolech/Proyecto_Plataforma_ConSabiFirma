"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XmlSignatureCollection = exports.XmlSignatureObject = void 0;
const tslib_1 = require("tslib");
const xml_core_1 = require("xml-core");
const xml_names_js_1 = require("./xml_names.js");
let XmlSignatureObject = class XmlSignatureObject extends xml_core_1.XmlObject {
};
exports.XmlSignatureObject = XmlSignatureObject;
exports.XmlSignatureObject = XmlSignatureObject = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: 'xmldsig',
        namespaceURI: xml_names_js_1.XmlSignature.NamespaceURI,
        prefix: xml_names_js_1.XmlSignature.DefaultPrefix,
    })
], XmlSignatureObject);
let XmlSignatureCollection = class XmlSignatureCollection extends xml_core_1.XmlCollection {
};
exports.XmlSignatureCollection = XmlSignatureCollection;
exports.XmlSignatureCollection = XmlSignatureCollection = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: 'xmldsig_collection',
        namespaceURI: xml_names_js_1.XmlSignature.NamespaceURI,
        prefix: xml_names_js_1.XmlSignature.DefaultPrefix,
    })
], XmlSignatureCollection);
