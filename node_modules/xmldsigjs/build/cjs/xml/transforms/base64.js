"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XmlDsigBase64Transform = void 0;
const xml_core_1 = require("xml-core");
const transform_js_1 = require("../transform.js");
const xml_names_js_1 = require("../xml_names.js");
class XmlDsigBase64Transform extends transform_js_1.Transform {
    constructor() {
        super(...arguments);
        this.Algorithm = xml_names_js_1.XmlSignature.AlgorithmNamespaces.XmlDsigBase64Transform;
    }
    GetOutput() {
        if (!this.innerXml) {
            throw new xml_core_1.XmlError(xml_core_1.XE.PARAM_REQUIRED, 'innerXml');
        }
        return xml_core_1.Convert.FromString(this.innerXml.textContent || '', 'base64');
    }
}
exports.XmlDsigBase64Transform = XmlDsigBase64Transform;
