"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XmlDsigExcC14NWithCommentsTransform = exports.XmlDsigExcC14NTransform = void 0;
const xml_core_1 = require("xml-core");
const canonicalizer_js_1 = require("../../canonicalizer.js");
const transform_js_1 = require("../transform.js");
class XmlDsigExcC14NTransform extends transform_js_1.Transform {
    constructor() {
        super(...arguments);
        this.Algorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#';
        this.xmlCanonicalizer = new canonicalizer_js_1.XmlCanonicalizer(false, true);
    }
    get InclusiveNamespacesPrefixList() {
        return this.xmlCanonicalizer.InclusiveNamespacesPrefixList;
    }
    set InclusiveNamespacesPrefixList(value) {
        this.xmlCanonicalizer.InclusiveNamespacesPrefixList = value;
    }
    LoadXml(param) {
        super.LoadXml(param);
        if (this.Element && this.Element.childNodes) {
            for (let i = 0; i < this.Element.childNodes.length; i++) {
                const element = this.Element.childNodes[i];
                if (element && element.nodeType === 1) {
                    switch (element.localName) {
                        case 'InclusiveNamespaces':
                            this.setInclusiveNamespacesElement(element);
                            break;
                    }
                }
            }
        }
    }
    GetOutput() {
        if (!this.innerXml) {
            throw new xml_core_1.XmlError(xml_core_1.XE.PARAM_REQUIRED, 'innerXml');
        }
        return this.xmlCanonicalizer.Canonicalize(this.innerXml);
    }
    setInclusiveNamespacesElement(element) {
        const prefixList = element.getAttribute('PrefixList');
        if (prefixList && prefixList.length > 0) {
            this.xmlCanonicalizer.InclusiveNamespacesPrefixList = prefixList;
        }
    }
}
exports.XmlDsigExcC14NTransform = XmlDsigExcC14NTransform;
class XmlDsigExcC14NWithCommentsTransform extends XmlDsigExcC14NTransform {
    constructor() {
        super(...arguments);
        this.Algorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#WithComments';
        this.xmlCanonicalizer = new canonicalizer_js_1.XmlCanonicalizer(true, true);
    }
}
exports.XmlDsigExcC14NWithCommentsTransform = XmlDsigExcC14NWithCommentsTransform;
