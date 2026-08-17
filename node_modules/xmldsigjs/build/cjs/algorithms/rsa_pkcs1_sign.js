"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RsaPkcs1Sha512 = exports.RsaPkcs1Sha384 = exports.RsaPkcs1Sha256 = exports.RsaPkcs1Sha1 = exports.RSA_PKCS1_SHA512_NAMESPACE = exports.RSA_PKCS1_SHA384_NAMESPACE = exports.RSA_PKCS1_SHA256_NAMESPACE = exports.RSA_PKCS1_SHA1_NAMESPACE = exports.RSA_PKCS1 = void 0;
const algorithm_js_1 = require("../algorithm.js");
const rsa_hash_js_1 = require("./rsa_hash.js");
exports.RSA_PKCS1 = 'RSASSA-PKCS1-v1_5';
exports.RSA_PKCS1_SHA1_NAMESPACE = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1';
exports.RSA_PKCS1_SHA256_NAMESPACE = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
exports.RSA_PKCS1_SHA384_NAMESPACE = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha384';
exports.RSA_PKCS1_SHA512_NAMESPACE = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha512';
function fromAlgorithm(alg) {
    if (alg.name.toUpperCase() === exports.RSA_PKCS1.toUpperCase()) {
        switch (alg.hash.name.toUpperCase()) {
            case rsa_hash_js_1.SHA1:
                return new RsaPkcs1Sha1();
            case rsa_hash_js_1.SHA256:
                return new RsaPkcs1Sha256();
            case rsa_hash_js_1.SHA384:
                return new RsaPkcs1Sha384();
            case rsa_hash_js_1.SHA512:
                return new RsaPkcs1Sha512();
        }
    }
    return null;
}
class RsaPkcs1Sha1 extends algorithm_js_1.SignatureAlgorithm {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: exports.RSA_PKCS1,
            hash: {
                name: rsa_hash_js_1.SHA1,
            },
        };
        this.namespaceURI = exports.RSA_PKCS1_SHA1_NAMESPACE;
    }
    static fromAlgorithm(alg) {
        return fromAlgorithm(alg);
    }
}
exports.RsaPkcs1Sha1 = RsaPkcs1Sha1;
class RsaPkcs1Sha256 extends algorithm_js_1.SignatureAlgorithm {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: exports.RSA_PKCS1,
            hash: {
                name: rsa_hash_js_1.SHA256,
            },
        };
        this.namespaceURI = exports.RSA_PKCS1_SHA256_NAMESPACE;
    }
    static fromAlgorithm(alg) {
        return fromAlgorithm(alg);
    }
}
exports.RsaPkcs1Sha256 = RsaPkcs1Sha256;
class RsaPkcs1Sha384 extends algorithm_js_1.SignatureAlgorithm {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: exports.RSA_PKCS1,
            hash: {
                name: rsa_hash_js_1.SHA384,
            },
        };
        this.namespaceURI = exports.RSA_PKCS1_SHA384_NAMESPACE;
    }
    static fromAlgorithm(alg) {
        return fromAlgorithm(alg);
    }
}
exports.RsaPkcs1Sha384 = RsaPkcs1Sha384;
class RsaPkcs1Sha512 extends algorithm_js_1.SignatureAlgorithm {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: exports.RSA_PKCS1,
            hash: {
                name: rsa_hash_js_1.SHA512,
            },
        };
        this.namespaceURI = exports.RSA_PKCS1_SHA512_NAMESPACE;
    }
    static fromAlgorithm(alg) {
        return fromAlgorithm(alg);
    }
}
exports.RsaPkcs1Sha512 = RsaPkcs1Sha512;
