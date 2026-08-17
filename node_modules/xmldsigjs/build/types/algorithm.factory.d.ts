import { SignatureMethod } from './xml/index.js';
import { IHashAlgorithm, ISignatureAlgorithm } from './algorithm.js';
export declare class AlgorithmFactory {
    static createHashAlgorithmFromNamespace(namespace: string): IHashAlgorithm;
    static createSignatureAlgorithmFromMethod(method: SignatureMethod): ISignatureAlgorithm;
    static createHashAlgorithmFromAlgorithm(alg: Algorithm): IHashAlgorithm;
    static createSignatureAlgorithmFromAlgorithm(alg: Algorithm): ISignatureAlgorithm;
}
