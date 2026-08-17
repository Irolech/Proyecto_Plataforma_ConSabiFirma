"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sha512 = exports.Sha384 = exports.Sha256 = exports.Sha1 = exports.SHA512_NAMESPACE = exports.SHA384_NAMESPACE = exports.SHA256_NAMESPACE = exports.SHA1_NAMESPACE = exports.SHA512 = exports.SHA384 = exports.SHA256 = exports.SHA1 = void 0;
const algorithm_js_1 = require("../algorithm.js");
exports.SHA1 = 'SHA-1';
exports.SHA256 = 'SHA-256';
exports.SHA384 = 'SHA-384';
exports.SHA512 = 'SHA-512';
exports.SHA1_NAMESPACE = 'http://www.w3.org/2000/09/xmldsig#sha1';
exports.SHA256_NAMESPACE = 'http://www.w3.org/2001/04/xmlenc#sha256';
exports.SHA384_NAMESPACE = 'http://www.w3.org/2001/04/xmldsig-more#sha384';
exports.SHA512_NAMESPACE = 'http://www.w3.org/2001/04/xmlenc#sha512';
class Sha1 extends algorithm_js_1.HashAlgorithm {
    constructor() {
        super(...arguments);
        this.algorithm = { name: exports.SHA1 };
        this.namespaceURI = exports.SHA1_NAMESPACE;
    }
}
exports.Sha1 = Sha1;
class Sha256 extends algorithm_js_1.HashAlgorithm {
    constructor() {
        super(...arguments);
        this.algorithm = { name: exports.SHA256 };
        this.namespaceURI = exports.SHA256_NAMESPACE;
    }
}
exports.Sha256 = Sha256;
class Sha384 extends algorithm_js_1.HashAlgorithm {
    constructor() {
        super(...arguments);
        this.algorithm = { name: exports.SHA384 };
        this.namespaceURI = exports.SHA384_NAMESPACE;
    }
}
exports.Sha384 = Sha384;
class Sha512 extends algorithm_js_1.HashAlgorithm {
    constructor() {
        super(...arguments);
        this.algorithm = { name: exports.SHA512 };
        this.namespaceURI = exports.SHA512_NAMESPACE;
    }
}
exports.Sha512 = Sha512;
