"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transforms = void 0;
const tslib_1 = require("tslib");
const xml_core_1 = require("xml-core");
const crypto_config_js_1 = require("../crypto_config.js");
const transform_js_1 = require("./transform.js");
const xml_names_js_1 = require("./xml_names.js");
const xml_object_js_1 = require("./xml_object.js");
let Transforms = class Transforms extends xml_object_js_1.XmlSignatureCollection {
    OnLoadXml(element) {
        super.OnLoadXml(element);
        this.items = this.GetIterator().map((item) => {
            switch (item.Algorithm) {
                case xml_names_js_1.XmlSignature.AlgorithmNamespaces.XmlDsigEnvelopedSignatureTransform:
                    return ChangeTransform(item, transforms.XmlDsigEnvelopedSignatureTransform);
                case xml_names_js_1.XmlSignature.AlgorithmNamespaces.XmlDsigC14NTransform:
                    return ChangeTransform(item, transforms.XmlDsigC14NTransform);
                case xml_names_js_1.XmlSignature.AlgorithmNamespaces.XmlDsigC14NWithCommentsTransform:
                    return ChangeTransform(item, transforms.XmlDsigC14NWithCommentsTransform);
                case xml_names_js_1.XmlSignature.AlgorithmNamespaces.XmlDsigExcC14NTransform:
                    return ChangeTransform(item, transforms.XmlDsigExcC14NTransform);
                case xml_names_js_1.XmlSignature.AlgorithmNamespaces.XmlDsigExcC14NWithCommentsTransform:
                    return ChangeTransform(item, transforms.XmlDsigExcC14NWithCommentsTransform);
                case xml_names_js_1.XmlSignature.AlgorithmNamespaces.XmlDsigBase64Transform:
                    return ChangeTransform(item, transforms.XmlDsigBase64Transform);
                case xml_names_js_1.XmlSignature.AlgorithmNamespaces.XmlDsigXPathTransform:
                    return ChangeTransform(item, transforms.XmlDsigXPathTransform);
                default:
                    try {
                        const customTransform = crypto_config_js_1.CryptoConfig.CreateFromName(item.Algorithm);
                        if (!item.Element) {
                            throw new Error('Transform element is not defined');
                        }
                        customTransform.LoadXml(item.Element);
                        return customTransform;
                    }
                    catch {
                        throw new xml_core_1.XmlError(xml_core_1.XE.CRYPTOGRAPHIC_UNKNOWN_TRANSFORM, item.Algorithm);
                    }
            }
        });
    }
};
exports.Transforms = Transforms;
exports.Transforms = Transforms = tslib_1.__decorate([
    (0, xml_core_1.XmlElement)({
        localName: xml_names_js_1.XmlSignature.ElementNames.Transforms,
        parser: transform_js_1.Transform,
    })
], Transforms);
function ChangeTransform(t1, t2) {
    const t = new t2();
    if (!t1.Element) {
        throw new Error('Transform element is not defined');
    }
    t.LoadXml(t1.Element);
    return t;
}
const transforms = tslib_1.__importStar(require("./transforms/index.js"));
