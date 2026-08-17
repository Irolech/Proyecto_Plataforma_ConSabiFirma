import { SignatureAlgorithm } from '../algorithm.js';
import { SHA1, SHA256, SHA384, SHA512 } from './rsa_hash.js';
export const ECDSA = 'ECDSA';
export const ECDSA_SHA1_NAMESPACE = 'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha1';
export const ECDSA_SHA256_NAMESPACE = 'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256';
export const ECDSA_SHA384_NAMESPACE = 'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha384';
export const ECDSA_SHA512_NAMESPACE = 'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha512';
function fromAlgorithm(alg) {
    if (alg.name.toUpperCase() === ECDSA.toUpperCase()) {
        switch (alg.hash.name.toUpperCase()) {
            case SHA1:
                return new EcdsaSha1();
            case SHA256:
                return new EcdsaSha256();
            case SHA384:
                return new EcdsaSha384();
            case SHA512:
                return new EcdsaSha512();
        }
    }
    return null;
}
export class EcdsaSha1 extends SignatureAlgorithm {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: ECDSA,
            hash: {
                name: SHA1,
            },
        };
        this.namespaceURI = ECDSA_SHA1_NAMESPACE;
    }
    static fromAlgorithm(alg) {
        return fromAlgorithm(alg);
    }
}
export class EcdsaSha256 extends SignatureAlgorithm {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: ECDSA,
            hash: {
                name: SHA256,
            },
        };
        this.namespaceURI = ECDSA_SHA256_NAMESPACE;
    }
    static fromAlgorithm(alg) {
        return fromAlgorithm(alg);
    }
}
export class EcdsaSha384 extends SignatureAlgorithm {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: ECDSA,
            hash: {
                name: SHA384,
            },
        };
        this.namespaceURI = ECDSA_SHA384_NAMESPACE;
    }
    static fromAlgorithm(alg) {
        return fromAlgorithm(alg);
    }
}
export class EcdsaSha512 extends SignatureAlgorithm {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: ECDSA,
            hash: {
                name: SHA512,
            },
        };
        this.namespaceURI = ECDSA_SHA512_NAMESPACE;
    }
    static fromAlgorithm(alg) {
        return fromAlgorithm(alg);
    }
}
