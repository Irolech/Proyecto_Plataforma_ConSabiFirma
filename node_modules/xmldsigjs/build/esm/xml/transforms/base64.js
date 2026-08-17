import { Convert, XE, XmlError } from 'xml-core';
import { Transform } from '../transform.js';
import { XmlSignature } from '../xml_names.js';
export class XmlDsigBase64Transform extends Transform {
    constructor() {
        super(...arguments);
        this.Algorithm = XmlSignature.AlgorithmNamespaces.XmlDsigBase64Transform;
    }
    GetOutput() {
        if (!this.innerXml) {
            throw new XmlError(XE.PARAM_REQUIRED, 'innerXml');
        }
        return Convert.FromString(this.innerXml.textContent || '', 'base64');
    }
}
