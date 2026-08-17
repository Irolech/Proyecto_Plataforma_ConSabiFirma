"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignatureAlgorithm = exports.HashAlgorithm = exports.XmlAlgorithm = void 0;
const xml_core_1 = require("xml-core");
const application_js_1 = require("./application.js");
class XmlAlgorithm {
    getAlgorithmName() {
        return this.namespaceURI;
    }
}
exports.XmlAlgorithm = XmlAlgorithm;
class HashAlgorithm extends XmlAlgorithm {
    async Digest(xml) {
        let buf;
        if (typeof xml === 'string') {
            buf = xml_core_1.Convert.FromString(xml, 'utf8');
        }
        else if (ArrayBuffer.isView(xml)) {
            buf = new Uint8Array(xml.buffer);
        }
        else if (xml instanceof ArrayBuffer) {
            buf = new Uint8Array(xml);
        }
        else {
            const txt = (0, xml_core_1.Stringify)(xml);
            buf = xml_core_1.Convert.FromString(txt, 'utf8');
        }
        const hash = await application_js_1.Application.crypto.subtle.digest(this.algorithm, buf);
        return new Uint8Array(hash);
    }
}
exports.HashAlgorithm = HashAlgorithm;
class SignatureAlgorithm extends XmlAlgorithm {
    async Sign(signedInfo, signingKey, algorithm) {
        const info = xml_core_1.Convert.FromString(signedInfo, 'utf8');
        return application_js_1.Application.crypto.subtle.sign(algorithm, signingKey, info);
    }
    async Verify(signedInfo, key, signatureValue) {
        const alg = this.algorithm;
        const info = xml_core_1.Convert.FromString(signedInfo, 'utf8');
        return application_js_1.Application.crypto.subtle.verify(alg, key, signatureValue, info);
    }
}
exports.SignatureAlgorithm = SignatureAlgorithm;
