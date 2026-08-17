import { __decorate, __metadata } from "tslib";
import { XmlChildElement, XmlElement, XmlBase64Converter } from 'xml-core';
import { Application } from '../../application.js';
import { XmlSignature } from '../xml_names.js';
import { KeyInfoClause } from './key_info_clause.js';
let SPKIData = class SPKIData extends KeyInfoClause {
    async importKey(key) {
        const spki = await Application.crypto.subtle.exportKey('spki', key);
        this.SPKIexp = new Uint8Array(spki);
        this.Key = key;
        return this;
    }
    async exportKey(alg) {
        if (!this.SPKIexp) {
            throw new Error('SPKI data is not defined');
        }
        const key = await Application.crypto.subtle.importKey('spki', this.SPKIexp, alg, true, [
            'verify',
        ]);
        this.Key = key;
        return key;
    }
};
__decorate([
    XmlChildElement({
        localName: XmlSignature.ElementNames.SPKIexp,
        namespaceURI: XmlSignature.NamespaceURI,
        prefix: XmlSignature.DefaultPrefix,
        required: true,
        converter: XmlBase64Converter,
    }),
    __metadata("design:type", Object)
], SPKIData.prototype, "SPKIexp", void 0);
SPKIData = __decorate([
    XmlElement({
        localName: XmlSignature.ElementNames.SPKIData,
    })
], SPKIData);
export { SPKIData };
