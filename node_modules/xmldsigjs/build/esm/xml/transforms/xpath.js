import { __decorate, __metadata } from "tslib";
import { getNodeDependency, XmlChildElement, XmlError, XE } from 'xml-core';
import { Transform } from '../transform.js';
import { XmlSignature } from '../xml_names.js';
function lookupParentNode(node) {
    return node.parentNode ? lookupParentNode(node.parentNode) : node;
}
export class XmlDsigXPathTransform extends Transform {
    constructor() {
        super(...arguments);
        this.Algorithm = XmlSignature.AlgorithmNamespaces.XmlDsigXPathTransform;
    }
    GetOutput() {
        if (!this.innerXml) {
            throw new XmlError(XE.PARAM_REQUIRED, 'innerXml');
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
            return getNodeDependency('xpath');
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
            const xpathModule = typeof self === 'undefined' ? getNodeDependency('xpath') : self;
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
__decorate([
    XmlChildElement({
        localName: XmlSignature.ElementNames.XPath,
        namespaceURI: XmlSignature.NamespaceURI,
        prefix: XmlSignature.DefaultPrefix,
        required: true,
    }),
    __metadata("design:type", String)
], XmlDsigXPathTransform.prototype, "XPath", void 0);
