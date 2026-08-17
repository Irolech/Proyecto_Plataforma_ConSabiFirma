import { __decorate, __metadata } from "tslib";
import * as XmlCore from 'xml-core';
import { XE, XmlElement, XmlError } from 'xml-core';
import { XmlSignature } from '../xml_names.js';
import { KeyInfoClause } from './key_info_clause.js';
import { KeyInfoClauseFactory } from './key_info_clause.factory.js';
import { keyValueRegistry } from './key_info_clause.registry.js';
let KeyValue = class KeyValue extends KeyInfoClause {
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
        for (const [, ctor] of keyValueRegistry) {
            if (ctor.canImportCryptoKey(key)) {
                const keyValue = new ctor();
                await keyValue.importKey(key);
                this.Value = keyValue;
                return this;
            }
        }
        throw new XmlError(XE.ALGORITHM_NOT_SUPPORTED, key.algorithm.name);
    }
    async exportKey(alg) {
        if (!this.Value) {
            throw new XmlError(XE.NULL_REFERENCE);
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
                const keyValue = KeyInfoClauseFactory.create(type);
                keyValue.LoadXml(nodeKey);
                this.value = keyValue;
                return;
            }
            catch {
            }
        }
        throw new XmlError(XE.CRYPTOGRAPHIC, 'Unsupported KeyValue in use');
    }
};
KeyValue = __decorate([
    XmlElement({
        localName: XmlSignature.ElementNames.KeyValue,
    }),
    __metadata("design:paramtypes", [KeyInfoClause])
], KeyValue);
export { KeyValue };
