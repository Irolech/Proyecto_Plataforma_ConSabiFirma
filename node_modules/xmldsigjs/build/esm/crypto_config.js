import { XE, XmlError } from 'xml-core';
import { SignatureMethod } from './xml/signature_method.js';
import { XmlSignature } from './xml/index.js';
import { XmlDsigBase64Transform, XmlDsigC14NTransform, XmlDsigC14NWithCommentsTransform, XmlDsigEnvelopedSignatureTransform, XmlDsigExcC14NTransform, XmlDsigExcC14NWithCommentsTransform, } from './xml/transforms/index.js';
import { AlgorithmFactory } from './algorithm.factory.js';
import { algorithmRegistry } from './algorithm.registry.js';
import { keyValueRegistry } from './xml/key_infos/key_info_clause.registry.js';
import { transformRegistry } from './xml/transform.registry.js';
export class CryptoConfig {
    static CreateFromName(name) {
        if (!name) {
            throw new XmlError(XE.PARAM_REQUIRED, 'name');
        }
        const TransformConstructor = transformRegistry.get(name);
        if (TransformConstructor) {
            return new TransformConstructor();
        }
        let transform;
        switch (name) {
            case XmlSignature.AlgorithmNamespaces.XmlDsigBase64Transform:
                transform = new XmlDsigBase64Transform();
                break;
            case XmlSignature.AlgorithmNamespaces.XmlDsigC14NTransform:
                transform = new XmlDsigC14NTransform();
                break;
            case XmlSignature.AlgorithmNamespaces.XmlDsigC14NWithCommentsTransform:
                transform = new XmlDsigC14NWithCommentsTransform();
                break;
            case XmlSignature.AlgorithmNamespaces.XmlDsigEnvelopedSignatureTransform:
                transform = new XmlDsigEnvelopedSignatureTransform();
                break;
            case XmlSignature.AlgorithmNamespaces.XmlDsigXPathTransform:
                throw new XmlError(XE.ALGORITHM_NOT_SUPPORTED, name);
            case XmlSignature.AlgorithmNamespaces.XmlDsigXsltTransform:
                throw new XmlError(XE.ALGORITHM_NOT_SUPPORTED, name);
            case XmlSignature.AlgorithmNamespaces.XmlDsigExcC14NTransform:
                transform = new XmlDsigExcC14NTransform();
                break;
            case XmlSignature.AlgorithmNamespaces.XmlDsigExcC14NWithCommentsTransform:
                transform = new XmlDsigExcC14NWithCommentsTransform();
                break;
            case XmlSignature.AlgorithmNamespaces.XmlDecryptionTransform:
                throw new XmlError(XE.ALGORITHM_NOT_SUPPORTED, name);
            default:
                throw new XmlError(XE.ALGORITHM_NOT_SUPPORTED, name);
        }
        return transform;
    }
    static CreateSignatureAlgorithm(method) {
        return AlgorithmFactory.createSignatureAlgorithmFromMethod(method);
    }
    static CreateHashAlgorithm(namespace) {
        return AlgorithmFactory.createHashAlgorithmFromNamespace(namespace);
    }
    static GetHashAlgorithm(algorithm) {
        const alg = typeof algorithm === 'string' ? { name: algorithm } : algorithm;
        return AlgorithmFactory.createHashAlgorithmFromAlgorithm(alg);
    }
    static GetSignatureAlgorithm(algorithm) {
        const alg = typeof algorithm === 'string' ? { name: algorithm } : algorithm;
        if ('hash' in alg && typeof alg.hash === 'string') {
            alg.hash = { name: alg.hash };
        }
        return AlgorithmFactory.createSignatureAlgorithmFromAlgorithm(alg);
    }
    static CreateSignatureMethod(algorithm) {
        const signatureMethod = new SignatureMethod();
        signatureMethod.Algorithm = algorithm.namespaceURI;
        if (algorithm.toMethod) {
            algorithm.toMethod(signatureMethod);
        }
        return signatureMethod;
    }
    static RegisterSignatureAlgorithm(namespace, algorithm) {
        algorithmRegistry.set(namespace, {
            type: 'signature',
            algorithm,
        });
    }
    static RegisterHashAlgorithm(namespace, algorithm) {
        algorithmRegistry.set(namespace, {
            type: 'hash',
            algorithm,
        });
    }
    static RegisterKeyInfoClause(localName, keyValue) {
        keyValueRegistry.set(localName, keyValue);
    }
    static RegisterTransform(namespace, transform) {
        transformRegistry.set(namespace, transform);
    }
}
