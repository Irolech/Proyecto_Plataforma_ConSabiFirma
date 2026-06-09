const { PDFDocument, rgb, degrees, StandardFonts, PDFName, PDFString } = require('pdf-lib'); // 👈 Añadimos PDFString
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

function formatearNombre(nombre) {
    if (!nombre) return '';
    const nombreSinCortesia = nombre.replace(/^(don|doña|dña|d)\.?\s+/i, '');
    return nombreSinCortesia.toLowerCase().replace(/(^\w|\s\w|[-/]\w)/g, letter => letter.toUpperCase());
}

function formatearFechaHora(fechaInput) {
    let fechaStr = '';
    if (fechaInput instanceof Date) {
        fechaStr = fechaInput.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    } else {
        fechaStr = fechaInput;
    }
    const [fecha, horaCompleta] = fechaStr.split(/[\s,]+/);
    const [hora, minutos] = horaCompleta.split(':');
    return `el día ${fecha} a las ${hora}:${minutos} horas`;
}

async function generarCopiaAutentica(rutaInput, rutaOutput, firmantes, datosTramite = {}) {
    try {
        if (!fs.existsSync(rutaInput)) {
            throw new Error(`El archivo de origen no existe en la ruta: ${rutaInput}`);
        }

        const pdfBytes = fs.readFileSync(rutaInput);
        const pdfOriginal = await PDFDocument.load(pdfBytes);
        const pdfNuevo = await PDFDocument.create();

        const fontRegular = await pdfNuevo.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfNuevo.embedFont(StandardFonts.HelveticaBold);

        const paginasOriginales = pdfOriginal.getPages();

        // 1. GENERAR QR Y RUTAS
        const csvTexto = datosTramite.csv || 'PENDI-ENTE-DE-GEN-ERAC-ION';
        const urlValidacion = `http://localhost:3000/validar?csv=${csvTexto}`;

        const qrBuffer = await QRCode.toBuffer(urlValidacion, { margin: 1, errorCorrectionLevel: 'H' });
        const qrImage = await pdfNuevo.embedPng(qrBuffer);

        // 2. Parámetros geométricos
        const MARGEN_IZQ = 75;
        const MARGEN_INF = 70;
        const Y_INICIAL = 760;
        const Y_MINIMA = 70;
        const ESPACIO_UTIL = Y_INICIAL - Y_MINIMA;
        const HUECO_PUNTOS = 5.67;

        const numFirmas = firmantes.length;
        let alturaCaja = (numFirmas === 1) ? 421 : (ESPACIO_UTIL - ((numFirmas - 1) * HUECO_PUNTOS)) / numFirmas;

        // Datos identificativos para el pie
        const nombreDoc = datosTramite.nombre || 'Documento Oficial';
        const urlSede = 'http://localhost:3000/validar';

        // 3. Procesar página por página
        for (let index = 0; index < paginasOriginales.length; index++) {
            const paginaActual = paginasOriginales[index];
            const { width, height } = paginaActual.getSize();

            const [paginaEmbebida] = await pdfNuevo.embedPages([paginaActual]);
            const nuevaPagina = pdfNuevo.addPage([width, height]);

            const escala = Math.min((width - MARGEN_IZQ - 20) / width, (height - MARGEN_INF - 20) / height);
            nuevaPagina.drawPage(paginaEmbebida, {
                x: MARGEN_IZQ + 10,
                y: MARGEN_INF + 5,
                width: width * escala,
                height: height * escala,
            });

            // ==========================================
            // A. RENDERIZAR PIE DE PÁGINA
            // ==========================================
            nuevaPagina.drawImage(qrImage, {
                x: MARGEN_IZQ + 10, y: 15, width: 45, height: 45
            });

            // Línea 1: Institución
            nuevaPagina.drawText('Conservatorio Profesional de Música de Sabiñánigo', {
                x: MARGEN_IZQ + 65, y: 52, size: 7, color: rgb(0.1, 0.1, 0.1), font: fontBold
            });

            // Línea 2: Nombre del documento
            nuevaPagina.drawText(nombreDoc, {
                x: MARGEN_IZQ + 65, y: 42, size: 7, color: rgb(0.2, 0.2, 0.2), font: fontBold
            });

            // Línea 3: Texto base del CSV y enlace
            const textoEnlace = `CSV: ${csvTexto} - Puede comprobar la validez e integridad de este documento en: ${urlSede}`;
            nuevaPagina.drawText(textoEnlace, {
                x: MARGEN_IZQ + 65, y: 32, size: 6.5, color: rgb(0.3, 0.3, 0.3), font: fontRegular
            });

            // Crear la caja interactiva sobre la línea 3 (enlace al CSV)
            const anchoTextoEnlace = fontRegular.widthOfTextAtSize(textoEnlace, 6.5);

            const linkObj = pdfNuevo.context.obj({
                Type: 'Annot',
                Subtype: 'Link',
                Rect: [
                    MARGEN_IZQ + 65,
                    32 - 2,
                    MARGEN_IZQ + 65 + anchoTextoEnlace,
                    32 + 8
                ],
                Border: [0, 0, 0],
                A: {
                    Type: 'Action',
                    S: 'URI',
                    URI: PDFString.of(urlValidacion), // 🚀 CORRECCIÓN CLAVE AQUÍ
                },
            });

            const linkDictRef = pdfNuevo.context.register(linkObj);

            let annots = nuevaPagina.node.lookup(PDFName.of('Annots'));
            if (!annots) {
                annots = pdfNuevo.context.obj([]);
                nuevaPagina.node.set(PDFName.of('Annots'), annots);
            }
            annots.push(linkDictRef);

            // Línea 4: Página X de Y
            nuevaPagina.drawText(`Página ${index + 1} de ${paginasOriginales.length}`, {
                x: MARGEN_IZQ + 65, y: 22, size: 6.5, color: rgb(0.5, 0.5, 0.5), font: fontRegular
            });

            // ==========================================
            // B. RENDERIZAR CABECERA DE LA BANDA LATERAL
            // ==========================================
            nuevaPagina.drawRectangle({
                x: 10, y: 790, width: 20, height: 20,
                borderWidth: 1, borderColor: rgb(0.2, 0.2, 0.2), color: rgb(0.95, 0.95, 0.95)
            });
            nuevaPagina.drawText('C', { x: 17, y: 796, size: 7, color: rgb(0.2, 0.2, 0.2), font: fontBold });
            nuevaPagina.drawText('Documento', { x: 35, y: 802, size: 7, color: rgb(0.1, 0.1, 0.1), font: fontBold });
            nuevaPagina.drawText('firmado por:', { x: 35, y: 792, size: 6.5, color: rgb(0.3, 0.3, 0.3), font: fontRegular });

            // ==========================================
            // C. RENDERIZAR CAJAS DE FIRMA
            // ==========================================
            for (let i = 0; i < numFirmas; i++) {
                const firmante = firmantes[i];
                const y_top = Y_INICIAL - (i * (alturaCaja + HUECO_PUNTOS));
                const y_bottom = y_top - alturaCaja;

                nuevaPagina.drawRectangle({
                    x: 10, y: y_bottom, width: 55, height: alturaCaja,
                    borderWidth: 0.75, borderColor: rgb(0.5, 0.5, 0.5)
                });

                const nombreLimpio = formatearNombre(firmante.nombre);
                const fechaLimpia = formatearFechaHora(firmante.fecha);
                const largoNombre = fontBold.widthOfTextAtSize(nombreLimpio, 7.5);
                const largoCargo = fontRegular.widthOfTextAtSize(firmante.cargo, 6.5);
                const largoFecha = fontRegular.widthOfTextAtSize(fechaLimpia, 6);

                const paddingNombre = (alturaCaja - largoNombre) / 2;
                const paddingCargo = (alturaCaja - largoCargo) / 2;
                const paddingFecha = (alturaCaja - largoFecha) / 2;

                nuevaPagina.drawText(nombreLimpio, { x: 25, y: y_bottom + paddingNombre, size: 7.5, font: fontBold, color: rgb(0.1, 0.1, 0.1), rotate: degrees(90) });
                nuevaPagina.drawText(firmante.cargo, { x: 37, y: y_bottom + paddingCargo, size: 6.5, font: fontRegular, color: rgb(0.3, 0.3, 0.3), rotate: degrees(90) });
                nuevaPagina.drawText(fechaLimpia, { x: 49, y: y_bottom + paddingFecha, size: 6, font: fontRegular, color: rgb(0.4, 0.4, 0.4), rotate: degrees(90) });
            }
        }

        const pdfResultBytes = await pdfNuevo.save();
        fs.writeFileSync(rutaOutput, pdfResultBytes);
        return true;
    } catch (error) {
        console.error('❌ Error crítico en el módulo de maquetación de firmas:', error);
        throw error;
    }
}

module.exports = { generarCopiaAutentica };