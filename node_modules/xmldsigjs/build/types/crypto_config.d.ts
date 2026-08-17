import { IHashAlgorithm, ISignatureAlgorithm, HashAlgorithm, SignatureAlgorithm, ISignatureAlgorithmConstructable, IHashAlgorithmConstructable } from './algorithm.js';
import { SignatureMethod } from './xml/signature_method.js';
import { Transform } from './xml/index.js';
import { KeyInfoClauseConstructable } from './xml/key_infos/index.js';
import { ITransformConstructable } from './xml/transform.js';
export declare class CryptoConfig {
    /**
     * Creates Transform from given name
     * if name is not exist then throws error
     *
     * @static
     * @param name
     * @returns
     *
     * @memberOf CryptoConfig
     */
    static CreateFromName(name: string | null): Transform;
    /**
     * Creates an instance of a signature algorithm based on the provided signature method.
     *
     * @param method - The signature method containing algorithm information and optional parameters.
     * @returns An instance of the resolved `SignatureAlgorithm`.
     * @throws {XmlError} If RSA-PSS parameters cannot be determined.
     * @throws {XmlError} If the signature algorithm is not supported.
     */
    static CreateSignatureAlgorithm(method: SignatureMethod): SignatureAlgorithm;
    static CreateHashAlgorithm(namespace: string): HashAlgorithm;
    static GetHashAlgorithm(algorithm: AlgorithmIdentifier): IHashAlgorithm;
    static GetSignatureAlgorithm(algorithm: AlgorithmIdentifier): ISignatureAlgorithm;
    static CreateSignatureMethod(algorithm: ISignatureAlgorithm): SignatureMethod;
    static RegisterSignatureAlgorithm(namespace: string, algorithm: ISignatureAlgorithmConstructable): void;
    static RegisterHashAlgorithm(namespace: string, algorithm: IHashAlgorithmConstructable): void;
    static RegisterKeyInfoClause(localName: string, keyValue: KeyInfoClauseConstructable): void;
    /**
     * Registers a custom transform implementation with the given namespace URI.
     * This allows you to extend xmldsigjs with custom transform algorithms.
     *
     * @param namespace - The namespace URI that identifies the transform algorithm
     * @param transform - The Transform class constructor to use for this algorithm
     *
     * @example
     * ```typescript
     * class MyCustomTransform extends Transform {
     *   public Algorithm = 'urn:my-custom-transform';
     *   public GetOutput(): string {
     *     // Custom transformation logic
     *     return transformedData;
     *   }
     * }
     *
     * CryptoConfig.RegisterTransform('urn:my-custom-transform', MyCustomTransform);
     * ```
     */
    static RegisterTransform(namespace: string, transform: ITransformConstructable): void;
}
