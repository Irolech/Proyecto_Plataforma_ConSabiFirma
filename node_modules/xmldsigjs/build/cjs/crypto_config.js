"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoConfig = void 0;
const xml_core_1 = require("xml-core");
const signature_method_js_1 = require("./xml/signature_method.js");
const index_js_1 = require("./xml/index.js");
const index_js_2 = require("./xml/transforms/index.js");
const algorithm_factory_js_1 = require("./algorithm.factory.js");
const algorithm_registry_js_1 = require("./algorithm.registry.js");
const key_info_clause_registry_js_1 = require("./xml/key_infos/key_info_clause.registry.js");
const transform_registry_js_1 = require("./xml/transform.registry.js");
class CryptoConfig {
    static CreateFromName(name) {
        if (!name) {
            throw new xml_core_1.XmlError(xml_core_1.XE.PARAM_REQUIRED, 'name');
        }
        const TransformConstructor = transform_registry_js_1.transformRegistry.get(name);
        if (TransformConstructor) {
            return new TransformConstructor();
        }
        let transform;
        switch (name) {
            case index_js_1.XmlSignature.AlgorithmNamespaces.XmlDsigBase64Transform:
                transform = new index_js_2.XmlDsigBase64Transform();
                break;
            case index_js_1.XmlSignature.AlgorithmNamespaces.XmlDsigC14NTransform:
                transform = new index_js_2.XmlDsigC14NTransform();
                break;
            case index_js_1.XmlSignature.AlgorithmNamespaces.XmlDsigC14NWithCommentsTransform:
                transform = new index_js_2.XmlDsigC14NWithCommentsTransform();
                break;
            case index_js_1.XmlSignature.AlgorithmNamespaces.XmlDsigEnvelopedSignatureTransform:
                transform = new index_js_2.XmlDsigEnvelopedSignatureTransform();
                break;
            case index_js_1.XmlSignature.AlgorithmNamespaces.XmlDsigXPathTransform:
                throw new xml_core_1.XmlError(xml_core_1.XE.ALGORITHM_NOT_SUPPORTED, name);
            case index_js_1.XmlSignature.AlgorithmNamespaces.XmlDsigXsltTransform:
                throw new xml_core_1.XmlError(xml_core_1.XE.ALGORITHM_NOT_SUPPORTED, name);
            case index_js_1.XmlSignature.AlgorithmNamespaces.XmlDsigExcC14NTransform:
                transform = new index_js_2.XmlDsigExcC14NTransform();
                break;
            case index_js_1.XmlSignature.AlgorithmNamespaces.XmlDsigExcC14NWithCommentsTransform:
                transform = new index_js_2.XmlDsigExcC14NWithCommentsTransform();
                break;
            case index_js_1.XmlSignature.AlgorithmNamespaces.XmlDecryptionTransform:
                throw new xml_core_1.XmlError(xml_core_1.XE.ALGORITHM_NOT_SUPPORTED, name);
            default:
                throw new xml_core_1.XmlError(xml_core_1.XE.ALGORITHM_NOT_SUPPORTED, name);
        }
        return transform;
    }
    static CreateSignatureAlgorithm(method) {
        return algorithm_factory_js_1.AlgorithmFactory.createSignatureAlgorithmFromMethod(method);
    }
    static CreateHashAlgorithm(namespace) {
        return algorithm_factory_js_1.AlgorithmFactory.createHashAlgorithmFromNamespace(namespace);
    }
    static GetHashAlgorithm(algorithm) {
        const alg = typeof algorithm === 'string' ? { name: algorithm } : algorithm;
        return algorithm_factory_js_1.AlgorithmFactory.createHashAlgorithmFromAlgorithm(alg);
    }
    static GetSignatureAlgorithm(algorithm) {
        const alg = typeof algorithm === 'string' ? { name: algorithm } : algorithm;
        if ('hash' in alg && typeof alg.hash === 'string') {
            alg.hash = { name: alg.hash };
        }
        return algorithm_factory_js_1.AlgorithmFactory.createSignatureAlgorithmFromAlgorithm(alg);
    }
    static CreateSignatureMethod(algorithm) {
        const signatureMethod = new signature_method_js_1.SignatureMethod();
        signatureMethod.Algorithm = algorithm.namespaceURI;
        if (algorithm.toMethod) {
            algorithm.toMethod(signatureMethod);
        }
        return signatureMethod;
    }
    static RegisterSignatureAlgorithm(namespace, algorithm) {
        algorithm_registry_js_1.algorithmRegistry.set(namespace, {
            type: 'signature',
            algorithm,
        });
    }
    static RegisterHashAlgorithm(namespace, algorithm) {
        algorithm_registry_js_1.algorithmRegistry.set(namespace, {
            type: 'hash',
            algorithm,
        });
    }
    static RegisterKeyInfoClause(localName, keyValue) {
        key_info_clause_registry_js_1.keyValueRegistry.set(localName, keyValue);
    }
    static RegisterTransform(namespace, transform) {
        transform_registry_js_1.transformRegistry.set(namespace, transform);
    }
}
exports.CryptoConfig = CryptoConfig;
