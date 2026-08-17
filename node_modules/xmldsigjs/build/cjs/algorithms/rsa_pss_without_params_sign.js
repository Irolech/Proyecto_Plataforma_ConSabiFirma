"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RsaPssWithoutParamsSha512 = exports.RsaPssWithoutParamsSha384 = exports.RsaPssWithoutParamsSha256 = exports.RsaPssWithoutParamsSha1 = exports.RsaPssWithoutParamsBase = exports.RSA_PSS_SHA512_NAMESPACE = exports.RSA_PSS_SHA384_NAMESPACE = exports.RSA_PSS_SHA256_NAMESPACE = exports.RSA_PSS_SHA1_NAMESPACE = void 0;
const algorithm_js_1 = require("../algorithm.js");
const rsa_hash_js_1 = require("./rsa_hash.js");
const rsa_pss_sign_js_1 = require("./rsa_pss_sign.js");
exports.RSA_PSS_SHA1_NAMESPACE = 'http://www.w3.org/2007/05/xmldsig-more#sha1-rsa-MGF1';
exports.RSA_PSS_SHA256_NAMESPACE = 'http://www.w3.org/2007/05/xmldsig-more#sha256-rsa-MGF1';
exports.RSA_PSS_SHA384_NAMESPACE = 'http://www.w3.org/2007/05/xmldsig-more#sha384-rsa-MGF1';
exports.RSA_PSS_SHA512_NAMESPACE = 'http://www.w3.org/2007/05/xmldsig-more#sha512-rsa-MGF1';
class RsaPssWithoutParamsBase extends algorithm_js_1.SignatureAlgorithm {
    static fromAlgorithm(_alg) {
        return null;
    }
}
exports.RsaPssWithoutParamsBase = RsaPssWithoutParamsBase;
class RsaPssWithoutParamsSha1 extends RsaPssWithoutParamsBase {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: rsa_pss_sign_js_1.RSA_PSS,
            hash: {
                name: rsa_hash_js_1.SHA1,
            },
            saltLength: 20,
        };
        this.namespaceURI = exports.RSA_PSS_SHA1_NAMESPACE;
    }
}
exports.RsaPssWithoutParamsSha1 = RsaPssWithoutParamsSha1;
class RsaPssWithoutParamsSha256 extends RsaPssWithoutParamsBase {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: rsa_pss_sign_js_1.RSA_PSS,
            hash: {
                name: rsa_hash_js_1.SHA256,
            },
            saltLength: 32,
        };
        this.namespaceURI = exports.RSA_PSS_SHA256_NAMESPACE;
    }
}
exports.RsaPssWithoutParamsSha256 = RsaPssWithoutParamsSha256;
class RsaPssWithoutParamsSha384 extends RsaPssWithoutParamsBase {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: rsa_pss_sign_js_1.RSA_PSS,
            hash: {
                name: rsa_hash_js_1.SHA384,
            },
            saltLength: 48,
        };
        this.namespaceURI = exports.RSA_PSS_SHA384_NAMESPACE;
    }
}
exports.RsaPssWithoutParamsSha384 = RsaPssWithoutParamsSha384;
class RsaPssWithoutParamsSha512 extends RsaPssWithoutParamsBase {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: rsa_pss_sign_js_1.RSA_PSS,
            hash: {
                name: rsa_hash_js_1.SHA512,
            },
            saltLength: 64,
        };
        this.namespaceURI = exports.RSA_PSS_SHA512_NAMESPACE;
    }
}
exports.RsaPssWithoutParamsSha512 = RsaPssWithoutParamsSha512;
