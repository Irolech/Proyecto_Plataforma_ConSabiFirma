const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'sistema_firmas.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("❌ Error al conectar con SQLite:", err.message);
    else console.log('✅ Conexión establecida con la base de datos.');
});

db.serialize(() => {
    // 1. TABLA DE USUARIOS (Con campos para perfil y seguridad)
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        dni TEXT PRIMARY KEY,
        nombre TEXT,
        apellidos TEXT,
        email TEXT,
        cargo TEXT,
        password TEXT,
        rol TEXT DEFAULT 'usuario',
        foto_url TEXT DEFAULT '/img/default-avatar.png',
        notif_email INTEGER DEFAULT 1 -- 1 para activado, 0 para desactivado
    )`);

    // --- ACTUALIZACIÓN DE TABLA EXISTENTE ---
    // Por si ya tenías la tabla creada, añadimos las columnas si no existen
    db.run(`ALTER TABLE usuarios ADD COLUMN foto_url TEXT DEFAULT '/img/default-avatar.png'`, (err) => {
        if (!err) console.log("✅ Columna foto_url añadida.");
    });
    db.run(`ALTER TABLE usuarios ADD COLUMN notif_email INTEGER DEFAULT 1`, (err) => {
        if (!err) console.log("✅ Columna notif_email añadida.");
    });

    // 2. TABLA DE DOCUMENTOS
    db.run(`CREATE TABLE IF NOT EXISTS documentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        nombre TEXT, 
        archivo_original TEXT, 
        archivo_firmado TEXT,
        firmantes TEXT,
        firmados_por TEXT,
        estado TEXT DEFAULT 'pendiente', 
        destinatarios_internos TEXT, 
        destinatarios_externos TEXT, 
        mensaje_final TEXT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // 3. TABLA DE AUDITORÍA
    db.run(`CREATE TABLE IF NOT EXISTS auditoria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        documento_id INTEGER, 
        usuario_dni TEXT,
        accion TEXT, 
        detalles TEXT, 
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // --- USUARIOS DE PRUEBA ---
    const usuariosPrueba = [
        ['12345678A', 'Juan', 'Perez', 'juan@ejemplo.com', 'Director', '123', 'superadmin', '/img/default-avatar.png', 1],
        ['87654321B', 'Maria', 'Garcia', 'maria@ejemplo.com', 'Secretaria', '123', 'usuario', '/img/default-avatar.png', 1]
    ];

    const stmt = db.prepare(`INSERT OR IGNORE INTO usuarios (dni, nombre, apellidos, email, cargo, password, rol, foto_url, notif_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    usuariosPrueba.forEach((user) => {
        stmt.run(user);
    });
    stmt.finalize();

    console.log("✅ Estructura de base de datos preparada para el Perfil de Usuario.");
});

module.exports = db;