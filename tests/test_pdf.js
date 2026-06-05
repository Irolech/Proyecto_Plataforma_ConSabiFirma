const { prepararDocumento } = require('./utils/preparar');
const path = require('path');
const fs = require('fs');

async function probar() {
    // 1. Pon un PDF cualquiera de prueba en la raíz y pon aquí su nombre
    const pdfDePrueba = 'documento_prueba.pdf';

    if (!fs.existsSync(pdfDePrueba)) {
        console.error(`❌ Necesitas colocar un archivo llamado "${pdfDePrueba}" en la raíz para hacer la prueba.`);
        return;
    }

    console.log('⏳ Procesando PDF de prueba...');

    try {
        const resultado = await prepararDocumento(pdfDePrueba, pdfDePrueba);
        console.log('\n=========================================');
        console.log('✅ ¡PDF PREPARADO CON ÉXITO!');
        console.log(`📁 Copia Original: ${resultado.rutaOriginal}`);
        console.log(`📁 Versión de Trabajo (Lienzo listo): ${resultado.rutaTrabajo}`);
        console.log('=========================================\n');
        console.log('👉 Abre el archivo que empieza por PREP_ en tu carpeta "uploads" para ver el diseño.');
    } catch (error) {
        console.error('❌ Error al probar el PDF:', error);
    }
}

probar();