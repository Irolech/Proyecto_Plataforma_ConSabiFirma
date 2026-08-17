import { __decorate, __metadata } from "tslib";
import { XmlAttribute, XmlElement } from 'xml-core';
import { XmlSignature } from './xml_names.js';
import { XmlSignatureCollection, XmlSignatureObject } from './xml_object.js';
let DataObject = class DataObject extends XmlSignatureObject {
};
__decorate([
    XmlAttribute({
        localName: XmlSignature.AttributeNames.Id,
        defaultValue: '',
    }),
    __metadata("design:type", String)
], DataObject.prototype, "Id", void 0);
__decorate([
    XmlAttribute({
        localName: XmlSignature.AttributeNames.MimeType,
        defaultValue: '',
    }),
    __metadata("design:type", String)
], DataObject.prototype, "MimeType", void 0);
__decorate([
    XmlAttribute({
        localName: XmlSignature.AttributeNames.Encoding,
        defaultValue: '',
    }),
    __metadata("design:type", String)
], DataObject.prototype, "Encoding", void 0);
DataObject = __decorate([
    XmlElement({
        localName: XmlSignature.ElementNames.Object,
    })
], DataObject);
export { DataObject };
let DataObjects = class DataObjects extends XmlSignatureCollection {
};
DataObjects = __decorate([
    XmlElement({
        localName: 'xmldsig_objects',
        parser: DataObject,
    })
], DataObjects);
export { DataObjects };
