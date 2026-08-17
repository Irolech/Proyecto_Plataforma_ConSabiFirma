import { __decorate, __metadata } from "tslib";
import { XE, XmlError, Convert, XmlBase64Converter, XmlAttribute, XmlChildElement, XmlElement, XmlObject, } from 'xml-core';
import { Application } from '../../application.js';
import { ECDSA } from '../../algorithms/ecdsa_sign.js';
import { XmlSignature } from '../index.js';
import { KeyInfoClause } from './key_info_clause.js';
const NAMESPACE_URI = 'http://www.w3.org/2001/04/xmldsig-more#';
const PREFIX = 'ecdsa';
let EcdsaPublicKey = class EcdsaPublicKey extends XmlObject {
};
__decorate([
    XmlChildElement({
        localName: XmlSignature.ElementNames.X,
        namespaceURI: NAMESPACE_URI,
        prefix: PREFIX,
        required: true,
        converter: XmlBase64Converter,
    }),
    __metadata("design:type", Uint8Array)
], EcdsaPublicKey.prototype, "X", void 0);
__decorate([
    XmlChildElement({
        localName: XmlSignature.ElementNames.Y,
        namespaceURI: NAMESPACE_URI,
        prefix: PREFIX,
        required: true,
        converter: XmlBase64Converter,
    }),
    __metadata("design:type", Uint8Array)
], EcdsaPublicKey.prototype, "Y", void 0);
EcdsaPublicKey = __decorate([
    XmlElement({
        localName: XmlSignature.ElementNames.PublicKey,
        namespaceURI: NAMESPACE_URI,
        prefix: PREFIX,
    })
], EcdsaPublicKey);
export { EcdsaPublicKey };
let NamedCurve = class NamedCurve extends XmlObject {
};
__decorate([
    XmlAttribute({
        localName: XmlSignature.AttributeNames.URI,
        required: true,
    }),
    __metadata("design:type", String)
], NamedCurve.prototype, "Uri", void 0);
NamedCurve = __decorate([
    XmlElement({
        localName: XmlSignature.ElementNames.NamedCurve,
        namespaceURI: NAMESPACE_URI,
        prefix: PREFIX,
    })
], NamedCurve);
export { NamedCurve };
let DomainParameters = class DomainParameters extends XmlObject {
};
__decorate([
    XmlChildElement({
        parser: NamedCurve,
    }),
    __metadata("design:type", NamedCurve)
], DomainParameters.prototype, "NamedCurve", void 0);
DomainParameters = __decorate([
    XmlElement({
        localName: XmlSignature.ElementNames.DomainParameters,
        namespaceURI: NAMESPACE_URI,
        prefix: PREFIX,
    })
], DomainParameters);
export { DomainParameters };
let EcdsaKeyValue = class EcdsaKeyValue extends KeyInfoClause {
    constructor() {
        super(...arguments);
        this.name = XmlSignature.ElementNames.ECDSAKeyValue;
        this.key = null;
        this.jwk = null;
        this.keyUsage = null;
    }
    static canImportCryptoKey(key) {
        const name = key.algorithm.name.toUpperCase();
        return name === ECDSA.toUpperCase();
    }
    get NamedCurve() {
        return GetNamedCurveOid(this.DomainParameters.NamedCurve.Uri);
    }
    async importKey(key) {
        if (!key.algorithm.name || key.algorithm.name.toUpperCase() !== 'ECDSA') {
            throw new XmlError(XE.ALGORITHM_WRONG_NAME, key.algorithm.name);
        }
        const jwk = await Application.crypto.subtle.exportKey('jwk', key);
        this.key = key;
        this.jwk = jwk;
        this.PublicKey = new EcdsaPublicKey();
        this.PublicKey.X = Convert.FromString(jwk.x || '', 'base64url');
        this.PublicKey.Y = Convert.FromString(jwk.y || '', 'base64url');
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
        const x = Convert.ToBase64Url(this.PublicKey.X);
        const y = Convert.ToBase64Url(this.PublicKey.Y);
        const crv = GetNamedCurveFromOid(this.DomainParameters.NamedCurve.Uri);
        const jwk = {
            kty: 'EC',
            crv: crv,
            x,
            y,
            ext: true,
        };
        this.keyUsage = ['verify'];
        const key = await Application.crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: crv }, true, this.keyUsage);
        this.key = key;
        return this.key;
    }
};
__decorate([
    XmlChildElement({
        parser: DomainParameters,
    }),
    __metadata("design:type", DomainParameters)
], EcdsaKeyValue.prototype, "DomainParameters", void 0);
__decorate([
    XmlChildElement({
        parser: EcdsaPublicKey,
        required: true,
    }),
    __metadata("design:type", EcdsaPublicKey)
], EcdsaKeyValue.prototype, "PublicKey", void 0);
EcdsaKeyValue = __decorate([
    XmlElement({
        localName: XmlSignature.ElementNames.ECDSAKeyValue,
        namespaceURI: NAMESPACE_URI,
        prefix: PREFIX,
    })
], EcdsaKeyValue);
export { EcdsaKeyValue };
function GetNamedCurveOid(namedCurve) {
    switch (namedCurve) {
        case 'P-256':
            return 'urn:oid:1.2.840.10045.3.1.7';
        case 'P-384':
            return 'urn:oid:1.3.132.0.34';
        case 'P-521':
            return 'urn:oid:1.3.132.0.35';
    }
    throw new XmlError(XE.CRYPTOGRAPHIC, 'Unknown NamedCurve');
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
    throw new XmlError(XE.CRYPTOGRAPHIC, 'Unknown NamedCurve OID');
}
