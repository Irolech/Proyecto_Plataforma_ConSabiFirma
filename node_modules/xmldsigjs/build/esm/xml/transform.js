import { __decorate, __metadata } from "tslib";
import { XE, XmlError, XmlAttribute, XmlChildElement, XmlElement, } from 'xml-core';
import { XmlSignature } from './xml_names.js';
import { XmlSignatureObject } from './xml_object.js';
let Transform = class Transform extends XmlSignatureObject {
    constructor() {
        super(...arguments);
        this.innerXml = null;
    }
    GetOutput() {
        throw new XmlError(XE.METHOD_NOT_IMPLEMENTED);
    }
    LoadInnerXml(node) {
        if (!node) {
            throw new XmlError(XE.PARAM_REQUIRED, 'node');
        }
        this.innerXml = node;
    }
    GetInnerXml() {
        return this.innerXml;
    }
};
__decorate([
    XmlAttribute({
        localName: XmlSignature.AttributeNames.Algorithm,
        defaultValue: '',
    }),
    __metadata("design:type", String)
], Transform.prototype, "Algorithm", void 0);
__decorate([
    XmlChildElement({
        localName: XmlSignature.ElementNames.XPath,
        defaultValue: '',
    }),
    __metadata("design:type", String)
], Transform.prototype, "XPath", void 0);
Transform = __decorate([
    XmlElement({
        localName: XmlSignature.ElementNames.Transform,
    })
], Transform);
export { Transform };
