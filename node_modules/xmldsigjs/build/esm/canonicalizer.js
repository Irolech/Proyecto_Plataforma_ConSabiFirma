import * as XmlCore from 'xml-core';
export var XmlCanonicalizerState;
(function (XmlCanonicalizerState) {
    XmlCanonicalizerState[XmlCanonicalizerState["BeforeDocElement"] = 0] = "BeforeDocElement";
    XmlCanonicalizerState[XmlCanonicalizerState["InsideDocElement"] = 1] = "InsideDocElement";
    XmlCanonicalizerState[XmlCanonicalizerState["AfterDocElement"] = 2] = "AfterDocElement";
})(XmlCanonicalizerState || (XmlCanonicalizerState = {}));
export class XmlCanonicalizer {
    constructor(withComments, excC14N, propagatedNamespaces = new XmlCore.NamespaceManager()) {
        this.propagatedNamespaces = new XmlCore.NamespaceManager();
        this.result = [];
        this.visibleNamespaces = new XmlCore.NamespaceManager();
        this.inclusiveNamespacesPrefixList = [];
        this.state = XmlCanonicalizerState.BeforeDocElement;
        this.withComments = withComments;
        this.exclusive = excC14N;
        this.propagatedNamespaces = propagatedNamespaces;
    }
    get InclusiveNamespacesPrefixList() {
        return this.inclusiveNamespacesPrefixList.join(' ');
    }
    set InclusiveNamespacesPrefixList(value) {
        this.inclusiveNamespacesPrefixList = value.split(' ');
    }
    Canonicalize(node) {
        if (!node) {
            throw new XmlCore.XmlError(XmlCore.XE.CRYPTOGRAPHIC, 'Parameter 1 is not Node');
        }
        this.WriteNode(node);
        const res = this.result.join('');
        return res;
    }
    WriteNode(node) {
        switch (node.nodeType) {
            case XmlCore.XmlNodeType.Document:
            case XmlCore.XmlNodeType.DocumentFragment:
                this.WriteDocumentNode(node);
                break;
            case XmlCore.XmlNodeType.Element:
                this.WriteElementNode(node);
                break;
            case XmlCore.XmlNodeType.CDATA:
            case XmlCore.XmlNodeType.SignificantWhitespace:
            case XmlCore.XmlNodeType.Text:
                if (!XmlCore.isDocument(node.parentNode)) {
                    this.WriteTextNode(node);
                }
                break;
            case XmlCore.XmlNodeType.Whitespace:
                if (this.state === XmlCanonicalizerState.InsideDocElement) {
                    this.WriteTextNode(node);
                }
                break;
            case XmlCore.XmlNodeType.Comment:
                this.WriteCommentNode(node);
                break;
            case XmlCore.XmlNodeType.ProcessingInstruction:
                this.WriteProcessingInstructionNode(node);
                break;
            case XmlCore.XmlNodeType.EntityReference:
                for (let i = 0; i < node.childNodes.length; i++) {
                    this.WriteNode(node.childNodes[i]);
                }
                break;
            case XmlCore.XmlNodeType.Attribute:
                throw new XmlCore.XmlError(XmlCore.XE.CRYPTOGRAPHIC, 'Attribute node is impossible here');
            case XmlCore.XmlNodeType.EndElement:
                throw new XmlCore.XmlError(XmlCore.XE.CRYPTOGRAPHIC, 'Attribute node is impossible here');
            case XmlCore.XmlNodeType.EndEntity:
                throw new XmlCore.XmlError(XmlCore.XE.CRYPTOGRAPHIC, 'Attribute node is impossible here');
            case XmlCore.XmlNodeType.DocumentType:
            case XmlCore.XmlNodeType.Entity:
            case XmlCore.XmlNodeType.Notation:
            case XmlCore.XmlNodeType.XmlDeclaration:
                break;
        }
    }
    WriteDocumentNode(node) {
        this.state = XmlCanonicalizerState.BeforeDocElement;
        for (let child = node.firstChild; child != null; child = child.nextSibling) {
            this.WriteNode(child);
        }
    }
    WriteCommentNode(node) {
        if (this.withComments) {
            if (this.state === XmlCanonicalizerState.AfterDocElement) {
                this.result.push(String.fromCharCode(10) + '<!--');
            }
            else {
                this.result.push('<!--');
            }
            this.result.push(this.NormalizeString(node.nodeValue, XmlCore.XmlNodeType.Comment));
            if (this.state === XmlCanonicalizerState.BeforeDocElement) {
                this.result.push('-->' + String.fromCharCode(10));
            }
            else {
                this.result.push('-->');
            }
        }
    }
    WriteTextNode(node) {
        this.result.push(this.NormalizeString(node.nodeValue, node.nodeType));
    }
    WriteProcessingInstructionNode(node) {
        const nodeName = node.nodeName || node.tagName;
        if (nodeName === 'xml') {
            return;
        }
        if (this.state === XmlCanonicalizerState.AfterDocElement) {
            this.result.push('\u000A<?');
        }
        else {
            this.result.push('<?');
        }
        this.result.push(nodeName);
        if (node.nodeValue) {
            this.result.push(' ');
            this.result.push(this.NormalizeString(node.nodeValue, XmlCore.XmlNodeType.ProcessingInstruction));
        }
        if (this.state === XmlCanonicalizerState.BeforeDocElement) {
            this.result.push('?>\u000A');
        }
        else {
            this.result.push('?>');
        }
    }
    WriteElementNode(node) {
        const state = this.state;
        if (this.state === XmlCanonicalizerState.BeforeDocElement) {
            this.state = XmlCanonicalizerState.InsideDocElement;
        }
        this.result.push('<');
        this.result.push(node.nodeName);
        let visibleNamespacesCount = this.WriteNamespacesAxis(node);
        this.WriteAttributesAxis(node);
        this.result.push('>');
        for (let n = node.firstChild; n != null; n = n.nextSibling) {
            this.WriteNode(n);
        }
        this.result.push('</');
        this.result.push(node.nodeName);
        this.result.push('>');
        if (state === XmlCanonicalizerState.BeforeDocElement) {
            this.state = XmlCanonicalizerState.AfterDocElement;
        }
        while (visibleNamespacesCount--) {
            this.visibleNamespaces.Pop();
        }
    }
    WriteNamespacesAxis(node) {
        const list = [];
        let visibleNamespacesCount = 0;
        for (let i = 0; i < node.attributes.length; i++) {
            const attribute = node.attributes[i];
            if (!IsNamespaceNode(attribute)) {
                if (attribute.prefix &&
                    !this.IsNamespaceRendered(attribute.prefix, attribute.namespaceURI)) {
                    const ns = { prefix: attribute.prefix, namespace: attribute.namespaceURI };
                    list.push(ns);
                    this.visibleNamespaces.Add(ns);
                    visibleNamespacesCount++;
                }
                continue;
            }
            if (attribute.localName === 'xmlns' && !attribute.prefix && !attribute.nodeValue) {
                const ns = { prefix: attribute.prefix, namespace: attribute.nodeValue };
                list.push(ns);
                this.visibleNamespaces.Add(ns);
                visibleNamespacesCount++;
            }
            let prefix = null;
            let matches;
            if ((matches = /xmlns:([\w.-]+)/.exec(attribute.nodeName))) {
                prefix = matches[1];
            }
            let printable = true;
            if (this.exclusive && !this.IsNamespaceInclusive(node, prefix)) {
                const used = IsNamespaceUsed(node, prefix);
                if (used > 1) {
                    printable = false;
                }
                else if (used === 0) {
                    continue;
                }
            }
            if (this.IsNamespaceRendered(prefix, attribute.nodeValue)) {
                continue;
            }
            if (printable) {
                const ns = { prefix, namespace: attribute.nodeValue };
                list.push(ns);
                this.visibleNamespaces.Add(ns);
                visibleNamespacesCount++;
            }
        }
        if (!this.IsNamespaceRendered(node.prefix, node.namespaceURI) &&
            node.namespaceURI !== 'http://www.w3.org/2000/xmlns/') {
            const ns = { prefix: node.prefix, namespace: node.namespaceURI };
            list.push(ns);
            this.visibleNamespaces.Add(ns);
            visibleNamespacesCount++;
        }
        list.sort(XmlDsigC14NTransformNamespacesComparer);
        let prevPrefix = null;
        list.forEach((n) => {
            if (n.prefix === prevPrefix) {
                return;
            }
            prevPrefix = n.prefix;
            this.result.push(' xmlns');
            if (n.prefix) {
                this.result.push(':' + n.prefix);
            }
            this.result.push('="');
            this.result.push(n.namespace || '');
            this.result.push('"');
        });
        return visibleNamespacesCount;
    }
    WriteAttributesAxis(node) {
        const list = [];
        for (let i = 0; i < node.attributes.length; i++) {
            const attribute = node.attributes[i];
            if (!IsNamespaceNode(attribute)) {
                list.push(attribute);
            }
        }
        list.sort(XmlDsigC14NTransformAttributesComparer);
        list.forEach((attribute) => {
            if (attribute != null) {
                this.result.push(' ');
                this.result.push(attribute.nodeName);
                this.result.push('="');
                this.result.push(this.NormalizeString(attribute.nodeValue, XmlCore.XmlNodeType.Attribute));
                this.result.push('"');
            }
        });
    }
    NormalizeString(input, type) {
        const sb = [];
        if (input) {
            for (let i = 0; i < input.length; i++) {
                const ch = input[i];
                if (ch === '<' && (type === XmlCore.XmlNodeType.Attribute || this.IsTextNode(type))) {
                    sb.push('&lt;');
                }
                else if (ch === '>' && this.IsTextNode(type)) {
                    sb.push('&gt;');
                }
                else if (ch === '&' &&
                    (type === XmlCore.XmlNodeType.Attribute || this.IsTextNode(type))) {
                    sb.push('&amp;');
                }
                else if (ch === '"' && type === XmlCore.XmlNodeType.Attribute) {
                    sb.push('&quot;');
                }
                else if (ch === '\u0009' && type === XmlCore.XmlNodeType.Attribute) {
                    sb.push('&#x9;');
                }
                else if (ch === '\u000A' && type === XmlCore.XmlNodeType.Attribute) {
                    sb.push('&#xA;');
                }
                else if (ch === '\u000D') {
                    sb.push('&#xD;');
                }
                else {
                    sb.push(ch);
                }
            }
        }
        return sb.join('');
    }
    IsTextNode(type) {
        switch (type) {
            case XmlCore.XmlNodeType.Text:
            case XmlCore.XmlNodeType.CDATA:
            case XmlCore.XmlNodeType.SignificantWhitespace:
            case XmlCore.XmlNodeType.Whitespace:
                return true;
        }
        return false;
    }
    IsNamespaceInclusive(node, prefix) {
        const prefix2 = prefix || null;
        if (node.prefix === prefix2) {
            return false;
        }
        return this.inclusiveNamespacesPrefixList.indexOf(prefix2 || '') !== -1;
    }
    IsNamespaceRendered(prefix, uri) {
        prefix = prefix || '';
        uri = uri || '';
        if (!prefix && !uri) {
            return true;
        }
        if (prefix === 'xml' && uri === 'http://www.w3.org/XML/1998/namespace') {
            return true;
        }
        const ns = this.visibleNamespaces.GetPrefix(prefix);
        if (ns) {
            return ns.namespace === uri;
        }
        return false;
    }
}
function XmlDsigC14NTransformNamespacesComparer(x, y) {
    if (x == y) {
        return 0;
    }
    else if (!x) {
        return -1;
    }
    else if (!y) {
        return 1;
    }
    else if (!x.prefix) {
        return -1;
    }
    else if (!y.prefix) {
        return 1;
    }
    else if (x.prefix < y.prefix) {
        return -1;
    }
    else if (x.prefix > y.prefix) {
        return 1;
    }
    else {
        return 0;
    }
}
function XmlDsigC14NTransformAttributesComparer(x, y) {
    if (!x.namespaceURI && y.namespaceURI) {
        return -1;
    }
    if (!y.namespaceURI && x.namespaceURI) {
        return 1;
    }
    const left = (x.namespaceURI || '') + x.localName;
    const right = (y.namespaceURI || '') + y.localName;
    if (left === right) {
        return 0;
    }
    else if (left < right) {
        return -1;
    }
    else {
        return 1;
    }
}
function IsNamespaceUsed(node, prefix, result = 0) {
    const prefix2 = prefix || null;
    if (node.prefix === prefix2) {
        return ++result;
    }
    if (node.attributes) {
        for (let i = 0; i < node.attributes.length; i++) {
            const attr = node.attributes[i];
            if (!IsNamespaceNode(attr) && prefix && node.attributes[i].prefix === prefix) {
                return ++result;
            }
        }
    }
    for (let n = node.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === XmlCore.XmlNodeType.Element) {
            const el = n;
            const res = IsNamespaceUsed(el, prefix, result);
            if (n.nodeType === XmlCore.XmlNodeType.Element && res) {
                return ++result + res;
            }
        }
    }
    return result;
}
function IsNamespaceNode(node) {
    const reg = /xmlns:/;
    if (node !== null &&
        node.nodeType === XmlCore.XmlNodeType.Attribute &&
        (node.nodeName === 'xmlns' || reg.test(node.nodeName))) {
        return true;
    }
    return false;
}
