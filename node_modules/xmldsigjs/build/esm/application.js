import { CryptoEngine, setEngine } from 'pkijs';
import { XE, XmlError } from 'xml-core';
let engineCrypto = null;
export class Application {
    static setEngine(name, crypto) {
        engineCrypto = Object.assign(crypto, { name });
        setEngine(name, new CryptoEngine({ name, crypto }));
    }
    static get crypto() {
        if (!engineCrypto) {
            throw new XmlError(XE.CRYPTOGRAPHIC_NO_MODULE);
        }
        return engineCrypto;
    }
    static isNodePlugin() {
        return typeof self === 'undefined' && typeof window === 'undefined';
    }
}
function init() {
    if (!Application.isNodePlugin()) {
        Application.setEngine('W3 WebCrypto module', self.crypto);
    }
}
init();
