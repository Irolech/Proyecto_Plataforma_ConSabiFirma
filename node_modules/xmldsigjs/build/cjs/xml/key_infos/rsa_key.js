"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PssAlgorithmParams = exports.MaskGenerationFunction = exports.RsaKeyValue = void 0;
const tslib_1 = require("tslib");
const xml_core_1 = require("xml-core");
const index_js_1 = require("../../algorithms/index.js");
const application_js_1 = require("../../application.js");
const digest_method_js_1 = require("../digest_method.js");
const xml_names_js_1 = require("../xml_names.js");
const key_info_clause_js_1 = require("./key_info_clause.js");
const DEFAULT_ALGORITHM = {
    name: 'RSASSA-PKCS1-v1_5',
    hash: {
        name: 'SHA-256',
    },
};
let RsaKeyValue = class RsaKeyValue extends key_info_clause_js_1.KeyInfoClause {
    constructor() {
        super(...arguments);
        this.key = null;
        this.jwk = null;
        this.keyUsage = [];
    }
    static canImportCryptoKey(key) {
        const name = key.algorithm.name.toUpperCase();
        return name === index_js_1.RSA_PKCS1.toUpperCase() || name === index_js_1.RSA_PSS.toUpperCase();
    }
    async importKey(key) {
        const algName = key.algorithm.name ? key.algorithm.name.toUpperCase() : '';
        if (algName !== index_js_1.RSA_PKCS1.toUpperCase() && algName !== index_js_1.RSA_PSS.toUpperCase()) {
            throw new xml_core_1.XmlError(xml_core_1.XE.ALGORITHM_WRONG_NAME, key.algorithm.name);
        }
        this.key = key;
        const jwk = await application_js_1.Application.crypto.subtle.exportKey('jwk', key);
        this.jwk = jwk;
        this.Modulus = xml_core_1.Convert.FromBase64Url(jwk.n || '');
        this.Exponent = xml_core_1.Convert.FromBase64Url(jwk.e || '');
        this.keyUsage = key.usages;
        return this;
    }
    async exportKey(alg = DEFAULT_ALGORITHM) {
        if (this.key) {
            return this.key;
        }
        if (!this.Modulus) {
            throw new xml_core_1.XmlError(xml_core_1.XE.CRYPTOGRAPHIC, 'RsaKeyValue has no Modulus');
        }
        const modulus = xml_core_1.Convert.ToBase64Url(this.Modulus);
        if (!this.Exponent) {
            throw new xml_core_1.XmlError(xml_core_1.XE.CRYPTOGRAPHIC, 'RsaKeyValue has no Exponent');
        }
        const exponent = xml_core_1.Convert.ToBase64Url(this.Exponent);
        let algJwk;
        switch (alg.name.toUpperCase()) {
            case index_js_1.RSA_PKCS1.toUpperCase():
                algJwk = 'R';
                break;
            case index_js_1.RSA_PSS.toUpperCase():
                algJwk = 'P';
                break;
            default:
                throw new xml_core_1.XmlError(xml_core_1.XE.ALGORITHM_NOT_SUPPORTED, alg.name);
        }
        switch (alg.hash.name.toUpperCase()) {
            case index_js_1.SHA1:
                algJwk += 'S1';
                break;
            case index_js_1.SHA256:
                algJwk += 'S256';
                break;
            case index_js_1.SHA384:
                algJwk += 'S384';
                break;
            case index_js_1.SHA512:
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
        return application_js_1.Application.crypto.subtle.importKey('jwk', jwk, alg, true, this.keyUsage);
    }
    LoadXml(node) {
        super.LoadXml(node);
        this.keyUsage = ['verify'];
    }
};
exports.RsaKeyValue = RsaKeyValue;
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        localName: xml_names_js_1.XmlSignature.ElementNames.Modulus,
        prefix: xml_names_js_1.XmlSignature.DefaultPrefix,
        namespaceURI: xml_names_js_1.XmlSignature.NamespaceURI,
        required: true,
        converter: xml_core_1.XmlBase64Converter,
    }),
    tslib_1.__metadata("design:type", Object)
], RsaKeyValue.prototype, "Modulus", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        localName: xml_names_js_1.XmlSignature.ElementNames.Exponent,
        prefix: xml_names_js_1.XmlSignature.DefaultPrefix,
        namespaceURI: xml_names_js_1.XmlSignature.NamespaceURI,
        required: true,
        converter: xml_core_1.XmlBase64Converter,
    }),
    tslib_1.__metadata("design:type", Object)
], RsaKeyValue.prototype, "Exponent", void 0);
exports.RsaKeyValue = RsaKeyValue = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: xml_names_js_1.XmlSignature.ElementNames.RSAKeyValue,
    })
], RsaKeyValue);
const NAMESPACE_URI = 'http://www.w3.org/2007/05/xmldsig-more#';
const PREFIX = 'pss';
let MaskGenerationFunction = class MaskGenerationFunction extends xml_core_1.XmlObject {
};
exports.MaskGenerationFunction = MaskGenerationFunction;
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        parser: digest_method_js_1.DigestMethod,
    }),
    tslib_1.__metadata("design:type", digest_method_js_1.DigestMethod)
], MaskGenerationFunction.prototype, "DigestMethod", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlAttribute)({
        localName: xml_names_js_1.XmlSignature.AttributeNames.Algorithm,
        defaultValue: 'http://www.w3.org/2007/05/xmldsig-more#MGF1',
    }),
    tslib_1.__metadata("design:type", String)
], MaskGenerationFunction.prototype, "Algorithm", void 0);
exports.MaskGenerationFunction = MaskGenerationFunction = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: xml_names_js_1.XmlSignature.ElementNames.MaskGenerationFunction,
        prefix: PREFIX,
        namespaceURI: NAMESPACE_URI,
    })
], MaskGenerationFunction);
let PssAlgorithmParams = class PssAlgorithmParams extends xml_core_1.XmlObject {
};
exports.PssAlgorithmParams = PssAlgorithmParams;
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        parser: digest_method_js_1.DigestMethod,
    }),
    tslib_1.__metadata("design:type", digest_method_js_1.DigestMethod)
], PssAlgorithmParams.prototype, "DigestMethod", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        parser: MaskGenerationFunction,
    }),
    tslib_1.__metadata("design:type", MaskGenerationFunction)
], PssAlgorithmParams.prototype, "MGF", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        converter: xml_core_1.XmlNumberConverter,
        prefix: PREFIX,
        namespaceURI: NAMESPACE_URI,
    }),
    tslib_1.__metadata("design:type", Number)
], PssAlgorithmParams.prototype, "SaltLength", void 0);
tslib_1.__decorate([
    (0, xml_core_1.XmlChildElement)({
        converter: xml_core_1.XmlNumberConverter,
    }),
    tslib_1.__metadata("design:type", Number)
], PssAlgorithmParams.prototype, "TrailerField", void 0);
exports.PssAlgorithmParams = PssAlgorithmParams = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: xml_names_js_1.XmlSignature.ElementNames.RSAPSSParams,
        prefix: PREFIX,
        namespaceURI: NAMESPACE_URI,
    })
], PssAlgorithmParams);
