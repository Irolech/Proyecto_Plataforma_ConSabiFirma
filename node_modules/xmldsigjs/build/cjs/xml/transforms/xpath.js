"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XmlDsigXPathTransform = void 0;
const tslib_1 = require("tslib");
const xml_core_1 = require("xml-core");
const transform_js_1 = require("../transform.js");
const xml_names_js_1 = require("../xml_names.js");
function lookupParentNode(node) {
    return node.parentNode ? lookupParentNode(node.parentNode) : node;
}
class XmlDsigXPathTransform extends transform_js_1.Transform {
    constructor() {
        super(...arguments);
        this.Algorithm = xml_names_js_1.XmlSignature.AlgorithmNamespaces.XmlDsigXPathTransform;
    }
    GetOutput() {
        if (!this.innerXml) {
            throw new xml_core_1.XmlError(xml_core_1.XE.PARAM_REQUIRED, 'innerXml');
        }
        this.Filter(lookupParentNode(this.innerXml), this.XPath);
    }
    Filter(node, xpath) {
        const childNodes = node.childNodes;
        const nodes = [];
        for (let i = 0; childNodes && i < childNodes.length; i++) {
            const child = childNodes.item(i);
            nodes.push(child);
        }
        nodes.forEach((child) => {
            if (this.Evaluate(child, xpath)) {
                if (child.parentNode) {
                    child.parentNode.removeChild(child);
                }
            }
            else {
                this.Filter(child, xpath);
            }
        });
    }
    GetEvaluator(node) {
        if (typeof self !== 'undefined') {
            return (node.ownerDocument == null ? node : node.ownerDocument);
        }
        else {
            return (0, xml_core_1.getNodeDependency)('xpath');
        }
    }
    Evaluate(node, xpath) {
        try {
            const evaluator = this.GetEvaluator(node);
            const xml = this.GetXml();
            if (!xml || !xml.firstChild) {
                throw new Error('XML element or firstChild is not defined');
            }
            const xpathEl = xml.firstChild;
            const xPath = `boolean(${xpath})`;
            const xpathModule = typeof self === 'undefined' ? (0, xml_core_1.getNodeDependency)('xpath') : self;
            const xpathResult = evaluator.evaluate(xPath, node, {
                lookupNamespaceURI: (prefix) => {
                    return xpathEl.lookupNamespaceURI(prefix);
                },
            }, xpathModule.XPathResult.ANY_TYPE, null);
            return !xpathResult.booleanValue;
        }
        catch {
            return false;
        }
    }
}
exports.XmlDsigXPathTransform = XmlDsigXPathTransform;
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        localName: xml_names_js_1.XmlSignature.ElementNames.XPath,
        namespaceURI: xml_names_js_1.XmlSignature.NamespaceURI,
        prefix: xml_names_js_1.XmlSignature.DefaultPrefix,
        required: true,
    }),
    tslib_1.__metadata("design:type", String)
], XmlDsigXPathTransform.prototype, "XPath", void 0);
