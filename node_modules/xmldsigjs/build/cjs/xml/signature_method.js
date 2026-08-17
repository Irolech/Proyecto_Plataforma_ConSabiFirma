"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignatureMethod = exports.SignatureMethodOther = void 0;
const tslib_1 = require("tslib");
const XmlCore = tslib_1.__importStar(require("xml-core"));
const xml_core_1 = require("xml-core");
const rsa_key_js_1 = require("./key_infos/rsa_key.js");
const xml_names_js_1 = require("./xml_names.js");
const xml_object_js_1 = require("./xml_object.js");
let SignatureMethodOther = class SignatureMethodOther extends xml_object_js_1.XmlSignatureCollection {
    OnLoadXml(element) {
        for (let i = 0; i < element.childNodes.length; i++) {
            const node = element.childNodes.item(i);
            if (node.nodeType !== XmlCore.XmlNodeType.Element ||
                node.nodeName === xml_names_js_1.XmlSignature.ElementNames.HMACOutputLength) {
                continue;
            }
            let ParserClass;
            switch (node.localName) {
                case xml_names_js_1.XmlSignature.ElementNames.RSAPSSParams:
                    ParserClass = rsa_key_js_1.PssAlgorithmParams;
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
exports.SignatureMethodOther = SignatureMethodOther;
exports.SignatureMethodOther = SignatureMethodOther = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: 'Other',
    })
], SignatureMethodOther);
let SignatureMethod = class SignatureMethod extends xml_object_js_1.XmlSignatureObject {
};
exports.SignatureMethod = SignatureMethod;
tslib_1.__decorate([
    (0, xml_core_1.XmlAttribute)({
        localName: xml_names_js_1.XmlSignature.AttributeNames.Algorithm,
        required: true,
        defaultValue: '',
    }),
    tslib_1.__metadata("design:type", String)
], SignatureMethod.prototype, "Algorithm", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        localName: xml_names_js_1.XmlSignature.ElementNames.HMACOutputLength,
        namespaceURI: xml_names_js_1.XmlSignature.NamespaceURI,
        prefix: xml_names_js_1.XmlSignature.DefaultPrefix,
        converter: xml_core_1.XmlNumberConverter,
    }),
    tslib_1.__metadata("design:type", Number)
], SignatureMethod.prototype, "HMACOutputLength", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        parser: SignatureMethodOther,
        noRoot: true,
        minOccurs: 0,
    }),
    tslib_1.__metadata("design:type", SignatureMethodOther)
], SignatureMethod.prototype, "Any", void 0);
exports.SignatureMethod = SignatureMethod = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: xml_names_js_1.XmlSignature.ElementNames.SignatureMethod,
    })
], SignatureMethod);
