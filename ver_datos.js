const db = require('./database.js');

// 🔌 Leemos el argumento de la terminal (ej: node verdatos.js usuarios)
// Si no se especifica ninguno, por defecto inspeccionará la tabla 'documentos'
const tablaAInspeccionar = (process.argv[2] || 'documentos').toLowerCase();

// Listado de tablas válidas en nuestra infraestructura para evitar consultas erróneas
const tablasValidas = ['documentos', 'usuarios', 'auditoria', 'cambios_superadmin_programados'];

if (!tablasValidas.includes(tablaAInspeccionar)) {
    console.error(`\n❌ Error: La tabla '${tablaAInspeccionar}' no existe o no está catalogada.`);
    console.log(`💡 Tablas disponibles: ${tablasValidas.join(', ')}\n`);
    db.close();
    process.exit(1);
}

const query = `SELECT * FROM ${tablaAInspeccionar}`;

db.all(query, [], (err, filas) => {
    if (err) {
        console.error(`\n❌ Error crítico al consultar la tabla '${tablaAInspeccionar}':`, err.message);
        db.close();
        return;
    }

    if (!filas || filas.length === 0) {
        console.log(`\nℹ️ La tabla '${tablaAInspeccionar}' está completamente vacía.`);
        db.close();
        return;
    }

    console.log(`\n======================================================================`);
    console.log(`📊 REGISTROS ENCONTRADOS EN LA TABLA: ${tablaAInspeccionar.toUpperCase()} (${filas.length})`);
    console.log(`======================================================================\n`);

    // 🎨 Formateo estético intermedio antes de pintar la tabla en la consola
    const filasFormateadas = filas.map(fila => {
        const copiaFila = { ...fila };

        // Si estamos viendo documentos, recortamos cadenas largas para no romper las columnas de la terminal
        if (tablaAInspeccionar === 'documentos') {
            if (copiaFila.archivo_original) {
                // Muestra solo el nombre del archivo físico, no toda la ruta absoluta
                const partes = copiaFila.archivo_original.split(/[/\\]/);
                copiaFila.archivo_original = partes[partes.length - 1];
            }
            // Hacemos que los listados de DNIs de firmantes sean más compactos visualmente
            if (copiaFila.firmantes && copiaFila.firmantes.length > 25) {
                copiaFila.firmantes = copiaFila.firmantes.substring(0, 22) + '...';
            }
            if (copiaFila.firmados_por && copiaFila.firmados_por.length > 25) {
                copiaFila.firmados_por = copiaFila.firmados_por.substring(0, 22) + '...';
            }
        }

        // Si estamos revisando contraseñas por auditoría de desarrollo, ocultamos el hash para que sea legible
        if (copiaFila.password) {
            copiaFila.password = "[HASH OCULTO]";
        }

        return copiaFila;
    });

    // Imprime la rejilla estructurada directamente en la terminal
    console.table(filasFormateadas);
    console.log("\n");

    // 🔒 LIBERACIÓN DE RECURSOS: Cerramos la conexión para que el proceso de Node finalice limpiamente
    db.close((errClose) => {
        if (errClose) {
            console.error("⚠️ Error al cerrar la conexión de la base de datos:", errClose.message);
        }
    });
});