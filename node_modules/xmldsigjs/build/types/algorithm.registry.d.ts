import { IHashAlgorithmConstructable, ISignatureAlgorithmConstructable } from './algorithm.js';
interface IHashAlgorithmRegistryItem {
    type: 'hash';
    algorithm: IHashAlgorithmConstructable;
}
interface ISignatureAlgorithmRegistryItem {
    type: 'signature';
    algorithm: ISignatureAlgorithmConstructable;
}
type AlgorithmRegistryItem = IHashAlgorithmRegistryItem | ISignatureAlgorithmRegistryItem;
declare class AlgorithmRegistry extends Map<string, AlgorithmRegistryItem> {
}
export declare const algorithmRegistry: AlgorithmRegistry;
export {};
