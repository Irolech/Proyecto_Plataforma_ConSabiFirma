"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XmlDsigC14NWithCommentsTransform = exports.XmlDsigC14NTransform = void 0;
const xml_core_1 = require("xml-core");
const canonicalizer_js_1 = require("../../canonicalizer.js");
const transform_js_1 = require("../transform.js");
class XmlDsigC14NTransform extends transform_js_1.Transform {
    constructor() {
        super(...arguments);
        this.Algorithm = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
        this.xmlCanonicalizer = new canonicalizer_js_1.XmlCanonicalizer(false, false);
    }
    GetOutput() {
        if (!this.innerXml) {
            throw new xml_core_1.XmlError(xml_core_1.XE.PARAM_REQUIRED, 'innerXml');
        }
        return this.xmlCanonicalizer.Canonicalize(this.innerXml);
    }
}
exports.XmlDsigC14NTransform = XmlDsigC14NTransform;
class XmlDsigC14NWithCommentsTransform extends XmlDsigC14NTransform {
    constructor() {
        super(...arguments);
        this.Algorithm = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315#WithComments';
        this.xmlCanonicalizer = new canonicalizer_js_1.XmlCanonicalizer(true, false);
    }
}
exports.XmlDsigC14NWithCommentsTransform = XmlDsigC14NWithCommentsTransform;
