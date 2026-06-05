const { PDFDocument, rgb, degrees, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

/**
 * Elimina tratamientos de cortesía (Don/Doña/D./Dña) y pasa a formato Título.
 * @param {string} nombre - Nombre completo en mayúsculas.
 * @returns {string} Nombre limpio y formateado.
 */
function formatearNombre(nombre) {
    if (!nombre) return '';
    const nombreSinCortesia = nombre.replace(/^(don|doña|dña|d)\.?\s+/i, '');
    return nombreSinCortesia.toLowerCase().replace(/(^\w|\s\w|[-/]\w)/g, letter => letter.toUpperCase());
}

/**
 * Transforma un string de fecha u objeto Date en la frase oficial para la banda.
 * @param {string|Date} fechaInput - Fecha de la firma.
 * @returns {string} Frase formateada.
 */
function formatearFechaHora(fechaInput) {
    let fechaStr = '';
    if (fechaInput instanceof Date) {
        fechaStr = fechaInput.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }); // ej: "5/6/2026, 18:30:00"
    } else {
        fechaStr = fechaInput;
    }

    // Si viene en formato "DD/MM/AAAA HH:MM:SS"
    const [fecha, horaCompleta] = fechaStr.split(/[\s,]+/);
    const [hora, minutos] = horaCompleta.split(':');
    return `el día ${fecha} a las ${hora}:${minutos} horas`;
}

/**
 * Motor principal para generar la Representación Gráfica (Copia Auténtica) del PDF.
 * @param {string} rutaInput - Ruta del PDF multi-firmado original.
 * @param {string} rutaOutput - Ruta donde se guardará el PDF visado final.
 * @param {Array} firmantes - Array de objetos [{nombre, cargo, fecha}].
 * @param {Object} datosTramite - Datos para el pie de página {csv, referencia}.
 */
async function generarCopiaAutentica(rutaInput, rutaOutput, firmantes, datosTramite = {}) {
    try {
        if (!fs.existsSync(rutaInput)) {
            throw new Error(`El archivo de origen no existe en la ruta: ${rutaInput}`);
        }

        // 1. Cargar documentos y preparar lienzos
        const pdfBytes = fs.readFileSync(rutaInput);
        const pdfOriginal = await PDFDocument.load(pdfBytes);
        const pdfNuevo = await PDFDocument.create();

        // Cargar tipografías del sistema para cálculos métricos
        const fontRegular = await pdfNuevo.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfNuevo.embedFont(StandardFonts.HelveticaBold);

        const paginasOriginales = pdfOriginal.getPages();

        // 2. Parámetros geométricos fijos (Unidades en puntos de PDF)
        const MARGEN_IZQ = 75;  // Espacio libre reservado para la banda lateral
        const MARGEN_INF = 70;  // Espacio libre reservado para el QR y pie de página
        const Y_INICIAL = 760;  // Techo del primer recuadro de firma
        const Y_MINIMA = 70;    // Suelo del último recuadro de firma
        const ESPACIO_UTIL = Y_INICIAL - Y_MINIMA; // 690 puntos netos
        const HUECO_PUNTOS = 5.67; // Separación exacta de 2 mm

        const numFirmas = firmantes.length;

        // 3. Calcular la altura de las cajas de firma de forma adaptativa
        let alturaCaja = 0;
        if (numFirmas === 1) {
            alturaCaja = 421; // Si es solo uno, ocupa exactamente la mitad vertical del folio
        } else if (numFirmas > 1) {
            const totalHuecos = (numFirmas - 1) * HUECO_PUNTOS;
            alturaCaja = (ESPACIO_UTIL - totalHuecos) / numFirmas;
        }

        // 4. Procesar página por página
        for (let index = 0; index < paginasOriginales.length; index++) {
            const paginaActual = paginasOriginales[index];
            const { width, height } = paginaActual.getSize();

            // Incrustar la página original en el nuevo documento
            const [paginaEmbebida] = await pdfNuevo.embedPages([paginaActual]);
            const nuevaPagina = pdfNuevo.addPage([width, height]);

            // Escalar el contenido original para encajarlo en la zona segura (derecha-arriba)
            const escala = Math.min((width - MARGEN_IZQ - 20) / width, (height - MARGEN_INF - 20) / height);
            nuevaPagina.drawPage(paginaEmbebida, {
                x: MARGEN_IZQ + 10,
                y: MARGEN_INF + 5,
                width: width * escala,
                height: height * escala,
            });

            // ==========================================
            // A. RENDERIZAR PIE DE PÁGINA (QR + CSV)
            // ==========================================
            const csvTexto = datosTramite.csv || 'PENDI-ENTE-DE-GEN-ERAC-ION';
            const refTexto = datosTramite.referencia || 'TRAMITE_INTERNO';

            // Marcador de posición para el QR (Aquí integrarás tu buffer de QR más adelante)
            nuevaPagina.drawRectangle({
                x: MARGEN_IZQ + 10, y: 15, width: 45, height: 45,
                borderWidth: 1, borderColor: rgb(0.7, 0.7, 0.7)
            });
            nuevaPagina.drawText('QR', { x: MARGEN_IZQ + 26, y: 34, size: 6, color: rgb(0.5, 0.5, 0.5), font: fontRegular });

            // Textos legales del pie
            nuevaPagina.drawText('Copia Auténtica Electrónica - Conservatorio de Música', { x: MARGEN_IZQ + 65, y: 45, size: 8, color: rgb(0.1, 0.1, 0.1), font: fontBold });
            nuevaPagina.drawText(`CSV: ${csvTexto}`, { x: MARGEN_IZQ + 65, y: 33, size: 7, color: rgb(0.3, 0.3, 0.3), font: fontRegular });
            nuevaPagina.drawText(`Ref: ${refTexto} | Página ${index + 1} de ${paginasOriginales.length}`, { x: MARGEN_IZQ + 65, y: 21, size: 6.5, color: rgb(0.5, 0.5, 0.5), font: fontRegular });

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
            // C. RENDERIZAR CAJAS DE FIRMA (DE ARRIBA A ABAJO)
            // ==========================================
            for (let i = 0; i < numFirmas; i++) {
                const firmante = firmantes[i];

                // Coordenadas Y para el apilamiento descendente
                const y_top = Y_INICIAL - (i * (alturaCaja + HUECO_PUNTOS));
                const y_bottom = y_top - alturaCaja;

                // Dibujar contorno del recuadro de firma
                nuevaPagina.drawRectangle({
                    x: 10,
                    y: y_bottom,
                    width: 55,
                    height: alturaCaja,
                    borderWidth: 0.75,
                    borderColor: rgb(0.5, 0.5, 0.5)
                });

                // Formatear cadenas de texto
                const nombreLimpio = formatearNombre(firmante.nombre);
                const fechaLimpia = formatearFechaHora(firmante.fecha);

                // Calcular longitudes exactas en puntos para el centrado geométrico
                const largoNombre = fontBold.widthOfTextAtSize(nombreLimpio, 7.5);
                const largoCargo = fontRegular.widthOfTextAtSize(firmante.cargo, 6.5);
                const largoFecha = fontRegular.widthOfTextAtSize(fechaLimpia, 6);

                const paddingNombre = (alturaCaja - largoNombre) / 2;
                const paddingCargo = (alturaCaja - largoCargo) / 2;
                const paddingFecha = (alturaCaja - largoFecha) / 2;

                // Imprimir textos rotados 90° (Lectura de abajo hacia arriba)
                // Columna 1: Nombre (Negrita)
                nuevaPagina.drawText(nombreLimpio, {
                    x: 25, y: y_bottom + paddingNombre,
                    size: 7.5, font: fontBold, color: rgb(0.1, 0.1, 0.1),
                    rotate: degrees(90)
                });

                // Columna 2: Cargo
                nuevaPagina.drawText(firmante.cargo, {
                    x: 37, y: y_bottom + paddingCargo,
                    size: 6.5, font: fontRegular, color: rgb(0.3, 0.3, 0.3),
                    rotate: degrees(90)
                });

                // Columna 3: Fecha y hora estructurada
                nuevaPagina.drawText(fechaLimpia, {
                    x: 49, y: y_bottom + paddingFecha,
                    size: 6, font: fontRegular, color: rgb(0.4, 0.4, 0.4),
                    rotate: degrees(90)
                });
            }
        }

        // 5. Guardar archivo final
        const pdfResultBytes = await pdfNuevo.save();
        fs.writeFileSync(rutaOutput, pdfResultBytes);
        return true;

    } catch (error) {
        console.error('❌ Error crítico en el módulo de maquetación de firmas:', error);
        throw error;
    }
}

module.exports = {
    generarCopiaAutentica
};