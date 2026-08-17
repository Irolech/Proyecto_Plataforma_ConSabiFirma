"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EcdsaKeyValue = exports.DomainParameters = exports.NamedCurve = exports.EcdsaPublicKey = void 0;
const tslib_1 = require("tslib");
const xml_core_1 = require("xml-core");
const application_js_1 = require("../../application.js");
const ecdsa_sign_js_1 = require("../../algorithms/ecdsa_sign.js");
const index_js_1 = require("../index.js");
const key_info_clause_js_1 = require("./key_info_clause.js");
const NAMESPACE_URI = 'http://www.w3.org/2001/04/xmldsig-more#';
const PREFIX = 'ecdsa';
let EcdsaPublicKey = class EcdsaPublicKey extends xml_core_1.XmlObject {
};
exports.EcdsaPublicKey = EcdsaPublicKey;
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        localName: index_js_1.XmlSignature.ElementNames.X,
        namespaceURI: NAMESPACE_URI,
        prefix: PREFIX,
        required: true,
        converter: xml_core_1.XmlBase64Converter,
    }),
    tslib_1.__metadata("design:type", Uint8Array)
], EcdsaPublicKey.prototype, "X", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        localName: index_js_1.XmlSignature.ElementNames.Y,
        namespaceURI: NAMESPACE_URI,
        prefix: PREFIX,
        required: true,
        converter: xml_core_1.XmlBase64Converter,
    }),
    tslib_1.__metadata("design:type", Uint8Array)
], EcdsaPublicKey.prototype, "Y", void 0);
exports.EcdsaPublicKey = EcdsaPublicKey = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: index_js_1.XmlSignature.ElementNames.PublicKey,
        namespaceURI: NAMESPACE_URI,
        prefix: PREFIX,
    })
], EcdsaPublicKey);
let NamedCurve = class NamedCurve extends xml_core_1.XmlObject {
};
exports.NamedCurve = NamedCurve;
tslib_1.__decorate([
    (0, xml_core_1.XmlAttribute)({
        localName: index_js_1.XmlSignature.AttributeNames.URI,
        required: true,
    }),
    tslib_1.__metadata("design:type", String)
], NamedCurve.prototype, "Uri", void 0);
exports.NamedCurve = NamedCurve = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: index_js_1.XmlSignature.ElementNames.NamedCurve,
        namespaceURI: NAMESPACE_URI,
        prefix: PREFIX,
    })
], NamedCurve);
let DomainParameters = class DomainParameters extends xml_core_1.XmlObject {
};
exports.DomainParameters = DomainParameters;
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        parser: NamedCurve,
    }),
    tslib_1.__metadata("design:type", NamedCurve)
], DomainParameters.prototype, "NamedCurve", void 0);
exports.DomainParameters = DomainParameters = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: index_js_1.XmlSignature.ElementNames.DomainParameters,
        namespaceURI: NAMESPACE_URI,
        prefix: PREFIX,
    })
], DomainParameters);
let EcdsaKeyValue = class EcdsaKeyValue extends key_info_clause_js_1.KeyInfoClause {
    constructor() {
        super(...arguments);
        this.name = index_js_1.XmlSignature.ElementNames.ECDSAKeyValue;
        this.key = null;
        this.jwk = null;
        this.keyUsage = null;
    }
    static canImportCryptoKey(key) {
        const name = key.algorithm.name.toUpperCase();
        return name === ecdsa_sign_js_1.ECDSA.toUpperCase();
    }
    get NamedCurve() {
        return GetNamedCurveOid(this.DomainParameters.NamedCurve.Uri);
    }
    async importKey(key) {
        if (!key.algorithm.name || key.algorithm.name.toUpperCase() !== 'ECDSA') {
            throw new xml_core_1.XmlError(xml_core_1.XE.ALGORITHM_WRONG_NAME, key.algorithm.name);
        }
        const jwk = await application_js_1.Application.crypto.subtle.exportKey('jwk', key);
        this.key = key;
        this.jwk = jwk;
        this.PublicKey = new EcdsaPublicKey();
        this.PublicKey.X = xml_core_1.Convert.FromString(jwk.x || '', 'base64url');
        this.PublicKey.Y = xml_core_1.Convert.FromString(jwk.y || '', 'base64url');
        if (!this.DomainParameters) {
            this.DomainParameters = new DomainParameters();
        }
        if (!this.DomainParameters.NamedCurve) {
            this.DomainParameters.NamedCurve = new NamedCurve();
        }
        this.DomainParameters.NamedCurve.Uri = GetNamedCurveOid((jwk.crv || ''));
        this.keyUsage = key.usages;
        return this;
    }
    async exportKey(_alg) {
        if (this.key) {
            return this.key;
        }
        const x = xml_core_1.Convert.ToBase64Url(this.PublicKey.X);
        const y = xml_core_1.Convert.ToBase64Url(this.PublicKey.Y);
        const crv = GetNamedCurveFromOid(this.DomainParameters.NamedCurve.Uri);
        const jwk = {
            kty: 'EC',
            crv: crv,
            x,
            y,
            ext: true,
        };
        this.keyUsage = ['verify'];
        const key = await application_js_1.Application.crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: crv }, true, this.keyUsage);
        this.key = key;
        return this.key;
    }
};
exports.EcdsaKeyValue = EcdsaKeyValue;
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        parser: DomainParameters,
    }),
    tslib_1.__metadata("design:type", DomainParameters)
], EcdsaKeyValue.prototype, "DomainParameters", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        parser: EcdsaPublicKey,
        required: true,
    }),
    tslib_1.__metadata("design:type", EcdsaPublicKey)
], EcdsaKeyValue.prototype, "PublicKey", void 0);
exports.EcdsaKeyValue = EcdsaKeyValue = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: index_js_1.XmlSignature.ElementNames.ECDSAKeyValue,
        namespaceURI: NAMESPACE_URI,
        prefix: PREFIX,
    })
], EcdsaKeyValue);
function GetNamedCurveOid(namedCurve) {
    switch (namedCurve) {
        case 'P-256':
            return 'urn:oid:1.2.840.10045.3.1.7';
        case 'P-384':
            return 'urn:oid:1.3.132.0.34';
        case 'P-521':
            return 'urn:oid:1.3.132.0.35';
    }
    throw new xml_core_1.XmlError(xml_core_1.XE.CRYPTOGRAPHIC, 'Unknown NamedCurve');
}
function GetNamedCurveFromOid(oid) {
    switch (oid) {
        case 'urn:oid:1.2.840.10045.3.1.7':
            return 'P-256';
        case 'urn:oid:1.3.132.0.34':
            return 'P-384';
        case 'urn:oid:1.3.132.0.35':
            return 'P-521';
    }
    throw new xml_core_1.XmlError(xml_core_1.XE.CRYPTOGRAPHIC, 'Unknown NamedCurve OID');
}
