import { __decorate, __metadata } from "tslib";
import { XmlNodeType, XmlAttribute, XmlElement } from 'xml-core';
import { KeyInfoX509Data, KeyValue, SPKIData } from './key_infos/index.js';
import { XmlSignature } from './xml_names.js';
import { XmlSignatureCollection } from './xml_object.js';
let KeyInfo = class KeyInfo extends XmlSignatureCollection {
    OnLoadXml(element) {
        for (let i = 0; i < element.childNodes.length; i++) {
            const node = element.childNodes.item(i);
            if (node.nodeType !== XmlNodeType.Element) {
                continue;
            }
            let KeyInfoClass = null;
            switch (node.localName) {
                case XmlSignature.ElementNames.KeyValue:
                    KeyInfoClass = KeyValue;
                    break;
                case XmlSignature.ElementNames.X509Data:
                    KeyInfoClass = KeyInfoX509Data;
                    break;
                case XmlSignature.ElementNames.SPKIData:
                    KeyInfoClass = SPKIData;
                    break;
                case XmlSignature.ElementNames.KeyName:
                case XmlSignature.ElementNames.RetrievalMethod:
                case XmlSignature.ElementNames.PGPData:
                case XmlSignature.ElementNames.MgmtData:
            }
            if (KeyInfoClass) {
                const item = new KeyInfoClass();
                item.LoadXml(node);
                this.Add(item);
            }
        }
    }
};
__decorate([
    XmlAttribute({
        localName: XmlSignature.AttributeNames.Id,
        defaultValue: '',
    }),
    __metadata("design:type", String)
], KeyInfo.prototype, "Id", void 0);
KeyInfo = __decorate([
    XmlElement({
        localName: XmlSignature.ElementNames.KeyInfo,
    })
], KeyInfo);
export { KeyInfo };
