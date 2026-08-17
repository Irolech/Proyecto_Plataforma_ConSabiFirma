"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.algorithmRegistry = void 0;
class AlgorithmRegistry extends Map {
}
exports.algorithmRegistry = new AlgorithmRegistry();
const index_js_1 = require("./algorithms/index.js");
exports.algorithmRegistry.set(index_js_1.RSA_PKCS1_SHA1_NAMESPACE, {
    type: 'signature',
    algorithm: index_js_1.RsaPkcs1Sha1,
});
exports.algorithmRegistry.set(index_js_1.RSA_PKCS1_SHA256_NAMESPACE, {
    type: 'signature',
    algorithm: index_js_1.RsaPkcs1Sha256,
});
exports.algorithmRegistry.set(index_js_1.RSA_PKCS1_SHA384_NAMESPACE, {
    type: 'signature',
    algorithm: index_js_1.RsaPkcs1Sha384,
});
exports.algorithmRegistry.set(index_js_1.RSA_PKCS1_SHA512_NAMESPACE, {
    type: 'signature',
    algorithm: index_js_1.RsaPkcs1Sha512,
});
exports.algorithmRegistry.set(index_js_1.RSA_PKCS1_SHA1_NAMESPACE, {
    type: 'signature',
    algorithm: index_js_1.RsaPkcs1Sha1,
});
exports.algorithmRegistry.set(index_js_1.RSA_PKCS1_SHA256_NAMESPACE, {
    type: 'signature',
    algorithm: index_js_1.RsaPkcs1Sha256,
});
exports.algorithmRegistry.set(index_js_1.RSA_PKCS1_SHA384_NAMESPACE, {
    type: 'signature',
    algorithm: index_js_1.RsaPkcs1Sha384,
});
exports.algorithmRegistry.set(index_js_1.RSA_PKCS1_SHA512_NAMESPACE, {
    type: 'signature',
    algorithm: index_js_1.RsaPkcs1Sha512,
});
exports.algorithmRegistry.set(index_js_1.RSA_PSS_WITH_PARAMS_NAMESPACE, {
    type: 'signature',
    algorithm: index_js_1.RsaPssWithParams,
});
exports.algorithmRegistry.set(index_js_1.RSA_PSS_SHA1_NAMESPACE, {
    type: 'signature',
    algorithm: index_js_1.RsaPssWithoutParamsSha1,
});
exports.algorithmRegistry.set(index_js_1.RSA_PSS_SHA256_NAMESPACE, {
    type: 'signature',
    algorithm: index_js_1.RsaPssWithoutParamsSha256,
});
exports.algorithmRegistry.set(index_js_1.RSA_PSS_SHA384_NAMESPACE, {
    type: 'signature',
    algorithm: index_js_1.RsaPssWithoutParamsSha384,
});
exports.algorithmRegistry.set(index_js_1.RSA_PSS_SHA512_NAMESPACE, {
    type: 'signature',
    algorithm: index_js_1.RsaPssWithoutParamsSha512,
});
exports.algorithmRegistry.set(index_js_1.ECDSA_SHA1_NAMESPACE, {
    type: 'signature',
    algorithm: index_js_1.EcdsaSha1,
});
exports.algorithmRegistry.set(index_js_1.ECDSA_SHA256_NAMESPACE, {
    type: 'signature',
    algorithm: index_js_1.EcdsaSha256,
});
exports.algorithmRegistry.set(index_js_1.ECDSA_SHA384_NAMESPACE, {
    type: 'signature',
    algorithm: index_js_1.EcdsaSha384,
});
exports.algorithmRegistry.set(index_js_1.ECDSA_SHA512_NAMESPACE, {
    type: 'signature',
    algorithm: index_js_1.EcdsaSha512,
});
exports.algorithmRegistry.set(index_js_1.ECDSA_SHA1_NAMESPACE.toUpperCase(), {
    type: 'signature',
    algorithm: index_js_1.EcdsaSha1,
});
exports.algorithmRegistry.set(index_js_1.ECDSA_SHA256_NAMESPACE.toUpperCase(), {
    type: 'signature',
    algorithm: index_js_1.EcdsaSha256,
});
exports.algorithmRegistry.set(index_js_1.ECDSA_SHA384_NAMESPACE.toUpperCase(), {
    type: 'signature',
    algorithm: index_js_1.EcdsaSha384,
});
exports.algorithmRegistry.set(index_js_1.ECDSA_SHA512_NAMESPACE.toUpperCase(), {
    type: 'signature',
    algorithm: index_js_1.EcdsaSha512,
});
exports.algorithmRegistry.set(index_js_1.HMAC_SHA1_NAMESPACE, {
    type: 'signature',
    algorithm: index_js_1.HmacSha1,
});
exports.algorithmRegistry.set(index_js_1.HMAC_SHA256_NAMESPACE, {
    type: 'signature',
    algorithm: index_js_1.HmacSha256,
});
exports.algorithmRegistry.set(index_js_1.HMAC_SHA384_NAMESPACE, {
    type: 'signature',
    algorithm: index_js_1.HmacSha384,
});
exports.algorithmRegistry.set(index_js_1.HMAC_SHA512_NAMESPACE, {
    type: 'signature',
    algorithm: index_js_1.HmacSha512,
});
exports.algorithmRegistry.set(index_js_1.SHA1_NAMESPACE, {
    type: 'hash',
    algorithm: index_js_1.Sha1,
});
exports.algorithmRegistry.set(index_js_1.SHA256_NAMESPACE, {
    type: 'hash',
    algorithm: index_js_1.Sha256,
});
exports.algorithmRegistry.set(index_js_1.SHA384_NAMESPACE, {
    type: 'hash',
    algorithm: index_js_1.Sha384,
});
exports.algorithmRegistry.set(index_js_1.SHA512_NAMESPACE, {
    type: 'hash',
    algorithm: index_js_1.Sha512,
});
