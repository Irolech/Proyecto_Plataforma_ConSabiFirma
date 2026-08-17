import { Convert, Stringify } from 'xml-core';
import { Application } from './application.js';
export class XmlAlgorithm {
    getAlgorithmName() {
        return this.namespaceURI;
    }
}
export class HashAlgorithm extends XmlAlgorithm {
    async Digest(xml) {
        let buf;
        if (typeof xml === 'string') {
            buf = Convert.FromString(xml, 'utf8');
        }
        else if (ArrayBuffer.isView(xml)) {
            buf = new Uint8Array(xml.buffer);
        }
        else if (xml instanceof ArrayBuffer) {
            buf = new Uint8Array(xml);
        }
        else {
            const txt = Stringify(xml);
            buf = Convert.FromString(txt, 'utf8');
        }
        const hash = await Application.crypto.subtle.digest(this.algorithm, buf);
        return new Uint8Array(hash);
    }
}
export class SignatureAlgorithm extends XmlAlgorithm {
    async Sign(signedInfo, signingKey, algorithm) {
        const info = Convert.FromString(signedInfo, 'utf8');
        return Application.crypto.subtle.sign(algorithm, signingKey, info);
    }
    async Verify(signedInfo, key, signatureValue) {
        const alg = this.algorithm;
        const info = Convert.FromString(signedInfo, 'utf8');
        return Application.crypto.subtle.verify(alg, key, signatureValue, info);
    }
}
