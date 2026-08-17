"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EcdsaSha512 = exports.EcdsaSha384 = exports.EcdsaSha256 = exports.EcdsaSha1 = exports.ECDSA_SHA512_NAMESPACE = exports.ECDSA_SHA384_NAMESPACE = exports.ECDSA_SHA256_NAMESPACE = exports.ECDSA_SHA1_NAMESPACE = exports.ECDSA = void 0;
const algorithm_js_1 = require("../algorithm.js");
const rsa_hash_js_1 = require("./rsa_hash.js");
exports.ECDSA = 'ECDSA';
exports.ECDSA_SHA1_NAMESPACE = 'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha1';
exports.ECDSA_SHA256_NAMESPACE = 'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256';
exports.ECDSA_SHA384_NAMESPACE = 'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha384';
exports.ECDSA_SHA512_NAMESPACE = 'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha512';
function fromAlgorithm(alg) {
    if (alg.name.toUpperCase() === exports.ECDSA.toUpperCase()) {
        switch (alg.hash.name.toUpperCase()) {
            case rsa_hash_js_1.SHA1:
                return new EcdsaSha1();
            case rsa_hash_js_1.SHA256:
                return new EcdsaSha256();
            case rsa_hash_js_1.SHA384:
                return new EcdsaSha384();
            case rsa_hash_js_1.SHA512:
                return new EcdsaSha512();
        }
    }
    return null;
}
class EcdsaSha1 extends algorithm_js_1.SignatureAlgorithm {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: exports.ECDSA,
            hash: {
                name: rsa_hash_js_1.SHA1,
            },
        };
        this.namespaceURI = exports.ECDSA_SHA1_NAMESPACE;
    }
    static fromAlgorithm(alg) {
        return fromAlgorithm(alg);
    }
}
exports.EcdsaSha1 = EcdsaSha1;
class EcdsaSha256 extends algorithm_js_1.SignatureAlgorithm {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: exports.ECDSA,
            hash: {
                name: rsa_hash_js_1.SHA256,
            },
        };
        this.namespaceURI = exports.ECDSA_SHA256_NAMESPACE;
    }
    static fromAlgorithm(alg) {
        return fromAlgorithm(alg);
    }
}
exports.EcdsaSha256 = EcdsaSha256;
class EcdsaSha384 extends algorithm_js_1.SignatureAlgorithm {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: exports.ECDSA,
            hash: {
                name: rsa_hash_js_1.SHA384,
            },
        };
        this.namespaceURI = exports.ECDSA_SHA384_NAMESPACE;
    }
    static fromAlgorithm(alg) {
        return fromAlgorithm(alg);
    }
}
exports.EcdsaSha384 = EcdsaSha384;
class EcdsaSha512 extends algorithm_js_1.SignatureAlgorithm {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: exports.ECDSA,
            hash: {
                name: rsa_hash_js_1.SHA512,
            },
        };
        this.namespaceURI = exports.ECDSA_SHA512_NAMESPACE;
    }
    static fromAlgorithm(alg) {
        return fromAlgorithm(alg);
    }
}
exports.EcdsaSha512 = EcdsaSha512;
