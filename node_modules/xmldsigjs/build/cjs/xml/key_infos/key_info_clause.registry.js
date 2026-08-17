"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.keyValueRegistry = void 0;
const xml_names_js_1 = require("../xml_names.js");
class KeyInfoClauseRegistry extends Map {
}
exports.keyValueRegistry = new KeyInfoClauseRegistry();
const rsa_key_js_1 = require("./rsa_key.js");
const ecdsa_key_js_1 = require("./ecdsa_key.js");
exports.keyValueRegistry.set(xml_names_js_1.XmlSignature.ElementNames.RSAKeyValue, rsa_key_js_1.RsaKeyValue);
exports.keyValueRegistry.set(xml_names_js_1.XmlSignature.ElementNames.ECDSAKeyValue, ecdsa_key_js_1.EcdsaKeyValue);
