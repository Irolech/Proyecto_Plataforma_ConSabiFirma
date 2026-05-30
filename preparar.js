const { PDFDocument, rgb } = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const db = require('./database.js');

/**
 * @param {string} rutaInput - Ruta del archivo original subido
 * @param {string} nombreOriginal - Nombre real del archivo (ej: "Contrato.pdf")
 * @param {Array} listaDnis - Array de DNIs: ['12345678A', '87654321B']
 * @param {boolean} esSecuencial - true para orden 1,2,3... false para orden 0 (todos a la vez)
 */
async function prepararDocumento(rutaInput, nombreOriginal, listaDnis, esSecuencial = false) {
    try {
        const carpetaOriginales = './documentos_originales';
        const carpetaTrabajo = './documentos_preparados';
        
        // Creamos carpetas si no existen
        [carpetaOriginales, carpetaTrabajo].forEach(c => {
            if (!fs.existsSync(c)) fs.mkdirSync(c);
        });

        // 1. Guardamos una copia del ORIGINAL LIMPIO
        const nombreUnico = `${Date.now()}_${nombreOriginal}`;
        const rutaCopiaOriginal = path.join(carpetaOriginales, nombreUnico);
        fs.copyFileSync(rutaInput, rutaCopiaOriginal);

        // 2. Procesamos el PDF para crear la versión de TRABAJO (con QR y márgenes)
        const pdfBytes = fs.readFileSync(rutaInput);
        const pdfOriginal = await PDFDocument.load(pdfBytes);
        const pdfNuevo = await PDFDocument.create();

        // Generar QR (usamos el nombre único como ID de rastreo)
        const qrDataUrl = await QRCode.toDataURL(`Verificación: ${nombreUnico}`);
        const qrImage = await pdfNuevo.embedPng(qrDataUrl);

        const paginas = pdfOriginal.getPageIndices();
        for (const indice of paginas) {
            const paginaOriginal = pdfOriginal.getPage(indice);
            const { width, height } = paginaOriginal.getSize();
            const nuevaPagina = pdfNuevo.addPage([width, height]);
            const [paginaIncrustada] = await pdfNuevo.embedPages([paginaOriginal]);

            const MARGEN_IZQ = 50;
            const MARGEN_INF = 70;

            // Franja lateral gris
            nuevaPagina.drawRectangle({
                x: 0, y: 0, width: MARGEN_IZQ - 5, height: height,
                color: rgb(0.96, 0.96, 0.96),
            });

            const escala = Math.min((width - MARGEN_IZQ - 20) / width, (height - MARGEN_INF - 20) / height);

            nuevaPagina.drawPage(paginaIncrustada, {
                x: MARGEN_IZQ + 10, y: MARGEN_INF + 5,
                width: width * escala, height: height * escala,
            });

            nuevaPagina.drawImage(qrImage, { x: MARGEN_IZQ + 10, y: 15, width: 45, height: 45 });
            nuevaPagina.drawText(`Ref: ${nombreUnico}`, { x: MARGEN_IZQ + 65, y: 35, size: 8, color: rgb(0.4, 0.4, 0.4) });
        }

        const rutaPDFTrabajo = path.join(carpetaTrabajo, `PREP_${nombreUnico}`);
        const pdfModificadoBytes = await pdfNuevo.save();
        fs.writeFileSync(rutaPDFTrabajo, pdfModificadoBytes);

        // 3. INSERCIÓN EN BASE DE DATOS (Transaccional)
        db.serialize(() => {
            // A. Insertar el documento
            const stmtDoc = db.prepare(`INSERT INTO documentos (nombre, ruta_original, ruta_trabajo) VALUES (?, ?, ?)`);
            stmtDoc.run([nombreOriginal, rutaCopiaOriginal, rutaPDFTrabajo], function(err) {
                if (err) return console.error("Error al insertar doc:", err);
                
                const documentoId = this.lastID;

                // B. Insertar los firmantes
                const stmtFirmante = db.prepare(`INSERT INTO firmantes (documento_id, dni_firmante, orden) VALUES (?, ?, ?)`);
                listaDnis.forEach((dni, index) => {
                    const ordenAsignado = esSecuencial ? (index + 1) : 0;
                    stmtFirmante.run([documentoId, dni, ordenAsignado]);
                });
                stmtFirmante.finalize();

                // C. Auditoría
                db.run(`INSERT INTO auditoria (documento_id, accion, detalles) VALUES (?, ?, ?)`,
                    [documentoId, 'PREPARACION', `Creado para DNIs: ${listaDnis.join(', ')} (Secuencial: ${esSecuencial})`]);

                console.log(`✅ Todo listo. ID de sistema: ${documentoId}`);
            });
            stmtDoc.finalize();
        });

    } catch (error) {
        console.error('Error total:', error);
    }
}

// EJEMPLO DE USO:
// prepararDocumento('contrato.pdf', 'Contrato_Alquiler.pdf', ['12345678A', '87654321B'], true);

module.exports = { prepararDocumento };