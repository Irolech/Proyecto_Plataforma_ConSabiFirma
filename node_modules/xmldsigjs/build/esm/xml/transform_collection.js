import { __decorate } from "tslib";
import { XE, XmlError, XmlElement } from 'xml-core';
import { CryptoConfig } from '../crypto_config.js';
import { Transform } from './transform.js';
import { XmlSignature } from './xml_names.js';
import { XmlSignatureCollection } from './xml_object.js';
let Transforms = class Transforms extends XmlSignatureCollection {
    OnLoadXml(element) {
        super.OnLoadXml(element);
        this.items = this.GetIterator().map((item) => {
            switch (item.Algorithm) {
                case XmlSignature.AlgorithmNamespaces.XmlDsigEnvelopedSignatureTransform:
                    return ChangeTransform(item, transforms.XmlDsigEnvelopedSignatureTransform);
                case XmlSignature.AlgorithmNamespaces.XmlDsigC14NTransform:
                    return ChangeTransform(item, transforms.XmlDsigC14NTransform);
                case XmlSignature.AlgorithmNamespaces.XmlDsigC14NWithCommentsTransform:
                    return ChangeTransform(item, transforms.XmlDsigC14NWithCommentsTransform);
                case XmlSignature.AlgorithmNamespaces.XmlDsigExcC14NTransform:
                    return ChangeTransform(item, transforms.XmlDsigExcC14NTransform);
                case XmlSignature.AlgorithmNamespaces.XmlDsigExcC14NWithCommentsTransform:
                    return ChangeTransform(item, transforms.XmlDsigExcC14NWithCommentsTransform);
                case XmlSignature.AlgorithmNamespaces.XmlDsigBase64Transform:
                    return ChangeTransform(item, transforms.XmlDsigBase64Transform);
                case XmlSignature.AlgorithmNamespaces.XmlDsigXPathTransform:
                    return ChangeTransform(item, transforms.XmlDsigXPathTransform);
                default:
                    try {
                        const customTransform = CryptoConfig.CreateFromName(item.Algorithm);
                        if (!item.Element) {
                            throw new Error('Transform element is not defined');
                        }
                        customTransform.LoadXml(item.Element);
                        return customTransform;
                    }
                    catch {
                        throw new XmlError(XE.CRYPTOGRAPHIC_UNKNOWN_TRANSFORM, item.Algorithm);
                    }
            }
        });
    }
};
Transforms = __decorate([
    XmlElement({
        localName: XmlSignature.ElementNames.Transforms,
        parser: Transform,
    })
], Transforms);
export { Transforms };
function ChangeTransform(t1, t2) {
    const t = new t2();
    if (!t1.Element) {
        throw new Error('Transform element is not defined');
    }
    t.LoadXml(t1.Element);
    return t;
}
import * as transforms from './transforms/index.js';
