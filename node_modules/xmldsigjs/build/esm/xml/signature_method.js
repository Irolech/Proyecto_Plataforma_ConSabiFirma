import { __decorate, __metadata } from "tslib";
import * as XmlCore from 'xml-core';
import { XmlAttribute, XmlChildElement, XmlElement, XmlNumberConverter } from 'xml-core';
import { PssAlgorithmParams } from './key_infos/rsa_key.js';
import { XmlSignature } from './xml_names.js';
import { XmlSignatureCollection, XmlSignatureObject } from './xml_object.js';
let SignatureMethodOther = class SignatureMethodOther extends XmlSignatureCollection {
    OnLoadXml(element) {
        for (let i = 0; i < element.childNodes.length; i++) {
            const node = element.childNodes.item(i);
            if (node.nodeType !== XmlCore.XmlNodeType.Element ||
                node.nodeName === XmlSignature.ElementNames.HMACOutputLength) {
                continue;
            }
            let ParserClass;
            switch (node.localName) {
                case XmlSignature.ElementNames.RSAPSSParams:
                    ParserClass = PssAlgorithmParams;
                    break;
                default:
                    break;
            }
            if (ParserClass) {
                const xml = new ParserClass();
                xml.LoadXml(node);
                this.Add(xml);
            }
        }
    }
};
SignatureMethodOther = __decorate([
    XmlElement({
        localName: 'Other',
    })
], SignatureMethodOther);
export { SignatureMethodOther };
let SignatureMethod = class SignatureMethod extends XmlSignatureObject {
};
__decorate([
    XmlAttribute({
        localName: XmlSignature.AttributeNames.Algorithm,
        required: true,
        defaultValue: '',
    }),
    __metadata("design:type", String)
], SignatureMethod.prototype, "Algorithm", void 0);
__decorate([
    XmlChildElement({
        localName: XmlSignature.ElementNames.HMACOutputLength,
        namespaceURI: XmlSignature.NamespaceURI,
        prefix: XmlSignature.DefaultPrefix,
        converter: XmlNumberConverter,
    }),
    __metadata("design:type", Number)
], SignatureMethod.prototype, "HMACOutputLength", void 0);
__decorate([
    XmlChildElement({
        parser: SignatureMethodOther,
        noRoot: true,
        minOccurs: 0,
    }),
    __metadata("design:type", SignatureMethodOther)
], SignatureMethod.prototype, "Any", void 0);
SignatureMethod = __decorate([
    XmlElement({
        localName: XmlSignature.ElementNames.SignatureMethod,
    })
], SignatureMethod);
export { SignatureMethod };
