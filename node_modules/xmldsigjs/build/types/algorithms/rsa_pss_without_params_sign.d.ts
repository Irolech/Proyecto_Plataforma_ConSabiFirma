import { ISignatureAlgorithm, SignatureAlgorithm } from '../algorithm.js';
import { RSA_PSS } from './rsa_pss_sign.js';
export declare const RSA_PSS_SHA1_NAMESPACE = "http://www.w3.org/2007/05/xmldsig-more#sha1-rsa-MGF1";
export declare const RSA_PSS_SHA256_NAMESPACE = "http://www.w3.org/2007/05/xmldsig-more#sha256-rsa-MGF1";
export declare const RSA_PSS_SHA384_NAMESPACE = "http://www.w3.org/2007/05/xmldsig-more#sha384-rsa-MGF1";
export declare const RSA_PSS_SHA512_NAMESPACE = "http://www.w3.org/2007/05/xmldsig-more#sha512-rsa-MGF1";
interface RsaPssWithoutParamsAlgorithm extends Algorithm {
    name: typeof RSA_PSS;
    hash: Algorithm;
    saltLength: number;
}
export declare class RsaPssWithoutParamsBase extends SignatureAlgorithm {
    static fromAlgorithm(_alg: Algorithm): ISignatureAlgorithm | null;
}
export declare class RsaPssWithoutParamsSha1 extends RsaPssWithoutParamsBase {
    algorithm: RsaPssWithoutParamsAlgorithm;
    namespaceURI: string;
}
export declare class RsaPssWithoutParamsSha256 extends RsaPssWithoutParamsBase {
    algorithm: RsaPssWithoutParamsAlgorithm;
    namespaceURI: string;
}
export declare class RsaPssWithoutParamsSha384 extends RsaPssWithoutParamsBase {
    algorithm: RsaPssWithoutParamsAlgorithm;
    namespaceURI: string;
}
export declare class RsaPssWithoutParamsSha512 extends RsaPssWithoutParamsBase {
    algorithm: RsaPssWithoutParamsAlgorithm;
    namespaceURI: string;
}
export {};
