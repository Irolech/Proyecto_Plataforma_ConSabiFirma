import { __decorate, __metadata } from "tslib";
import { Convert, XE, XmlAttribute, XmlBase64Converter, XmlChildElement, XmlElement, XmlError, XmlNumberConverter, XmlObject, } from 'xml-core';
import { RSA_PKCS1, RSA_PSS, SHA1, SHA256, SHA384, SHA512 } from '../../algorithms/index.js';
import { Application } from '../../application.js';
import { DigestMethod } from '../digest_method.js';
import { XmlSignature } from '../xml_names.js';
import { KeyInfoClause } from './key_info_clause.js';
const DEFAULT_ALGORITHM = {
    name: 'RSASSA-PKCS1-v1_5',
    hash: {
        name: 'SHA-256',
    },
};
let RsaKeyValue = class RsaKeyValue extends KeyInfoClause {
    constructor() {
        super(...arguments);
        this.key = null;
        this.jwk = null;
        this.keyUsage = [];
    }
    static canImportCryptoKey(key) {
        const name = key.algorithm.name.toUpperCase();
        return name === RSA_PKCS1.toUpperCase() || name === RSA_PSS.toUpperCase();
    }
    async importKey(key) {
        const algName = key.algorithm.name ? key.algorithm.name.toUpperCase() : '';
        if (algName !== RSA_PKCS1.toUpperCase() && algName !== RSA_PSS.toUpperCase()) {
            throw new XmlError(XE.ALGORITHM_WRONG_NAME, key.algorithm.name);
        }
        this.key = key;
        const jwk = await Application.crypto.subtle.exportKey('jwk', key);
        this.jwk = jwk;
        this.Modulus = Convert.FromBase64Url(jwk.n || '');
        this.Exponent = Convert.FromBase64Url(jwk.e || '');
        this.keyUsage = key.usages;
        return this;
    }
    async exportKey(alg = DEFAULT_ALGORITHM) {
        if (this.key) {
            return this.key;
        }
        if (!this.Modulus) {
            throw new XmlError(XE.CRYPTOGRAPHIC, 'RsaKeyValue has no Modulus');
        }
        const modulus = Convert.ToBase64Url(this.Modulus);
        if (!this.Exponent) {
            throw new XmlError(XE.CRYPTOGRAPHIC, 'RsaKeyValue has no Exponent');
        }
        const exponent = Convert.ToBase64Url(this.Exponent);
        let algJwk;
        switch (alg.name.toUpperCase()) {
            case RSA_PKCS1.toUpperCase():
                algJwk = 'R';
                break;
            case RSA_PSS.toUpperCase():
                algJwk = 'P';
                break;
            default:
                throw new XmlError(XE.ALGORITHM_NOT_SUPPORTED, alg.name);
        }
        switch (alg.hash.name.toUpperCase()) {
            case SHA1:
                algJwk += 'S1';
                break;
            case SHA256:
                algJwk += 'S256';
                break;
            case SHA384:
                algJwk += 'S384';
                break;
            case SHA512:
                algJwk += 'S512';
                break;
        }
        const jwk = {
            kty: 'RSA',
            alg: algJwk,
            n: modulus,
            e: exponent,
            ext: true,
        };
        return Application.crypto.subtle.importKey('jwk', jwk, alg, true, this.keyUsage);
    }
    LoadXml(node) {
        super.LoadXml(node);
        this.keyUsage = ['verify'];
    }
};
__decorate([
    XmlChildElement({
        localName: XmlSignature.ElementNames.Modulus,
        prefix: XmlSignature.DefaultPrefix,
        namespaceURI: XmlSignature.NamespaceURI,
        required: true,
        converter: XmlBase64Converter,
    }),
    __metadata("design:type", Object)
], RsaKeyValue.prototype, "Modulus", void 0);
__decorate([
    XmlChildElement({
        localName: XmlSignature.ElementNames.Exponent,
        prefix: XmlSignature.DefaultPrefix,
        namespaceURI: XmlSignature.NamespaceURI,
        required: true,
        converter: XmlBase64Converter,
    }),
    __metadata("design:type", Object)
], RsaKeyValue.prototype, "Exponent", void 0);
RsaKeyValue = __decorate([
    XmlElement({
        localName: XmlSignature.ElementNames.RSAKeyValue,
    })
], RsaKeyValue);
export { RsaKeyValue };
const NAMESPACE_URI = 'http://www.w3.org/2007/05/xmldsig-more#';
const PREFIX = 'pss';
let MaskGenerationFunction = class MaskGenerationFunction extends XmlObject {
};
__decorate([
    XmlChildElement({
        parser: DigestMethod,
    }),
    __metadata("design:type", DigestMethod)
], MaskGenerationFunction.prototype, "DigestMethod", void 0);
__decorate([
    XmlAttribute({
        localName: XmlSignature.AttributeNames.Algorithm,
        defaultValue: 'http://www.w3.org/2007/05/xmldsig-more#MGF1',
    }),
    __metadata("design:type", String)
], MaskGenerationFunction.prototype, "Algorithm", void 0);
MaskGenerationFunction = __decorate([
    XmlElement({
        localName: XmlSignature.ElementNames.MaskGenerationFunction,
        prefix: PREFIX,
        namespaceURI: NAMESPACE_URI,
    })
], MaskGenerationFunction);
export { MaskGenerationFunction };
let PssAlgorithmParams = class PssAlgorithmParams extends XmlObject {
};
__decorate([
    XmlChildElement({
        parser: DigestMethod,
    }),
    __metadata("design:type", DigestMethod)
], PssAlgorithmParams.prototype, "DigestMethod", void 0);
__decorate([
    XmlChildElement({
        parser: MaskGenerationFunction,
    }),
    __metadata("design:type", MaskGenerationFunction)
], PssAlgorithmParams.prototype, "MGF", void 0);
__decorate([
    XmlChildElement({
        converter: XmlNumberConverter,
        prefix: PREFIX,
        namespaceURI: NAMESPACE_URI,
    }),
    __metadata("design:type", Number)
], PssAlgorithmParams.prototype, "SaltLength", void 0);
__decorate([
    XmlChildElement({
        converter: XmlNumberConverter,
    }),
    __metadata("design:type", Number)
], PssAlgorithmParams.prototype, "TrailerField", void 0);
PssAlgorithmParams = __decorate([
    XmlElement({
        localName: XmlSignature.ElementNames.RSAPSSParams,
        prefix: PREFIX,
        namespaceURI: NAMESPACE_URI,
    })
], PssAlgorithmParams);
export { PssAlgorithmParams };
