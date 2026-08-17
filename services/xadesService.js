// services/xadesService.js
const fs = require('fs');
const crypto = require('crypto');
const forge = require('node-forge');
const { DOMParser } = require('@xmldom/xmldom');
const { Crypto } = require('@peculiar/webcrypto');
const xadesjs = require('xadesjs');

const webCrypto = new Crypto();
xadesjs.Application.setEngine('NodeJS', webCrypto);

function crearXmlBase(archivos) {
  let docsXml = '';
  archivos.forEach((archivo, index) => {
    const fileBuffer = fs.readFileSync(archivo.path);
    const hashSha512 = crypto.createHash('sha512').update(fileBuffer).digest('base64');
    const salt = crypto.randomBytes(16).toString('hex');

    docsXml += `
      <documento id="DOC_${index + 1}">
        <nombre>${archivo.nombre}</nombre>
        <hash_sha512>${hashSha512}</hash_sha512>
        <salt>${salt}</salt>
      </documento>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<documentos_firmados>
  ${docsXml}
</documentos_firmados>`;
}

function cargarCertificadoP12(p12Path, password) {
  const p12Buffer = fs.readFileSync(p12Path);
  const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

  let privateKeyPem = null;
  let certPem = null;

  for (const bagType of Object.keys(p12.bags)) {
    const bags = p12.bags[bagType];
    for (const bag of bags) {
      if (bag.key) privateKeyPem = forge.pki.privateKeyToPem(bag.key);
      if (bag.cert) certPem = forge.pki.certificateToPem(bag.cert);
    }
  }

  return { privateKeyPem, certPem };
}

function pemToBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, '')
    .replace(/-----END [A-Z ]+-----/g, '')
    .replace(/\r?\n|\r/g, '');
  return Buffer.from(b64, 'base64');
}

async function firmarDocumentosXAdES(archivos, p12Path, p12Password) {
  const xmlString = crearXmlBase(archivos);
  const xmlDoc = new DOMParser().parseFromString(xmlString, 'application/xml');
  const { privateKeyPem, certPem } = cargarCertificadoP12(p12Path, p12Password);

  const privateKey = await webCrypto.subtle.importKey(
    'pkcs8',
    pemToBuffer(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' },
    false,
    ['sign']
  );

  const signedXml = new xadesjs.SignedXml();
  signedXml.SignedProperties.SignedSignatureProperties.SigningTime.Value = new Date();

  const certRaw = certPem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\r?\n|\r/g, '');

  await signedXml.Sign(
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' },
    privateKey,
    xmlDoc,
    {
      keyValue: certRaw,
      references: [{ transforms: ['enveloped'], hash: 'SHA-512' }]
    }
  );

  return signedXml.toString();
}

module.exports = { firmarDocumentosXAdES };