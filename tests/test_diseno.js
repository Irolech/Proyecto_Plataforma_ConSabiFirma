const { PDFDocument, rgb, degrees, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

// Datos ficticios de prueba (originalmente con Don/Doña para comprobar que los limpia)
const mockFirmantes = [
    { nombre: 'DON MANUEL PERBECH GARCÍA', cargo: 'Director del Conservatorio', fecha: '05/06/2026 18:30:00' },
    { nombre: 'DÑA. MARÍA JOSÉ RODRÍGUEZ SÁNCHEZ', cargo: 'Secretaria Académica', fecha: '05/06/2026 19:15:22' },
    { nombre: 'DON ALEJANDRO GÓMEZ RUIZ', cargo: 'Jefe de Estudios', fecha: '05/06/2026 20:05:10' }
];

/**
 * Limpia tratamientos de cortesía (Don/Doña/D./Dña) al inicio
 * y convierte el resto a formato Título (ej: MANUEL -> Manuel)
 */
function formatearNombre(nombre) {
    // 🧹 Expresión regular que elimina DON, DOÑA, DÑA o D (con o sin punto) al principio del texto
    const nombreSinCortesia = nombre.replace(/^(don|doña|dña|d)\.?\s+/i, '');

    // Capitalizamos el nombre limpio preservando tildes y eñes
    return nombreSinCortesia.toLowerCase().replace(/(^\w|\s\w|[-/]\w)/g, letter => letter.toUpperCase());
}

/**
 * Transforma una fecha 'DD/MM/AAAA HH:MM:SS' en la frase oficial requerida
 */
function formatearFechaHora(fechaStr) {
    const [fecha, horaCompleta] = fechaStr.split(' ');
    const [hora, minutos] = horaCompleta.split(':');
    return `el día ${fecha} a las ${hora}:${minutos} horas`;
}

async function generarSimulacionVisual() {
    const rutaInput = 'documento_prueba.pdf';
    const rutaOutput = path.join(__dirname, 'uploads/TEST_GRAFICO_FIRMAS.pdf');

    if (!fs.existsSync(rutaInput)) {
        console.error(`❌ Necesitas el archivo "${rutaInput}" en la raíz para correr la prueba.`);
        return;
    }

    console.log('⏳ Generando simulación gráfica con nombres limpios y centrado...');

    try {
        const pdfBytes = fs.readFileSync(rutaInput);
        const pdfOriginal = await PDFDocument.load(pdfBytes);
        const pdfNuevo = await PDFDocument.create();

        const fontRegular = await pdfNuevo.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfNuevo.embedFont(StandardFonts.HelveticaBold);

        const [paginaOriginal] = await pdfNuevo.embedPages([pdfOriginal.getPage(0)]);
        const { width, height } = pdfOriginal.getPage(0).getSize();

        const MARGEN_IZQ = 75;
        const MARGEN_INF = 70;

        const Y_INICIAL = 760;
        const Y_MINIMA = 70;
        const ESPACIO_UTIL = Y_INICIAL - Y_MINIMA;
        const HUECO_PUNTOS = 5.67; // 2 mm

        for (let numFirmas = 1; numFirmas <= 3; numFirmas++) {
            const nuevaPagina = pdfNuevo.addPage([width, height]);

            // Fondo original
            const escala = Math.min((width - MARGEN_IZQ - 20) / width, (height - MARGEN_INF - 20) / height);
            nuevaPagina.drawPage(paginaOriginal, {
                x: MARGEN_IZQ + 10, y: MARGEN_INF + 5,
                width: width * escala, height: height * escala,
            });

            // Pie de página ficticio
            nuevaPagina.drawRectangle({ x: MARGEN_IZQ + 10, y: 15, width: 45, height: 45, borderWidth: 1, borderColor: rgb(0.7, 0.7, 0.7) });
            nuevaPagina.drawText('QR', { x: MARGEN_IZQ + 25, y: 34, size: 6, color: rgb(0.5, 0.5, 0.5), font: fontRegular });
            nuevaPagina.drawText('Documento Verificable en Repositorio', { x: MARGEN_IZQ + 65, y: 45, size: 8, color: rgb(0.2, 0.2, 0.2), font: fontRegular });
            nuevaPagina.drawText('Ref: ESCENARIO_TEST_' + numFirmas + '_FIRMAS', { x: MARGEN_IZQ + 65, y: 33, size: 7, color: rgb(0.5, 0.5, 0.5), font: fontRegular });
            nuevaPagina.drawText(`Página ${numFirmas} de 3 (Simulación de ${numFirmas} firma/s)`, { x: MARGEN_IZQ + 65, y: 21, size: 7, color: rgb(0.5, 0.5, 0.5), font: fontRegular });

            // Cabecera de la banda
            nuevaPagina.drawRectangle({ x: 10, y: 790, width: 20, height: 20, borderWidth: 1, borderColor: rgb(0.3, 0.3, 0.3), color: rgb(0.92, 0.92, 0.92) });
            nuevaPagina.drawText('Ico', { x: 14, y: 797, size: 6, color: rgb(0.4, 0.4, 0.4), font: fontRegular });
            nuevaPagina.drawText('Documento', { x: 35, y: 802, size: 7, color: rgb(0.1, 0.1, 0.1), font: fontBold });
            nuevaPagina.drawText('firmado por:', { x: 35, y: 792, size: 6.5, color: rgb(0.1, 0.1, 0.1), font: fontRegular });

            // Distribución de altura
            let alturaCaja = 0;
            if (numFirmas === 1) {
                alturaCaja = height / 2;
            } else {
                const totalHuecos = (numFirmas - 1) * HUECO_PUNTOS;
                alturaCaja = (ESPACIO_UTIL - totalHuecos) / numFirmas;
            }

            for (let i = 0; i < numFirmas; i++) {
                const firmante = mockFirmantes[i];

                const y_top = Y_INICIAL - (i * (alturaCaja + HUECO_PUNTOS));
                const y_bottom = y_top - alturaCaja;

                // Contenedor
                nuevaPagina.drawRectangle({
                    x: 10, y: y_bottom,
                    width: 55, height: alturaCaja,
                    borderWidth: 0.75, borderColor: rgb(0.6, 0.6, 0.6)
                });

                // Procesamos los textos aplicando el nuevo filtro de limpieza
                const nombreFormateado = formatearNombre(firmante.nombre);
                const fechaFormateada = formatearFechaHora(firmante.fecha);

                // Cálculo de centrado dinámico
                const largoNombre = fontBold.widthOfTextAtSize(nombreFormateado, 7.5);
                const largoCargo = fontRegular.widthOfTextAtSize(firmante.cargo, 6.5);
                const largoFecha = fontRegular.widthOfTextAtSize(fechaFormateada, 6);

                const paddingNombre = (alturaCaja - largoNombre) / 2;
                const paddingCargo = (alturaCaja - largoCargo) / 2;
                const paddingFecha = (alturaCaja - largoFecha) / 2;

                // Estampado
                nuevaPagina.drawText(nombreFormateado, {
                    x: 25, y: y_bottom + paddingNombre,
                    size: 7.5, font: fontBold, color: rgb(0.1, 0.1, 0.1),
                    rotate: degrees(90)
                });

                nuevaPagina.drawText(firmante.cargo, {
                    x: 37, y: y_bottom + paddingCargo,
                    size: 6.5, font: fontRegular, color: rgb(0.4, 0.4, 0.4),
                    rotate: degrees(90)
                });

                nuevaPagina.drawText(fechaFormateada, {
                    x: 49, y: y_bottom + paddingFecha,
                    size: 6, font: fontRegular, color: rgb(0.5, 0.5, 0.5),
                    rotate: degrees(90)
                });
            }
        }

        const pdfResultBytes = await pdfNuevo.save();
        fs.writeFileSync(rutaOutput, pdfResultBytes);

        console.log('\n=========================================');
        console.log('✅ PRUEBA GRÁFICA ACTUALIZADA CON ÉXITO');
        console.log(`📁 Archivo: uploads/TEST_GRAFICO_FIRMAS.pdf`);
        console.log('=========================================\n');

    } catch (error) {
        console.error('❌ Error generando la prueba gráfica:', error);
    }
}

generarSimulacionVisual();