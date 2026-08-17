import { Transform } from './transform.js';
import { XmlSignatureCollection } from './xml_object.js';
/**
 * The Transforms element contains a collection of transformations
 */
export declare class Transforms extends XmlSignatureCollection<Transform> {
    protected OnLoadXml(element: Element): void;
}
