import * as Asn1Js from 'asn1js';
import { Certificate } from 'pkijs';
import { ECDSA } from '../algorithms/ecdsa_sign.js';
import { Application } from '../application.js';
const OID = {
    '2.5.4.3': {
        short: 'CN',
        long: 'CommonName',
    },
    '2.5.4.6': {
        short: 'C',
        long: 'Country',
    },
    '2.5.4.5': {
        long: 'DeviceSerialNumber',
    },
    '0.9.2342.19200300.100.1.25': {
        short: 'DC',
        long: 'DomainComponent',
    },
    '1.2.840.113549.1.9.1': {
        short: 'E',
        long: 'EMail',
    },
    '2.5.4.42': {
        short: 'G',
        long: 'GivenName',
    },
    '2.5.4.43': {
        short: 'I',
        long: 'Initials',
    },
    '2.5.4.7': {
        short: 'L',
        long: 'Locality',
    },
    '2.5.4.10': {
        short: 'O',
        long: 'Organization',
    },
    '2.5.4.11': {
        short: 'OU',
        long: 'OrganizationUnit',
    },
    '2.5.4.8': {
        short: 'ST',
        long: 'State',
    },
    '2.5.4.9': {
        short: 'Street',
        long: 'StreetAddress',
    },
    '2.5.4.4': {
        short: 'SN',
        long: 'SurName',
    },
    '2.5.4.12': {
        short: 'T',
        long: 'Title',
    },
    '1.2.840.113549.1.9.8': {
        long: 'UnstructuredAddress',
    },
    '1.2.840.113549.1.9.2': {
        long: 'UnstructuredName',
    },
};
export class X509Certificate {
    constructor(rawData) {
        this.publicKey = null;
        if (rawData) {
            const buf = new Uint8Array(rawData);
            this.LoadRaw(buf);
            this.raw = buf;
        }
    }
    get SerialNumber() {
        return this.simpl.serialNumber.valueBlock.toString();
    }
    get Issuer() {
        return this.NameToString(this.simpl.issuer);
    }
    get Subject() {
        return this.NameToString(this.simpl.subject);
    }
    async Thumbprint(algName = 'SHA-1') {
        return Application.crypto.subtle.digest(algName, this.raw);
    }
    get PublicKey() {
        return this.publicKey;
    }
    GetRaw() {
        return this.raw;
    }
    async exportKey(algorithm) {
        if (algorithm) {
            const alg = {
                algorithm,
                usages: ['verify'],
            };
            if (alg.algorithm.name.toUpperCase() === ECDSA) {
                const json = this.simpl.subjectPublicKeyInfo.toJSON();
                if ('crv' in json && json.crv) {
                    alg.algorithm.namedCurve = json.crv;
                }
                else {
                    throw new Error('Cannot get Curved name from the ECDSA public key');
                }
            }
            if (this.isHashedAlgorithm(alg.algorithm)) {
                if (typeof alg.algorithm.hash === 'string') {
                    alg.algorithm.hash = { name: alg.algorithm.hash };
                }
            }
            const key = await this.simpl.getPublicKey({ algorithm: alg });
            this.publicKey = key;
            return key;
        }
        if (this.simpl.subjectPublicKeyInfo.algorithm.algorithmId === '1.2.840.113549.1.1.1') {
            this.publicKey = await this.simpl.getPublicKey({
                algorithm: {
                    algorithm: { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
                    usages: ['verify'],
                },
            });
        }
        else {
            this.publicKey = await this.simpl.getPublicKey();
        }
        return this.publicKey;
    }
    NameToString(name, splitter = ',') {
        const res = [];
        name.typesAndValues.forEach((typeAndValue) => {
            const type = typeAndValue.type;
            const oid = OID[type.toString()];
            const name2 = oid ? oid.short : null;
            res.push(`${name2 ? name2 : type}=${typeAndValue.value.valueBlock.value}`);
        });
        return res.join(splitter + ' ');
    }
    LoadRaw(rawData) {
        this.raw = new Uint8Array(rawData);
        const asn1 = Asn1Js.fromBER(this.raw.buffer);
        this.simpl = new Certificate({ schema: asn1.result });
    }
    isHashedAlgorithm(alg) {
        return !!alg['hash'];
    }
}
