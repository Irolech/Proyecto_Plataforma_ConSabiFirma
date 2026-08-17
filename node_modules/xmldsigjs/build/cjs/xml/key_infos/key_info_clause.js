"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyInfoClause = void 0;
const xml_object_js_1 = require("../xml_object.js");
class KeyInfoClause extends xml_object_js_1.XmlSignatureObject {
    static canImportCryptoKey(_key) {
        return false;
    }
}
exports.KeyInfoClause = KeyInfoClause;
