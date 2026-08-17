"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HmacSha512 = exports.HmacSha384 = exports.HmacSha256 = exports.HmacSha1 = exports.HMAC_SHA512_NAMESPACE = exports.HMAC_SHA384_NAMESPACE = exports.HMAC_SHA256_NAMESPACE = exports.HMAC_SHA1_NAMESPACE = exports.HMAC = void 0;
const algorithm_js_1 = require("../algorithm.js");
const rsa_hash_js_1 = require("./rsa_hash.js");
exports.HMAC = 'HMAC';
exports.HMAC_SHA1_NAMESPACE = 'http://www.w3.org/2000/09/xmldsig#hmac-sha1';
exports.HMAC_SHA256_NAMESPACE = 'http://www.w3.org/2001/04/xmldsig-more#hmac-sha256';
exports.HMAC_SHA384_NAMESPACE = 'http://www.w3.org/2001/04/xmldsig-more#hmac-sha384';
exports.HMAC_SHA512_NAMESPACE = 'http://www.w3.org/2001/04/xmldsig-more#hmac-sha512';
function fromAlgorithm(alg) {
    if (alg.name.toUpperCase() === exports.HMAC.toUpperCase()) {
        switch (alg.hash.name.toUpperCase()) {
            case rsa_hash_js_1.SHA1:
                return new HmacSha1();
            case rsa_hash_js_1.SHA256:
                return new HmacSha256();
            case rsa_hash_js_1.SHA384:
                return new HmacSha384();
            case rsa_hash_js_1.SHA512:
                return new HmacSha512();
        }
    }
    return null;
}
class HmacSha1 extends algorithm_js_1.SignatureAlgorithm {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: exports.HMAC,
            hash: {
                name: rsa_hash_js_1.SHA1,
            },
        };
        this.namespaceURI = exports.HMAC_SHA1_NAMESPACE;
    }
    static fromAlgorithm(alg) {
        return fromAlgorithm(alg);
    }
}
exports.HmacSha1 = HmacSha1;
class HmacSha256 extends algorithm_js_1.SignatureAlgorithm {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: exports.HMAC,
            hash: {
                name: rsa_hash_js_1.SHA256,
            },
        };
        this.namespaceURI = exports.HMAC_SHA256_NAMESPACE;
    }
    static fromAlgorithm(alg) {
        return fromAlgorithm(alg);
    }
}
exports.HmacSha256 = HmacSha256;
class HmacSha384 extends algorithm_js_1.SignatureAlgorithm {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: exports.HMAC,
            hash: {
                name: rsa_hash_js_1.SHA384,
            },
        };
        this.namespaceURI = exports.HMAC_SHA384_NAMESPACE;
    }
    static fromAlgorithm(alg) {
        return fromAlgorithm(alg);
    }
}
exports.HmacSha384 = HmacSha384;
class HmacSha512 extends algorithm_js_1.SignatureAlgorithm {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: exports.HMAC,
            hash: {
                name: rsa_hash_js_1.SHA512,
            },
        };
        this.namespaceURI = exports.HMAC_SHA512_NAMESPACE;
    }
    static fromAlgorithm(alg) {
        return fromAlgorithm(alg);
    }
}
exports.HmacSha512 = HmacSha512;
