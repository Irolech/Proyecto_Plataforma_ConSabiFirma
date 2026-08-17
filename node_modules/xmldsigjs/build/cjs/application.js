"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Application = void 0;
const pkijs_1 = require("pkijs");
const xml_core_1 = require("xml-core");
let engineCrypto = null;
class Application {
    static setEngine(name, crypto) {
        engineCrypto = Object.assign(crypto, { name });
        (0, pkijs_1.setEngine)(name, new pkijs_1.CryptoEngine({ name, crypto }));
    }
    static get crypto() {
        if (!engineCrypto) {
            throw new xml_core_1.XmlError(xml_core_1.XE.CRYPTOGRAPHIC_NO_MODULE);
        }
        return engineCrypto;
    }
    static isNodePlugin() {
        return typeof self === 'undefined' && typeof window === 'undefined';
    }
}
exports.Application = Application;
function init() {
    if (!Application.isNodePlugin()) {
        Application.setEngine('W3 WebCrypto module', self.crypto);
    }
}
init();
