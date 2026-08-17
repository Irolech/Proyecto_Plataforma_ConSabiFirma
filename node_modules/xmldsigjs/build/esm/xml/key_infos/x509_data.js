import { __decorate, __metadata } from "tslib";
import { XE, XmlError, Convert, XmlChildElement, XmlElement } from 'xml-core';
import { X509Certificate } from '../../pki/x509.js';
import { XmlSignature } from '../xml_names.js';
import { XmlSignatureObject } from '../xml_object.js';
import { KeyInfoClause } from './key_info_clause.js';
let X509IssuerSerial = class X509IssuerSerial extends XmlSignatureObject {
};
__decorate([
    XmlChildElement({
        localName: XmlSignature.ElementNames.X509IssuerName,
        namespaceURI: XmlSignature.NamespaceURI,
        prefix: XmlSignature.DefaultPrefix,
        required: true,
    }),
    __metadata("design:type", String)
], X509IssuerSerial.prototype, "X509IssuerName", void 0);
__decorate([
    XmlChildElement({
        localName: XmlSignature.ElementNames.X509SerialNumber,
        namespaceURI: XmlSignature.NamespaceURI,
        prefix: XmlSignature.DefaultPrefix,
        required: true,
    }),
    __metadata("design:type", String)
], X509IssuerSerial.prototype, "X509SerialNumber", void 0);
X509IssuerSerial = __decorate([
    XmlElement({ localName: XmlSignature.ElementNames.X509IssuerSerial })
], X509IssuerSerial);
export { X509IssuerSerial };
export var X509IncludeOption;
(function (X509IncludeOption) {
    X509IncludeOption[X509IncludeOption["None"] = 0] = "None";
    X509IncludeOption[X509IncludeOption["EndCertOnly"] = 1] = "EndCertOnly";
    X509IncludeOption[X509IncludeOption["ExcludeRoot"] = 2] = "ExcludeRoot";
    X509IncludeOption[X509IncludeOption["WholeChain"] = 3] = "WholeChain";
})(X509IncludeOption || (X509IncludeOption = {}));
let KeyInfoX509Data = class KeyInfoX509Data extends KeyInfoClause {
    constructor(cert, includeOptions = X509IncludeOption.None) {
        super();
        this.x509crl = null;
        this.SubjectKeyIdList = [];
        if (cert) {
            if (cert instanceof Uint8Array) {
                this.AddCertificate(new X509Certificate(cert));
            }
            else if (cert instanceof X509Certificate) {
                switch (includeOptions) {
                    case X509IncludeOption.None:
                    case X509IncludeOption.EndCertOnly:
                        this.AddCertificate(cert);
                        break;
                    case X509IncludeOption.ExcludeRoot:
                        this.AddCertificatesChainFrom(cert, false);
                        break;
                    case X509IncludeOption.WholeChain:
                        this.AddCertificatesChainFrom(cert, true);
                        break;
                }
            }
        }
    }
    async importKey(_key) {
        throw new XmlError(XE.METHOD_NOT_SUPPORTED);
    }
    async exportKey(alg) {
        if (!this.Certificates.length) {
            throw new XmlError(XE.NULL_REFERENCE);
        }
        this.Key = await this.Certificates[0].exportKey(alg);
        return this.Key;
    }
    get Certificates() {
        return this.X509CertificateList;
    }
    get CRL() {
        return this.x509crl;
    }
    set CRL(value) {
        this.x509crl = value;
    }
    get IssuerSerials() {
        return this.IssuerSerialList;
    }
    get SubjectKeyIds() {
        return this.SubjectKeyIdList;
    }
    get SubjectNames() {
        return this.SubjectNameList;
    }
    AddCertificate(certificate) {
        if (!certificate) {
            throw new XmlError(XE.PARAM_REQUIRED, 'certificate');
        }
        if (!this.X509CertificateList) {
            this.X509CertificateList = [];
        }
        this.X509CertificateList.push(certificate);
    }
    AddIssuerSerial(issuerName, serialNumber) {
        if (issuerName == null) {
            throw new XmlError(XE.PARAM_REQUIRED, 'issuerName');
        }
        if (this.IssuerSerialList == null) {
            this.IssuerSerialList = [];
        }
        const xis = { issuerName, serialNumber };
        this.IssuerSerialList.push(xis);
    }
    AddSubjectKeyId(subjectKeyId) {
        if (this.SubjectKeyIdList) {
            this.SubjectKeyIdList = [];
        }
        if (typeof subjectKeyId === 'string') {
            if (subjectKeyId != null) {
                const id = Convert.FromBase64(subjectKeyId);
                this.SubjectKeyIdList.push(id);
            }
        }
        else {
            this.SubjectKeyIdList.push(subjectKeyId);
        }
    }
    AddSubjectName(subjectName) {
        if (this.SubjectNameList == null) {
            this.SubjectNameList = [];
        }
        this.SubjectNameList.push(subjectName);
    }
    GetXml() {
        const doc = this.CreateDocument();
        const xel = this.CreateElement(doc);
        const prefix = this.GetPrefix();
        if (this.IssuerSerialList != null && this.IssuerSerialList.length > 0) {
            this.IssuerSerialList.forEach((iser) => {
                const isl = doc.createElementNS(XmlSignature.NamespaceURI, prefix + XmlSignature.ElementNames.X509IssuerSerial);
                const xin = doc.createElementNS(XmlSignature.NamespaceURI, prefix + XmlSignature.ElementNames.X509IssuerName);
                xin.textContent = iser.issuerName;
                isl.appendChild(xin);
                const xsn = doc.createElementNS(XmlSignature.NamespaceURI, prefix + XmlSignature.ElementNames.X509SerialNumber);
                xsn.textContent = iser.serialNumber;
                isl.appendChild(xsn);
                xel.appendChild(isl);
            });
        }
        if (this.SubjectKeyIdList != null && this.SubjectKeyIdList.length > 0) {
            this.SubjectKeyIdList.forEach((skid) => {
                const ski = doc.createElementNS(XmlSignature.NamespaceURI, prefix + XmlSignature.ElementNames.X509SKI);
                ski.textContent = Convert.ToBase64(skid);
                xel.appendChild(ski);
            });
        }
        if (this.SubjectNameList != null && this.SubjectNameList.length > 0) {
            this.SubjectNameList.forEach((subject) => {
                const sn = doc.createElementNS(XmlSignature.NamespaceURI, prefix + XmlSignature.ElementNames.X509SubjectName);
                sn.textContent = subject;
                xel.appendChild(sn);
            });
        }
        if (this.X509CertificateList != null && this.X509CertificateList.length > 0) {
            this.X509CertificateList.forEach((x509) => {
                const cert = doc.createElementNS(XmlSignature.NamespaceURI, prefix + XmlSignature.ElementNames.X509Certificate);
                cert.textContent = Convert.ToBase64(x509.GetRaw());
                xel.appendChild(cert);
            });
        }
        if (this.x509crl != null) {
            const crl = doc.createElementNS(XmlSignature.NamespaceURI, prefix + XmlSignature.ElementNames.X509CRL);
            crl.textContent = Convert.ToBase64(this.x509crl);
            xel.appendChild(crl);
        }
        return xel;
    }
    LoadXml(element) {
        super.LoadXml(element);
        if (this.IssuerSerialList) {
            this.IssuerSerialList = [];
        }
        if (this.SubjectKeyIdList) {
            this.SubjectKeyIdList = [];
        }
        if (this.SubjectNameList) {
            this.SubjectNameList = [];
        }
        if (this.X509CertificateList) {
            this.X509CertificateList = [];
        }
        this.x509crl = null;
        let xnl = this.GetChildren(XmlSignature.ElementNames.X509IssuerSerial);
        if (xnl) {
            xnl.forEach((xel) => {
                const issuer = XmlSignatureObject.GetChild(xel, XmlSignature.ElementNames.X509IssuerName, XmlSignature.NamespaceURI, true);
                const serial = XmlSignatureObject.GetChild(xel, XmlSignature.ElementNames.X509SerialNumber, XmlSignature.NamespaceURI, true);
                if (issuer && issuer.textContent && serial && serial.textContent) {
                    this.AddIssuerSerial(issuer.textContent, serial.textContent);
                }
            });
        }
        xnl = this.GetChildren(XmlSignature.ElementNames.X509SKI);
        if (xnl) {
            xnl.forEach((xel) => {
                if (xel.textContent) {
                    const skid = Convert.FromBase64(xel.textContent);
                    this.AddSubjectKeyId(skid);
                }
            });
        }
        xnl = this.GetChildren(XmlSignature.ElementNames.X509SubjectName);
        if (xnl != null) {
            xnl.forEach((xel) => {
                if (xel.textContent) {
                    this.AddSubjectName(xel.textContent);
                }
            });
        }
        xnl = this.GetChildren(XmlSignature.ElementNames.X509Certificate);
        if (xnl) {
            xnl.forEach((xel) => {
                if (xel.textContent) {
                    const cert = Convert.FromBase64(xel.textContent);
                    this.AddCertificate(new X509Certificate(cert));
                }
            });
        }
        const x509el = this.GetChild(XmlSignature.ElementNames.X509CRL, false);
        if (x509el && x509el.textContent) {
            this.x509crl = Convert.FromBase64(x509el.textContent);
        }
    }
    AddCertificatesChainFrom(_cert, _root) {
    }
};
KeyInfoX509Data = __decorate([
    XmlElement({
        localName: XmlSignature.ElementNames.X509Data,
    }),
    __metadata("design:paramtypes", [Object, Object])
], KeyInfoX509Data);
export { KeyInfoX509Data };
