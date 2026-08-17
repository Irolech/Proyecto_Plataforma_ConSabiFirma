import { ISignatureAlgorithm, SignatureAlgorithm } from '../algorithm.js';
import { SignatureMethod } from '../xml/signature_method.js';
export declare const RSA_PSS = "RSA-PSS";
export declare const RSA_PSS_WITH_PARAMS_NAMESPACE = "http://www.w3.org/2007/05/xmldsig-more#rsa-pss";
interface RsaPSSSignParams extends Algorithm {
    name: typeof RSA_PSS;
    hash: Algorithm;
    saltLength?: number;
}
export declare class RsaPssWithParams extends SignatureAlgorithm {
    static fromAlgorithm(alg: RsaPSSSignParams): ISignatureAlgorithm | null;
    algorithm: RsaPSSSignParams;
    namespaceURI: string;
    fromMethod(method: SignatureMethod): void;
    toMethod(method: SignatureMethod): void;
}
export {};
