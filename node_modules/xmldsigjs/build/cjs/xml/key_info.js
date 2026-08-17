"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyInfo = void 0;
const tslib_1 = require("tslib");
const xml_core_1 = require("xml-core");
const index_js_1 = require("./key_infos/index.js");
const xml_names_js_1 = require("./xml_names.js");
const xml_object_js_1 = require("./xml_object.js");
let KeyInfo = class KeyInfo extends xml_object_js_1.XmlSignatureCollection {
    OnLoadXml(element) {
        for (let i = 0; i < element.childNodes.length; i++) {
            const node = element.childNodes.item(i);
            if (node.nodeType !== xml_core_1.XmlNodeType.Element) {
                continue;
            }
            let KeyInfoClass = null;
            switch (node.localName) {
                case xml_names_js_1.XmlSignature.ElementNames.KeyValue:
                    KeyInfoClass = index_js_1.KeyValue;
                    break;
                case xml_names_js_1.XmlSignature.ElementNames.X509Data:
                    KeyInfoClass = index_js_1.KeyInfoX509Data;
                    break;
                case xml_names_js_1.XmlSignature.ElementNames.SPKIData:
                    KeyInfoClass = index_js_1.SPKIData;
                    break;
                case xml_names_js_1.XmlSignature.ElementNames.KeyName:
                case xml_names_js_1.XmlSignature.ElementNames.RetrievalMethod:
                case xml_names_js_1.XmlSignature.ElementNames.PGPData:
                case xml_names_js_1.XmlSignature.ElementNames.MgmtData:
            }
            if (KeyInfoClass) {
                const item = new KeyInfoClass();
                item.LoadXml(node);
                this.Add(item);
            }
        }
    }
};
exports.KeyInfo = KeyInfo;
tslib_1.__decorate([
    (0, xml_core_1.XmlAttribute)({
        localName: xml_names_js_1.XmlSignature.AttributeNames.Id,
        defaultValue: '',
    }),
    tslib_1.__metadata("design:type", String)
], KeyInfo.prototype, "Id", void 0);
exports.KeyInfo = KeyInfo = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: xml_names_js_1.XmlSignature.ElementNames.KeyInfo,
    })
], KeyInfo);
