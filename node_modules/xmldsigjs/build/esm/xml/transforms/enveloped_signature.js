import { isElement, XE, XmlError } from 'xml-core';
import { Transform } from '../transform.js';
import { XmlSignature } from '../xml_names.js';
export class XmlDsigEnvelopedSignatureTransform extends Transform {
    constructor() {
        super(...arguments);
        this.Algorithm = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature';
    }
    GetOutput() {
        if (!this.innerXml) {
            throw new XmlError(XE.PARAM_REQUIRED, 'innerXml');
        }
        let child = this.innerXml.firstChild;
        const signatures = [];
        while (child) {
            if (isElement(child) &&
                child.localName === XmlSignature.ElementNames.Signature &&
                child.namespaceURI === XmlSignature.NamespaceURI) {
                signatures.push(child);
            }
            child = child.nextSibling;
        }
        for (const signature of signatures) {
            signature.parentNode?.removeChild(signature);
        }
        return this.innerXml;
    }
}
