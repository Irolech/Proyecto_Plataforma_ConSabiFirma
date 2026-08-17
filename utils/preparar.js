const { PDFDocument, rgb, degrees, StandardFonts, PDFName, PDFString } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

// 🚀 CONFIGURACIÓN DINÁMICA: URL base para la Sede Electrónica y verificación pública
const BASE_URL = process.env.URL_VERIFICACION || 'http://localhost:8085';

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
        fechaStr = String(fechaInput || '');
    }

    // 🛡️ Guard térmico: Evita el colapso si la fecha no viene en formato timestamp estándar
    const partes = fechaStr.split(/[\s,]+/);
    if (partes.length < 2) {
        return `el día ${fechaStr}`;
    }

    const fecha = partes[0];
    const horaCompleta = partes[1];
    const [hora, minutos] = horaCompleta.split(':');
    return `el día ${fecha} a las ${hora}:${minutos || '00'} horas`;
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

        // 1. GENERAR QR Y ENLACES DE INTEGRIDAD DEL DOCUMENTO (CSV)
        const csvTexto = datosTramite.csv || 'PENDI-ENTE-DE-GEN-ERAC-ION';
        const urlValidacion = `${BASE_URL}/validar?csv=${csvTexto}`;
        const urlSede = `${BASE_URL}/validar`;

        const qrBuffer = await QRCode.toBuffer(urlValidacion, { margin: 1, errorCorrectionLevel: 'H' });
        const qrImage = await pdfNuevo.embedPng(qrBuffer);

        // 2. PARÁMETROS GEOMÉTRICOS DE COMPRESIÓN DE MÁRGENES
        const MARGEN_IZQ = 75;
        const MARGEN_INF = 70;
        const Y_INICIAL = 760;
        const Y_MINIMA = 70;
        const ESPACIO_UTIL = Y_INICIAL - Y_MINIMA;
        const HUECO_PUNTOS = 5.67;

        const numFirmas = firmantes.length;
        let alturaCaja = (numFirmas === 1) ? 421 : (ESPACIO_UTIL - ((numFirmas - 1) * HUECO_PUNTOS)) / numFirmas;

        const nombreDoc = datosTramite.nombre || 'Documento Oficial';

        // 3. PROCESAR PÁGINA POR PÁGINA (Escalado e inyección de metadatos)
        for (let index = 0; index < paginasOriginales.length; index++) {
            const paginaActual = paginasOriginales[index];
            const { width, height } = paginaActual.getSize();

            const [paginaEmbebida] = await pdfNuevo.embedPages([paginaActual]);
            const nuevaPagina = pdfNuevo.addPage([width, height]);

            // Reducción proporcional del lienzo original para abrir hueco a las bandas de control técnico
            const escala = Math.min((width - MARGEN_IZQ - 20) / width, (height - MARGEN_INF - 20) / height);
            nuevaPagina.drawPage(paginaEmbebida, {
                x: MARGEN_IZQ + 10,
                y: MARGEN_INF + 5,
                width: width * escala,
                height: height * escala,
            });

            // Arreglo contenedor de anotaciones/enlaces para la página actual
            let annots = nuevaPagina.node.lookup(PDFName.of('Annots'));
            if (!annots) {
                annots = pdfNuevo.context.obj([]);
                nuevaPagina.node.set(PDFName.of('Annots'), annots);
            }

            // =================================================================
            // A. RENDERIZAR PIE DE PÁGINA PÚBLICO
            // =================================================================
            nuevaPagina.drawImage(qrImage, {
                x: MARGEN_IZQ + 10, y: 15, width: 45, height: 45
            });

            nuevaPagina.drawText('Conservatorio Profesional de Música de Sabiñánigo', {
                x: MARGEN_IZQ + 65, y: 52, size: 7, color: rgb(0.1, 0.1, 0.1), font: fontBold
            });

            nuevaPagina.drawText(nombreDoc, {
                x: MARGEN_IZQ + 65, y: 42, size: 7, color: rgb(0.2, 0.2, 0.2), font: fontBold
            });

            const textoEnlace = `CSV: ${csvTexto} - Puede comprobar la validez e integridad de este documento en: ${urlSede}`;
            nuevaPagina.drawText(textoEnlace, {
                x: MARGEN_IZQ + 65, y: 32, size: 6.5, color: rgb(0.3, 0.3, 0.3), font: fontRegular
            });

            // Enlace interactivo al verificador global de CSV
            const anchoTextoEnlace = fontRegular.widthOfTextAtSize(textoEnlace, 6.5);
            const linkCsvObj = pdfNuevo.context.obj({
                Type: 'Annot',
                Subtype: 'Link',
                Rect: [MARGEN_IZQ + 65, 30, MARGEN_IZQ + 65 + anchoTextoEnlace, 40],
                Border: [0, 0, 0],
                A: { Type: 'Action', S: 'URI', URI: PDFString.of(urlValidacion) },
            });
            annots.push(pdfNuevo.context.register(linkCsvObj));

            nuevaPagina.drawText(`Página ${index + 1} de ${paginasOriginales.length}`, {
                x: MARGEN_IZQ + 65, y: 22, size: 6.5, color: rgb(0.5, 0.5, 0.5), font: fontRegular
            });

            // =================================================================
            // B. RENDERIZAR CABECERA DE LA BANDA LATERAL
            // =================================================================
            nuevaPagina.drawRectangle({
                x: 10, y: 790, width: 20, height: 20,
                borderWidth: 1, borderColor: rgb(0.2, 0.2, 0.2), color: rgb(0.95, 0.95, 0.95)
            });
            nuevaPagina.drawText('C', { x: 17, y: 796, size: 7, color: rgb(0.2, 0.2, 0.2), font: fontBold });
            nuevaPagina.drawText('Documento', { x: 35, y: 802, size: 7, color: rgb(0.1, 0.1, 0.1), font: fontBold });
            nuevaPagina.drawText('firmado por:', { x: 35, y: 792, size: 6.5, color: rgb(0.3, 0.3, 0.3), font: fontRegular });

            // =================================================================
            // C. RENDERIZAR METADATOS Y QR DE LAS FIRMAS EN VERTICAL
            // =================================================================
            for (let i = 0; i < numFirmas; i++) {
                const firmante = firmantes[i];
                const y_top = Y_INICIAL - (i * (alturaCaja + HUECO_PUNTOS));
                const y_bottom = y_top - alturaCaja;

                // Dibujar caja contenedora de la firma
                nuevaPagina.drawRectangle({
                    x: 10, y: y_bottom, width: 55, height: alturaCaja,
                    borderWidth: 0.75, borderColor: rgb(0.5, 0.5, 0.5)
                });

                // Si el firmante dispone de UUID de evidencia, estampar su QR y registrar su enlace interactivo
                if (firmante.uuid) {
                    const urlFirmaEvidencia = `${BASE_URL}/verificar/firma/${firmante.uuid}`;
                    const qrFirmaBuffer = await QRCode.toBuffer(urlFirmaEvidencia, { margin: 1, errorCorrectionLevel: 'M' });
                    const qrFirmaImg = await pdfNuevo.embedPng(qrFirmaBuffer);

                    const qrTamano = 30;
                    const qrX = 10 + (55 - qrTamano) / 2; // Centrado horizontalmente en la banda lateral de 55pt
                    const qrY = y_top - qrTamano - 4;

                    nuevaPagina.drawImage(qrFirmaImg, {
                        x: qrX,
                        y: qrY,
                        width: qrTamano,
                        height: qrTamano
                    });

                    // Capa interactiva: Hace clicable toda la caja de la firma hacia su evidencia pública
                    const linkFirmaObj = pdfNuevo.context.obj({
                        Type: 'Annot',
                        Subtype: 'Link',
                        Rect: [10, y_bottom, 65, y_top],
                        Border: [0, 0, 0],
                        A: { Type: 'Action', S: 'URI', URI: PDFString.of(urlFirmaEvidencia) },
                    });
                    annots.push(pdfNuevo.context.register(linkFirmaObj));
                }

                const nombreLimpio = formatearNombre(firmante.nombre);
                const fechaLimpia = formatearFechaHora(firmante.fecha);
                const cargoTexto = firmante.cargo || 'Cargo Oficial';

                let sizeNombre = 7.5;
                let sizeCargo = 6.5;
                let sizeFecha = 6;

                let largoNombre = fontBold.widthOfTextAtSize(nombreLimpio, sizeNombre);
                let largoCargo = fontRegular.widthOfTextAtSize(cargoTexto, sizeCargo);
                let largoFecha = fontRegular.widthOfTextAtSize(fechaLimpia, sizeFecha);

                // Reajuste de límite vertical descontando la altura ocupada por el QR (38pt aprox.)
                const limiteMaximo = firmante.uuid ? (alturaCaja - 42) : (alturaCaja - 10);

                if (largoNombre > limiteMaximo) {
                    sizeNombre = sizeNombre * (limiteMaximo / largoNombre);
                    largoNombre = fontBold.widthOfTextAtSize(nombreLimpio, sizeNombre);
                }
                if (largoCargo > limiteMaximo) {
                    sizeCargo = sizeCargo * (limiteMaximo / largoCargo);
                    largoCargo = fontRegular.widthOfTextAtSize(cargoTexto, sizeCargo);
                }
                if (largoFecha > limiteMaximo) {
                    sizeFecha = sizeFecha * (limiteMaximo / largoFecha);
                    largoFecha = fontRegular.widthOfTextAtSize(fechaLimpia, sizeFecha);
                }

                const paddingNombre = Math.max(0, (limiteMaximo - largoNombre) / 2);
                const paddingCargo = Math.max(0, (limiteMaximo - largoCargo) / 2);
                const paddingFecha = Math.max(0, (limiteMaximo - largoFecha) / 2);

                // Estampado final de textos con rotación a 90 grados
                nuevaPagina.drawText(nombreLimpio, { x: 25, y: y_bottom + paddingNombre, size: sizeNombre, font: fontBold, color: rgb(0.1, 0.1, 0.1), rotate: degrees(90) });
                nuevaPagina.drawText(cargoTexto, { x: 37, y: y_bottom + paddingCargo, size: sizeCargo, font: fontRegular, color: rgb(0.3, 0.3, 0.3), rotate: degrees(90) });
                nuevaPagina.drawText(fechaLimpia, { x: 49, y: y_bottom + paddingFecha, size: sizeFecha, font: fontRegular, color: rgb(0.4, 0.4, 0.4), rotate: degrees(90) });
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