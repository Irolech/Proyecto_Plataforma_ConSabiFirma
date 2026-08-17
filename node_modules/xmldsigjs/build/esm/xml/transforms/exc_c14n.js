import { XE, XmlError } from 'xml-core';
import { XmlCanonicalizer } from '../../canonicalizer.js';
import { Transform } from '../transform.js';
export class XmlDsigExcC14NTransform extends Transform {
    constructor() {
        super(...arguments);
        this.Algorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#';
        this.xmlCanonicalizer = new XmlCanonicalizer(false, true);
    }
    get InclusiveNamespacesPrefixList() {
        return this.xmlCanonicalizer.InclusiveNamespacesPrefixList;
    }
    set InclusiveNamespacesPrefixList(value) {
        this.xmlCanonicalizer.InclusiveNamespacesPrefixList = value;
    }
    LoadXml(param) {
        super.LoadXml(param);
        if (this.Element && this.Element.childNodes) {
            for (let i = 0; i < this.Element.childNodes.length; i++) {
                const element = this.Element.childNodes[i];
                if (element && element.nodeType === 1) {
                    switch (element.localName) {
                        case 'InclusiveNamespaces':
                            this.setInclusiveNamespacesElement(element);
                            break;
                    }
                }
            }
        }
    }
    GetOutput() {
        if (!this.innerXml) {
            throw new XmlError(XE.PARAM_REQUIRED, 'innerXml');
        }
        return this.xmlCanonicalizer.Canonicalize(this.innerXml);
    }
    setInclusiveNamespacesElement(element) {
        const prefixList = element.getAttribute('PrefixList');
        if (prefixList && prefixList.length > 0) {
            this.xmlCanonicalizer.InclusiveNamespacesPrefixList = prefixList;
        }
    }
}
export class XmlDsigExcC14NWithCommentsTransform extends XmlDsigExcC14NTransform {
    constructor() {
        super(...arguments);
        this.Algorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#WithComments';
        this.xmlCanonicalizer = new XmlCanonicalizer(true, true);
    }
}
