// utils/xmlGenerator.js
const crypto = require('crypto');

/**
 * Genera un manifiesto XML de evidencia a partir de los datos de la firma y el buffer del PDF.
 */
function generarManifiestoXML({ uuid, documentoId, userDni, nombreFirmante, cargo, fechaFirma, pdfBuffer }) {
    // Calculamos el hash SHA-256 del PDF firmado para vincular la evidencia
    const sha256Pdf = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<EvidenciaFirma xmlns="http://www.sabifirma.es/expediente/evidencia/v1">
    <Header>
        <UUID>${uuid}</UUID>
        <DocumentoId>${documentoId}</DocumentoId>
        <FechaFirma>${fechaFirma}</FechaFirma>
    </Header>
    <Firmante>
        <DNI>${userDni}</DNI>
        <NombreCompleto>${escapeXml(nombreFirmante)}</NombreCompleto>
        <Cargo>${escapeXml(cargo)}</Cargo>
    </Firmante>
    <DocumentoAsociado>
        <AlgoritmoHash>SHA-256</AlgoritmoHash>
        <HashHex>${sha256Pdf}</HashHex>
    </DocumentoAsociado>
    <DetallesTecnicos>
        <TipoFirma>PAdES-B-LTV</TipoFirma>
        <Origen>AutoFirma Client Web</Origen>
    </DetallesTecnicos>
</EvidenciaFirma>`;

    return xml;
}

function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

module.exports = { generarManifiestoXML };