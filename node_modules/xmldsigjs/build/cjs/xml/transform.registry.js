"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformRegistry = void 0;
const index_js_1 = require("./transforms/index.js");
const xml_names_js_1 = require("./xml_names.js");
class TransformRegistry extends Map {
}
exports.transformRegistry = new TransformRegistry();
exports.transformRegistry.set(xml_names_js_1.XmlSignature.AlgorithmNamespaces.XmlDsigBase64Transform, index_js_1.XmlDsigBase64Transform);
exports.transformRegistry.set(xml_names_js_1.XmlSignature.AlgorithmNamespaces.XmlDsigC14NTransform, index_js_1.XmlDsigC14NTransform);
exports.transformRegistry.set(xml_names_js_1.XmlSignature.AlgorithmNamespaces.XmlDsigC14NWithCommentsTransform, index_js_1.XmlDsigC14NWithCommentsTransform);
exports.transformRegistry.set(xml_names_js_1.XmlSignature.AlgorithmNamespaces.XmlDsigEnvelopedSignatureTransform, index_js_1.XmlDsigEnvelopedSignatureTransform);
exports.transformRegistry.set(xml_names_js_1.XmlSignature.AlgorithmNamespaces.XmlDsigExcC14NTransform, index_js_1.XmlDsigExcC14NTransform);
exports.transformRegistry.set(xml_names_js_1.XmlSignature.AlgorithmNamespaces.XmlDsigExcC14NWithCommentsTransform, index_js_1.XmlDsigExcC14NWithCommentsTransform);
