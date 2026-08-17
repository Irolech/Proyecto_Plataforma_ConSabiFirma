"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPKIData = void 0;
const tslib_1 = require("tslib");
const xml_core_1 = require("xml-core");
const application_js_1 = require("../../application.js");
const xml_names_js_1 = require("../xml_names.js");
const key_info_clause_js_1 = require("./key_info_clause.js");
let SPKIData = class SPKIData extends key_info_clause_js_1.KeyInfoClause {
    async importKey(key) {
        const spki = await application_js_1.Application.crypto.subtle.exportKey('spki', key);
        this.SPKIexp = new Uint8Array(spki);
        this.Key = key;
        return this;
    }
    async exportKey(alg) {
        if (!this.SPKIexp) {
            throw new Error('SPKI data is not defined');
        }
        const key = await application_js_1.Application.crypto.subtle.importKey('spki', this.SPKIexp, alg, true, [
            'verify',
        ]);
        this.Key = key;
        return key;
    }
};
exports.SPKIData = SPKIData;
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        localName: xml_names_js_1.XmlSignature.ElementNames.SPKIexp,
        namespaceURI: xml_names_js_1.XmlSignature.NamespaceURI,
        prefix: xml_names_js_1.XmlSignature.DefaultPrefix,
        required: true,
        converter: xml_core_1.XmlBase64Converter,
    }),
    tslib_1.__metadata("design:type", Object)
], SPKIData.prototype, "SPKIexp", void 0);
exports.SPKIData = SPKIData = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: xml_names_js_1.XmlSignature.ElementNames.SPKIData,
    })
], SPKIData);
