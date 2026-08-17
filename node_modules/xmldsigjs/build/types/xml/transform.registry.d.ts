import { ITransformConstructable } from './transform.js';
declare class TransformRegistry extends Map<string, ITransformConstructable> {
}
export declare const transformRegistry: TransformRegistry;
export {};
