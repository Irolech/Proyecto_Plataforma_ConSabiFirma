"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlgorithmFactory = void 0;
const xml_core_1 = require("xml-core");
const algorithm_registry_js_1 = require("./algorithm.registry.js");
class AlgorithmFactory {
    static createHashAlgorithmFromNamespace(namespace) {
        for (const [uri, { type, algorithm }] of algorithm_registry_js_1.algorithmRegistry) {
            if (type === 'hash' && uri === namespace) {
                return new algorithm();
            }
        }
        throw new xml_core_1.XmlError(xml_core_1.XE.ALGORITHM_NOT_SUPPORTED, namespace);
    }
    static createSignatureAlgorithmFromMethod(method) {
        for (const [namespaceURI, { type, algorithm: ctor }] of algorithm_registry_js_1.algorithmRegistry) {
            if (type === 'signature' && method.Algorithm === namespaceURI) {
                const signatureAlgorithm = new ctor();
                if (signatureAlgorithm.fromMethod) {
                    signatureAlgorithm.fromMethod(method);
                }
                return signatureAlgorithm;
            }
        }
        throw new xml_core_1.XmlError(xml_core_1.XE.ALGORITHM_NOT_SUPPORTED, method.Algorithm);
    }
    static createHashAlgorithmFromAlgorithm(alg) {
        for (const [, { type, algorithm: ctor }] of algorithm_registry_js_1.algorithmRegistry) {
            if (type === 'hash') {
                const hashAlgorithm = new ctor();
                if (hashAlgorithm.algorithm.name.toUpperCase() === alg.name.toUpperCase()) {
                    return hashAlgorithm;
                }
            }
        }
        throw new xml_core_1.XmlError(xml_core_1.XE.ALGORITHM_NOT_SUPPORTED, alg.name);
    }
    static createSignatureAlgorithmFromAlgorithm(alg) {
        for (const [, { type, algorithm: ctor }] of algorithm_registry_js_1.algorithmRegistry) {
            if (type === 'signature') {
                const signatureAlgorithm = ctor.fromAlgorithm(alg);
                if (signatureAlgorithm) {
                    return signatureAlgorithm;
                }
            }
        }
        throw new xml_core_1.XmlError(xml_core_1.XE.ALGORITHM_NOT_SUPPORTED, alg.name);
    }
}
exports.AlgorithmFactory = AlgorithmFactory;
