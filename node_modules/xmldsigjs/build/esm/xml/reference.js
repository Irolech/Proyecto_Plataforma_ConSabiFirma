import { __decorate, __metadata } from "tslib";
import { XmlAttribute, XmlBase64Converter, XmlChildElement, XmlElement } from 'xml-core';
import { DigestMethod } from './digest_method.js';
import { Transforms } from './transform_collection.js';
import { XmlSignature } from './xml_names.js';
import { XmlSignatureCollection, XmlSignatureObject } from './xml_object.js';
let Reference = class Reference extends XmlSignatureObject {
    constructor(uri) {
        super();
        this.DigestMethod = new DigestMethod();
        if (uri) {
            this.Uri = uri;
        }
    }
};
__decorate([
    XmlAttribute({
        defaultValue: '',
    }),
    __metadata("design:type", String)
], Reference.prototype, "Id", void 0);
__decorate([
    XmlAttribute({
        localName: XmlSignature.AttributeNames.URI,
    }),
    __metadata("design:type", String)
], Reference.prototype, "Uri", void 0);
__decorate([
    XmlAttribute({
        localName: XmlSignature.AttributeNames.Type,
        defaultValue: '',
    }),
    __metadata("design:type", String)
], Reference.prototype, "Type", void 0);
__decorate([
    XmlChildElement({
        parser: Transforms,
    }),
    __metadata("design:type", Transforms)
], Reference.prototype, "Transforms", void 0);
__decorate([
    XmlChildElement({
        required: true,
        parser: DigestMethod,
    }),
    __metadata("design:type", DigestMethod)
], Reference.prototype, "DigestMethod", void 0);
__decorate([
    XmlChildElement({
        required: true,
        localName: XmlSignature.ElementNames.DigestValue,
        namespaceURI: XmlSignature.NamespaceURI,
        prefix: XmlSignature.DefaultPrefix,
        converter: XmlBase64Converter,
    }),
    __metadata("design:type", Uint8Array)
], Reference.prototype, "DigestValue", void 0);
Reference = __decorate([
    XmlElement({
        localName: XmlSignature.ElementNames.Reference,
    }),
    __metadata("design:paramtypes", [String])
], Reference);
export { Reference };
let References = class References extends XmlSignatureCollection {
};
References = __decorate([
    XmlElement({
        localName: 'References',
        parser: Reference,
    })
], References);
export { References };
