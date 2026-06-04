const { PDFDocument, rgb } = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

/**
 * Procesa un PDF original añadiendo un margen inferior, una banda gris lateral y un QR de verificación.
 * @param {string} rutaInput - Ruta del archivo temporal subido por Multer (ej: 'uploads/17123456-archivo.pdf')
 * @param {string} nombreOriginal - Nombre real del archivo subido (ej: 'Acta_Reunion.pdf')
 * @returns {Promise<{rutaOriginal: string, rutaTrabajo: string, nombreUnico: string}>} Rutas finales de los archivos en 'uploads/'
 */
async function prepararDocumento(rutaInput, nombreOriginal) {
    try {
        // Centralizamos en la carpeta unificada de almacenamiento
        const carpetaUploads = path.join(__dirname, '../uploads');

        // Generamos un nombre único para evitar colisiones entre archivos con el mismo nombre
        const timestamp = Date.now();
        const nombreUnico = `${timestamp}_${nombreOriginal.replace(/\s+/g, '_')}`;

        const rutaCopiaOriginal = path.join(carpetaUploads, `ORI_${nombreUnico}`);
        const rutaPDFTrabajo = path.join(carpetaUploads, `PREP_${nombreUnico}`);

        // 1. Guardamos la copia del PDF original limpio en el almacén unificado
        fs.copyFileSync(rutaInput, rutaCopiaOriginal);

        // 2. Procesamos el PDF para inyectar la capa visual y el QR
        const pdfBytes = fs.readFileSync(rutaInput);
        const pdfOriginal = await PDFDocument.load(pdfBytes);
        const pdfNuevo = await PDFDocument.create();

        // Generamos el código QR utilizando el identificador único del documento
        const qrDataUrl = await QRCode.toDataURL(`Verificación repositorio: ${nombreUnico}`);
        const qrImage = await pdfNuevo.embedPng(qrDataUrl);

        const paginas = pdfOriginal.getPageIndices();
        for (const indice of paginas) {
            const paginaOriginal = pdfOriginal.getPage(indice);
            const { width, height } = paginaOriginal.getSize();

            // Creamos la nueva página con las dimensiones idénticas a la original
            const nuevaPagina = pdfNuevo.addPage([width, height]);
            const [paginaIncrustada] = await pdfNuevo.embedPages([paginaOriginal]);

            const MARGEN_IZQ = 50;
            const MARGEN_INF = 70;

            // Dibujamos la franja lateral gris para las futuras firmas
            nuevaPagina.drawRectangle({
                x: 0,
                y: 0,
                width: MARGEN_IZQ - 5,
                height: height,
                color: rgb(0.96, 0.96, 0.96),
            });

            // Calculamos la escala exacta para encoger el contenido original sin deformarlo
            const escala = Math.min((width - MARGEN_IZQ - 20) / width, (height - MARGEN_INF - 20) / height);

            // Estampamos el contenido original redimensionado en el nuevo lienzo
            nuevaPagina.drawPage(paginaIncrustada, {
                x: MARGEN_IZQ + 10,
                y: MARGEN_INF + 5,
                width: width * escala,
                height: height * escala,
            });

            // Incrustamos el QR de validación y el texto de referencia en el pie de página
            nuevaPagina.drawImage(qrImage, { x: MARGEN_IZQ + 10, y: 15, width: 45, height: 45 });
            nuevaPagina.drawText(`Ref: ${nombreUnico}`, { x: MARGEN_IZQ + 65, y: 35, size: 8, color: rgb(0.4, 0.4, 0.4) });
        }

        // Guardamos el PDF modificado listo para ser firmado
        const pdfModificadoBytes = await pdfNuevo.save();
        fs.writeFileSync(rutaPDFTrabajo, pdfModificadoBytes);

        // Eliminamos el archivo temporal que generó Multer inicialmente para no duplicar basura en el disco
        if (fs.existsSync(rutaInput)) {
            fs.unlinkSync(rutaInput);
        }

        // Retornamos las referencias exactas relativas/absolutas para que la ruta las guarde en la DB
        return {
            rutaOriginal: `uploads/ORI_${nombreUnico}`,
            rutaTrabajo: `uploads/PREP_${nombreUnico}`,
            nombreUnico: nombreUnico
        };

    } catch (error) {
        console.error('❌ Error en el servicio de preparación de PDF:', error);
        throw error;
    }
}

module.exports = { prepararDocumento };