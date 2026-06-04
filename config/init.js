const fs = require('fs');
const path = require('path');

const inicializarProyecto = () => {
    // Definimos las carpetas requeridas por la nueva arquitectura unificada
    const carpetas = [
        path.join(__dirname, '../uploads'),
        path.join(__dirname, '../uploads/avatars')
    ];

    carpetas.forEach(dir => {
        if (!fs.existsSync(dir)) {
            // Usamos recursive: true por seguridad si alguna subcarpeta requiere crear su padre
            fs.mkdirSync(dir, { recursive: true });
            console.log(`✅ Carpeta de almacenamiento lista: ${path.basename(dir)}`);
        }
    });

    // NOTA: La verificación y migración de columnas de la Base de Datos 
    // se ha centralizado completamente en 'database.js' para evitar colisiones.
};

module.exports = inicializarProyecto;