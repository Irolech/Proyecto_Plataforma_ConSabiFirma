"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RsaPssWithParams = exports.RSA_PSS_WITH_PARAMS_NAMESPACE = exports.RSA_PSS = void 0;
const xml_core_1 = require("xml-core");
const algorithm_js_1 = require("../algorithm.js");
const rsa_key_js_1 = require("../xml/key_infos/rsa_key.js");
const rsa_hash_js_1 = require("./rsa_hash.js");
exports.RSA_PSS = 'RSA-PSS';
exports.RSA_PSS_WITH_PARAMS_NAMESPACE = 'http://www.w3.org/2007/05/xmldsig-more#rsa-pss';
class RsaPssWithParams extends algorithm_js_1.SignatureAlgorithm {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: exports.RSA_PSS,
            hash: {
                name: rsa_hash_js_1.SHA1,
            },
        };
        this.namespaceURI = exports.RSA_PSS_WITH_PARAMS_NAMESPACE;
    }
    static fromAlgorithm(alg) {
        let rsaPssAlgorithm = null;
        if (alg.name.toUpperCase() === exports.RSA_PSS.toUpperCase()) {
            switch (alg.hash.name.toUpperCase()) {
                case rsa_hash_js_1.SHA1:
                    rsaPssAlgorithm = new RsaPssWithParams();
                    break;
                case rsa_hash_js_1.SHA256:
                    rsaPssAlgorithm = new RsaPssWithParams();
                    break;
                case rsa_hash_js_1.SHA384:
                    rsaPssAlgorithm = new RsaPssWithParams();
                    break;
                case rsa_hash_js_1.SHA512:
                    rsaPssAlgorithm = new RsaPssWithParams();
                    break;
            }
            if (rsaPssAlgorithm) {
                rsaPssAlgorithm.algorithm.hash.name = alg.hash.name;
                if (alg.saltLength) {
                    rsaPssAlgorithm.algorithm.saltLength = alg.saltLength;
                }
                return rsaPssAlgorithm;
            }
        }
        return null;
    }
    fromMethod(method) {
        if (!method.Any.Some((item) => {
            if (item instanceof rsa_key_js_1.PssAlgorithmParams) {
                switch (item.DigestMethod.Algorithm.toLowerCase()) {
                    case rsa_hash_js_1.SHA1_NAMESPACE:
                        this.algorithm.hash.name = rsa_hash_js_1.SHA1;
                        break;
                    case rsa_hash_js_1.SHA256_NAMESPACE:
                        this.algorithm.hash.name = rsa_hash_js_1.SHA256;
                        break;
                    case rsa_hash_js_1.SHA384_NAMESPACE:
                        this.algorithm.hash.name = rsa_hash_js_1.SHA384;
                        break;
                    case rsa_hash_js_1.SHA512_NAMESPACE:
                        this.algorithm.hash.name = rsa_hash_js_1.SHA512;
                        break;
                    default:
                        throw new xml_core_1.XmlError(xml_core_1.XE.CRYPTOGRAPHIC, `Unsupported hash algorithm: ${item.DigestMethod.Algorithm}`);
                }
                if (item.SaltLength) {
                    this.algorithm.saltLength = item.SaltLength;
                }
                return true;
            }
            return false;
        })) {
            throw new xml_core_1.XmlError(xml_core_1.XE.CRYPTOGRAPHIC, 'RSA-PSS parameters not found in SignatureMethod');
        }
    }
    toMethod(method) {
        const pssParams = new rsa_key_js_1.PssAlgorithmParams();
        switch (this.algorithm.hash.name.toUpperCase()) {
            case rsa_hash_js_1.SHA1:
                pssParams.DigestMethod.Algorithm = rsa_hash_js_1.SHA1_NAMESPACE;
                break;
            case rsa_hash_js_1.SHA256:
                pssParams.DigestMethod.Algorithm = rsa_hash_js_1.SHA256_NAMESPACE;
                break;
            case rsa_hash_js_1.SHA384:
                pssParams.DigestMethod.Algorithm = rsa_hash_js_1.SHA384_NAMESPACE;
                break;
            case rsa_hash_js_1.SHA512:
                pssParams.DigestMethod.Algorithm = rsa_hash_js_1.SHA512_NAMESPACE;
                break;
            default:
                throw new xml_core_1.XmlError(xml_core_1.XE.CRYPTOGRAPHIC, `Unsupported hash algorithm: ${this.algorithm.hash.name}`);
        }
        if (this.algorithm.saltLength) {
            pssParams.SaltLength = this.algorithm.saltLength;
        }
        method.Any.Add(pssParams);
    }
}
exports.RsaPssWithParams = RsaPssWithParams;
