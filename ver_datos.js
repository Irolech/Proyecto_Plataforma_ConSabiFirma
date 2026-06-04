const db = require('./database.js');

db.all("SELECT * FROM documentos", [], (err, filas) => {
    if (err) {
        console.error("❌ Error al consultar la tabla 'documentos':", err.message);
        return;
    }

    if (!filas || filas.length === 0) {
        console.log("ℹ️ La tabla 'documentos' está completamente vacía.");
        return;
    }

    console.log(`\n--- DOCUMENTOS REGISTRADOS EN EL SISTEMA (${filas.length}) ---`);
    console.table(filas);
});