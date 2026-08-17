"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XmlDsigEnvelopedSignatureTransform = void 0;
const xml_core_1 = require("xml-core");
const transform_js_1 = require("../transform.js");
const xml_names_js_1 = require("../xml_names.js");
class XmlDsigEnvelopedSignatureTransform extends transform_js_1.Transform {
    constructor() {
        super(...arguments);
        this.Algorithm = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature';
    }
    GetOutput() {
        if (!this.innerXml) {
            throw new xml_core_1.XmlError(xml_core_1.XE.PARAM_REQUIRED, 'innerXml');
        }
        let child = this.innerXml.firstChild;
        const signatures = [];
        while (child) {
            if ((0, xml_core_1.isElement)(child) &&
                child.localName === xml_names_js_1.XmlSignature.ElementNames.Signature &&
                child.namespaceURI === xml_names_js_1.XmlSignature.NamespaceURI) {
                signatures.push(child);
            }
            child = child.nextSibling;
        }
        for (const signature of signatures) {
            signature.parentNode?.removeChild(signature);
        }
        return this.innerXml;
    }
}
exports.XmlDsigEnvelopedSignatureTransform = XmlDsigEnvelopedSignatureTransform;
