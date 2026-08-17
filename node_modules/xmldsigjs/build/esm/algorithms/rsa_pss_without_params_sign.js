import { SignatureAlgorithm } from '../algorithm.js';
import { SHA1, SHA256, SHA384, SHA512 } from './rsa_hash.js';
import { RSA_PSS } from './rsa_pss_sign.js';
export const RSA_PSS_SHA1_NAMESPACE = 'http://www.w3.org/2007/05/xmldsig-more#sha1-rsa-MGF1';
export const RSA_PSS_SHA256_NAMESPACE = 'http://www.w3.org/2007/05/xmldsig-more#sha256-rsa-MGF1';
export const RSA_PSS_SHA384_NAMESPACE = 'http://www.w3.org/2007/05/xmldsig-more#sha384-rsa-MGF1';
export const RSA_PSS_SHA512_NAMESPACE = 'http://www.w3.org/2007/05/xmldsig-more#sha512-rsa-MGF1';
export class RsaPssWithoutParamsBase extends SignatureAlgorithm {
    static fromAlgorithm(_alg) {
        return null;
    }
}
export class RsaPssWithoutParamsSha1 extends RsaPssWithoutParamsBase {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: RSA_PSS,
            hash: {
                name: SHA1,
            },
            saltLength: 20,
        };
        this.namespaceURI = RSA_PSS_SHA1_NAMESPACE;
    }
}
export class RsaPssWithoutParamsSha256 extends RsaPssWithoutParamsBase {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: RSA_PSS,
            hash: {
                name: SHA256,
            },
            saltLength: 32,
        };
        this.namespaceURI = RSA_PSS_SHA256_NAMESPACE;
    }
}
export class RsaPssWithoutParamsSha384 extends RsaPssWithoutParamsBase {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: RSA_PSS,
            hash: {
                name: SHA384,
            },
            saltLength: 48,
        };
        this.namespaceURI = RSA_PSS_SHA384_NAMESPACE;
    }
}
export class RsaPssWithoutParamsSha512 extends RsaPssWithoutParamsBase {
    constructor() {
        super(...arguments);
        this.algorithm = {
            name: RSA_PSS,
            hash: {
                name: SHA512,
            },
            saltLength: 64,
        };
        this.namespaceURI = RSA_PSS_SHA512_NAMESPACE;
    }
}
