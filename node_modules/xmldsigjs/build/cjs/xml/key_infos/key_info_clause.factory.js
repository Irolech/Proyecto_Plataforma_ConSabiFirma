"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyInfoClauseFactory = void 0;
const xml_core_1 = require("xml-core");
const key_info_clause_registry_js_1 = require("./key_info_clause.registry.js");
class KeyInfoClauseFactory {
    static create(type) {
        const ctor = key_info_clause_registry_js_1.keyValueRegistry.get(type);
        if (!ctor) {
            throw new xml_core_1.XmlError(xml_core_1.XE.KEY_INFO_CLAUSE_NOT_SUPPORTED, type);
        }
        return new ctor();
    }
}
exports.KeyInfoClauseFactory = KeyInfoClauseFactory;
