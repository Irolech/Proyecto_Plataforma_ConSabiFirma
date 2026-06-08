const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto'); // 🔒 Módulo nativo de Node.js para criptografía segura

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

    // --- MIGRACIONES: ACTUALIZACIÓN DE TABLA USUARIOS EXISTENTE ---
    db.run(`ALTER TABLE usuarios ADD COLUMN foto_url TEXT DEFAULT '/img/default-avatar.png'`, (err) => {
        if (!err) console.log("✅ Columna foto_url añadida o verificada.");
    });
    db.run(`ALTER TABLE usuarios ADD COLUMN notif_email INTEGER DEFAULT 1`, (err) => {
        if (!err) console.log("✅ Columna notif_email añadida o verificada.");
    });


    // 2. TABLA DE DOCUMENTOS (Esquema completo con soporte para validación por CSV)
    db.run(`CREATE TABLE IF NOT EXISTS documentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        nombre TEXT, 
        archivo_original TEXT, 
        archivo_firmado TEXT,
        firmantes TEXT,
        firmados_por TEXT DEFAULT '', -- Evita NULLs para que .includes() no tumbe Node
        estado TEXT DEFAULT 'pendiente', 
        tipo_flujo TEXT DEFAULT 'indistinto', 
        destinatarios_internos TEXT DEFAULT '[]', 
        destinatarios_externos TEXT DEFAULT '[]', 
        mensaje_final TEXT DEFAULT '', 
        csv TEXT, -- 🚀 NUEVO: Almacena el código seguro de verificación de acceso público
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // --- MIGRACIONES: ACTUALIZACIÓN DE TABLA DOCUMENTOS EXISTENTE ---
    db.run(`ALTER TABLE documentos ADD COLUMN tipo_flujo TEXT DEFAULT 'indistinto'`, (err) => {
        if (!err) console.log("✅ Columna tipo_flujo verificada en documentos.");
    });
    db.run(`ALTER TABLE documentos ADD COLUMN destinatarios_internos TEXT DEFAULT '[]'`, (err) => {
        if (!err) console.log("✅ Columna destinatarios_internos verificada en documentos.");
    });
    db.run(`ALTER TABLE documentos ADD COLUMN destinatarios_externos TEXT DEFAULT '[]'`, (err) => {
        if (!err) console.log("✅ Columna destinatarios_externos verificada en documentos.");
    });
    db.run(`ALTER TABLE documentos ADD COLUMN mensaje_final TEXT DEFAULT ''`, (err) => {
        if (!err) console.log("✅ Columna mensaje_final verificada en documentos.");
    });
    // 🚀 NUEVO: Migración automática para inyectar la columna CSV si la base de datos ya existía
    db.run(`ALTER TABLE documentos ADD COLUMN csv TEXT`, (err) => {
        if (!err) console.log("✅ Columna csv añadida o verificada de forma segura en documentos.");
    });


    // 3. TABLA DE AUDITORÍA
    db.run(`CREATE TABLE IF NOT EXISTS auditoria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        documento_id INTEGER, 
        usuario_dni TEXT,
        accion TEXT, 
        detaxlles TEXT, 
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);


    // 🔒 4. EL BÚNKER: TABLA DE LLAVES MAESTRAS OTP DE EMERGENCIA
    db.run(`CREATE TABLE IF NOT EXISTS llaves_maestras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clave_hash TEXT NOT NULL UNIQUE,
        utilizada INTEGER DEFAULT 0, -- 0 = Disponible, 1 = Quemada/Usada
        fecha_uso TEXT DEFAULT NULL
    )`);


    // 📑 5. NUEVO: TABLA DE METADATOS DE FIRMAS (Necesaria para /api/firmas/recibir)
    db.run(`CREATE TABLE IF NOT EXISTS firmas_documentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        documento_id INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        cargo TEXT NOT NULL,
        fecha_firma TEXT NOT NULL
    )`, (err) => {
        if (!err) console.log("✅ Tabla 'firmas_documentos' estructurada correctamente.");
    });


    // 🤖 6. NUEVO: TABLA PARA LOS TRASPASOS PROGRAMADOS DEL CRON (Evita avisos de error en server.js)
    db.run(`CREATE TABLE IF NOT EXISTS cambios_superadmin_programados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dni_antiguo TEXT NOT NULL,
        rol_destino_antiguo TEXT NOT NULL,
        dni_nuevo TEXT NOT NULL,
        fecha_ejecucion TEXT NOT NULL, -- Formato YYYY-MM-DDTHH:mm concordante con el Servidor
        ejecutado INTEGER DEFAULT 0
    )`, (err) => {
        if (!err) console.log("✅ Tabla 'cambios_superadmin_programados' sincronizada con el motor cron.");
    });


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

    console.log("✅ Estructura de base de datos preparada para el Perfil de Usuario y Flujos de Circuito.");

    // 🔒 SCRIPT AUTOMÁTICO DE GENERACIÓN ÚNICA DE LLAVES OTP
    db.get("SELECT COUNT(*) AS total FROM llaves_maestras", [], (err, row) => {
        if (err) {
            console.error("❌ Error al verificar las llaves maestras:", err.message);
            return;
        }

        if (row && row.total === 0) {
            console.log("\n🛑 ===================================================================== 🛑");
            console.log("⚠️  BÚNKER DEL SUPERADMIN: GENERANDO LLAVES MAESTRAS DE EMERGENCIA  ⚠️");
            console.log("Copia estos códigos YA en un PAPEL FÍSICO. NUNCA se volverán a mostrar.");
            console.log("=====================================================================");

            const stmtLlaves = db.prepare(`INSERT INTO llaves_maestras (clave_hash) VALUES (?)`);

            for (let i = 0; i < 5; i++) {
                const bloque1 = crypto.randomBytes(2).toString('hex').toUpperCase();
                const bloque2 = crypto.randomBytes(2).toString('hex').toUpperCase();
                const llavePlana = `SABI-${bloque1}-${bloque2}`;

                const hash = crypto.createHash('sha256').update(llavePlana).digest('hex');
                stmtLlaves.run(hash);

                console.log(`  🔑 Llave Maestra #${i + 1}:  ${llavePlana}`);
            }

            stmtLlaves.finalize();
            console.log("=====================================================================");
            console.log("✅ Llaves cifradas y almacenadas en el búnker de forma segura.\n🛑");
        } else {
            console.log("🔒 Búnker de seguridad: Llaves maestras operativas en el sistema.");
        }
    });
});

module.exports = db;