"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyValue = void 0;
const tslib_1 = require("tslib");
const XmlCore = tslib_1.__importStar(require("xml-core"));
const xml_core_1 = require("xml-core");
const xml_names_js_1 = require("../xml_names.js");
const key_info_clause_js_1 = require("./key_info_clause.js");
const key_info_clause_factory_js_1 = require("./key_info_clause.factory.js");
const key_info_clause_registry_js_1 = require("./key_info_clause.registry.js");
let KeyValue = class KeyValue extends key_info_clause_js_1.KeyInfoClause {
    set Value(v) {
        this.element = null;
        this.value = v;
    }
    get Value() {
        return this.value;
    }
    constructor(value) {
        super();
        if (value) {
            this.Value = value;
        }
    }
    async importKey(key) {
        for (const [, ctor] of key_info_clause_registry_js_1.keyValueRegistry) {
            if (ctor.canImportCryptoKey(key)) {
                const keyValue = new ctor();
                await keyValue.importKey(key);
                this.Value = keyValue;
                return this;
            }
        }
        throw new xml_core_1.XmlError(xml_core_1.XE.ALGORITHM_NOT_SUPPORTED, key.algorithm.name);
    }
    async exportKey(alg) {
        if (!this.Value) {
            throw new xml_core_1.XmlError(xml_core_1.XE.NULL_REFERENCE);
        }
        return this.Value.exportKey(alg);
    }
    OnGetXml(element) {
        if (!this.Value) {
            throw new XmlCore.XmlError(XmlCore.XE.CRYPTOGRAPHIC, 'KeyValue has empty value');
        }
        const node = this.Value.GetXml();
        if (node) {
            element.appendChild(node);
        }
    }
    OnLoadXml(element) {
        for (let i = 0; i < element.childNodes.length; i++) {
            const nodeKey = element.childNodes.item(i);
            if (!XmlCore.isElement(nodeKey)) {
                continue;
            }
            try {
                const type = nodeKey.localName;
                const keyValue = key_info_clause_factory_js_1.KeyInfoClauseFactory.create(type);
                keyValue.LoadXml(nodeKey);
                this.value = keyValue;
                return;
            }
            catch {
            }
        }
        throw new xml_core_1.XmlError(xml_core_1.XE.CRYPTOGRAPHIC, 'Unsupported KeyValue in use');
    }
};
exports.KeyValue = KeyValue;
exports.KeyValue = KeyValue = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: xml_names_js_1.XmlSignature.ElementNames.KeyValue,
    }),
    tslib_1.__metadata("design:paramtypes", [key_info_clause_js_1.KeyInfoClause])
], KeyValue);
