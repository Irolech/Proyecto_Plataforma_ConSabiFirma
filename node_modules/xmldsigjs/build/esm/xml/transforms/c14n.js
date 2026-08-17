import { XE, XmlError } from 'xml-core';
import { XmlCanonicalizer } from '../../canonicalizer.js';
import { Transform } from '../transform.js';
export class XmlDsigC14NTransform extends Transform {
    constructor() {
        super(...arguments);
        this.Algorithm = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
        this.xmlCanonicalizer = new XmlCanonicalizer(false, false);
    }
    GetOutput() {
        if (!this.innerXml) {
            throw new XmlError(XE.PARAM_REQUIRED, 'innerXml');
        }
        return this.xmlCanonicalizer.Canonicalize(this.innerXml);
    }
}
export class XmlDsigC14NWithCommentsTransform extends XmlDsigC14NTransform {
    constructor() {
        super(...arguments);
        this.Algorithm = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315#WithComments';
        this.xmlCanonicalizer = new XmlCanonicalizer(true, false);
    }
}
