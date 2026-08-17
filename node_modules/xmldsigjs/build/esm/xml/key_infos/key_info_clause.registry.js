import { XmlSignature } from '../xml_names.js';
class KeyInfoClauseRegistry extends Map {
}
export const keyValueRegistry = new KeyInfoClauseRegistry();
import { RsaKeyValue } from './rsa_key.js';
import { EcdsaKeyValue } from './ecdsa_key.js';
keyValueRegistry.set(XmlSignature.ElementNames.RSAKeyValue, RsaKeyValue);
keyValueRegistry.set(XmlSignature.ElementNames.ECDSAKeyValue, EcdsaKeyValue);
