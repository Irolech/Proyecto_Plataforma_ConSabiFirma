const fs = require('fs');
const db = require('../database');

const inicializarProyecto = () => {
    // Crear carpetas
    const carpetas = ['documentos_originales', 'documentos_preparados', 'documentos_firmados', 'temp'];
    carpetas.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
            console.log(`✅ Carpeta lista: ${dir}`);
        }
    });

    // Asegurar columna cargo
    db.run("ALTER TABLE usuarios ADD COLUMN cargo TEXT", (err) => {
        if (!err) console.log("✅ Columna 'cargo' verificada/añadida.");
    });
};

module.exports = inicializarProyecto;