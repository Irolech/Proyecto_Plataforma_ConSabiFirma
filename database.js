const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto'); // 🔒 Módulo nativo de Node.js para criptografía segura 

const dbPath = path.join(__dirname, 'database', 'sistema_firmas.db');

// 🛡️ CONTROL DE ENTORNO: Garantizamos que la carpeta física 'database' exista antes de inicializar SQLite
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('📁 Carpeta de persistencia binaria creada de forma reactiva.');
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("❌ Error crítico al conectar con SQLite:", err.message);
    } else {
        console.log('✅ Conexión establecida con la base de datos centralizada.');
    }
});

// Encapsulamos la construcción estructural en modo serializado para evitar condiciones de carrera
db.serialize(() => {

    // 🛠️ CONFIGURACIÓN DE MOTOR: Forzamos a SQLite a respetar las restricciones de integridad relacional
    db.run("PRAGMA foreign_keys = ON;", (err) => {
        if (err) console.error("❌ Error al activar el motor de claves foráneas:", err.message);
    });

    // =====================================================================
    // 1. TABLA DE USUARIOS (Estructura central de cuentas y perfiles)
    // =====================================================================
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

    // Interceptores de migración indolora (Silencian el log si las columnas ya coexisten)
    db.run(`ALTER TABLE usuarios ADD COLUMN foto_url TEXT DEFAULT '/img/default-avatar.png'`, (err) => {
        if (err && !err.message.includes("duplicate column name")) console.error("⚠️ Error en migración foto_url:", err.message);
    });
    db.run(`ALTER TABLE usuarios ADD COLUMN notif_email INTEGER DEFAULT 1`, (err) => {
        if (err && !err.message.includes("duplicate column name")) console.error("⚠️ Error en migración notif_email:", err.message);
    });

    // =====================================================================
    // 2. TABLA DE DOCUMENTOS (Control de expedientes de matrícula y CSV)
    // =====================================================================
    db.run(`CREATE TABLE IF NOT EXISTS documentos ( 
        id INTEGER PRIMARY KEY AUTOINCREMENT,  
        nombre TEXT,  
        archivo_original TEXT,  
        archivo_firmado TEXT, 
        firmantes TEXT, 
        firmados_por TEXT DEFAULT '', 
        estado TEXT DEFAULT 'pendiente',  
        tipo_flujo TEXT DEFAULT 'indistinto',  
        destinatarios_internos TEXT DEFAULT '[]',  
        destinatarios_externos TEXT DEFAULT '[]',  
        mensaje_final TEXT DEFAULT '',  
        csv TEXT, 
        creador_dni TEXT, 
        aviso_creador INTEGER DEFAULT 0, 
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
    )`);

    // Bloque incremental de actualizaciones estructurales sobre la tabla documentos
    const migracionesDocumentos = [
        `ALTER TABLE documentos ADD COLUMN tipo_flujo TEXT DEFAULT 'indistinto'`,
        `ALTER TABLE documentos ADD COLUMN destinatarios_internos TEXT DEFAULT '[]'`,
        `ALTER TABLE documentos ADD COLUMN destinatarios_externos TEXT DEFAULT '[]'`,
        `ALTER TABLE documentos ADD COLUMN mensaje_final TEXT DEFAULT ''`, // Mantenido por compatibilidad
        `ALTER TABLE documentos ADD COLUMN csv TEXT`,
        `ALTER TABLE documentos ADD COLUMN creador_dni TEXT`,
        `ALTER TABLE documentos ADD COLUMN aviso_creador INTEGER DEFAULT 0`
    ];

    migracionesDocumentos.forEach(query => {
        db.run(query, (err) => {
            if (err && !err.message.includes("duplicate column name") && !err.message.includes("no such table")) {
                // Captura controlada de logs operacionales
            }
        });
    });

    // =====================================================================
    // 3. TABLA DE AUDITORÍA (Trazabilidad forense del sistema)
    // =====================================================================
    db.run(`CREATE TABLE IF NOT EXISTS auditoria ( 
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        documento_id INTEGER,  
        usuario_dni TEXT, 
        accion TEXT,  
        detalles TEXT,  
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
    )`);

    // =====================================================================
    // 4. EL BÚNKER: TABLA DE LLAVES MAESTRAS OTP DE EMERGENCIA
    // =====================================================================
    db.run(`CREATE TABLE IF NOT EXISTS llaves_maestras ( 
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        clave_hash TEXT NOT NULL UNIQUE, 
        utilizada INTEGER DEFAULT 0, 
        fecha_uso TEXT DEFAULT NULL 
    )`);

    // =====================================================================
    // 5. METADATOS DE FIRMAS (Historial secuencial de rúbricas)
    // =====================================================================
    db.run(`CREATE TABLE IF NOT EXISTS firmas_documentos ( 
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        documento_id INTEGER NOT NULL, 
        nombre TEXT NOT NULL, 
        cargo TEXT NOT NULL, 
        fecha_firma TEXT NOT NULL,
        FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE
    )`);

    // =====================================================================
    // 6. PLANIFICADOR: TRASPASOS PROGRAMADOS SUPERADMIN (Motor Cron)
    // =====================================================================
    db.run(`CREATE TABLE IF NOT EXISTS cambios_superadmin_programados ( 
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        dni_antiguo TEXT NOT NULL, 
        rol_destino_antiguo TEXT NOT NULL DEFAULT 'usuario', 
        dni_nuevo TEXT NOT NULL, 
        fecha_ejecucion TEXT NOT NULL, 
        ejecutado INTEGER DEFAULT 0 
    )`);

    // =====================================================================
    // 7. CONTROL DE COMUNICACIONES: NOTIFICACIONES (Trazabilidad Mailer)
    // =====================================================================
    db.run(`CREATE TABLE IF NOT EXISTS notificaciones ( 
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        documento_id INTEGER NOT NULL, 
        usuario_dni TEXT, 
        email_destinatario TEXT NOT NULL, 
        tipo TEXT NOT NULL, 
        asunto TEXT NOT NULL, 
        estado TEXT DEFAULT 'PENDIENTE', 
        intentos INTEGER DEFAULT 0, 
        fecha_creacion TEXT DEFAULT (DATETIME('now', 'localtime')), 
        fecha_envio TEXT, 
        error_log TEXT, 
        FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE, 
        FOREIGN KEY (usuario_dni) REFERENCES usuarios(dni) ON DELETE SET NULL
    )`);

    // =====================================================================
    // 8. EVIDENCIAS DE FIRMA (Registro público de verificación por UUID / QR)
    // =====================================================================
    db.run(`CREATE TABLE IF NOT EXISTS firmas_evidencias ( 
        uuid TEXT PRIMARY KEY, 
        documento_id INTEGER NOT NULL, 
        usuario_dni TEXT NOT NULL, 
        nombre_firmante TEXT NOT NULL, 
        cargo TEXT, 
        fecha_firma DATETIME DEFAULT CURRENT_TIMESTAMP, 
        hash_documento TEXT,
        xml_firma TEXT,
        archivo_xml TEXT,
        FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE 
    )`);

    // Migraciones automáticas para la tabla firmas_evidencias
    const migracionesEvidencias = [
        `ALTER TABLE firmas_evidencias ADD COLUMN xml_firma TEXT`,
        `ALTER TABLE firmas_evidencias ADD COLUMN archivo_xml TEXT`
    ];

    migracionesEvidencias.forEach(query => {
        db.run(query, (err) => {
            if (err && !err.message.includes("duplicate column name") && !err.message.includes("no such table")) {
                // Captura controlada de logs operacionales
            }
        });
    });

    // =====================================================================
    // SILLONES DE CONTROL: POBLADO DE USUARIOS DE PRUEBA (CON CONTRASEÑA CIFRADA)
    // =====================================================================
    const hashPasswordPrueba = crypto.createHash('sha256').update('123').digest('hex');

    const usuariosPrueba = [
        ['12345678A', 'Juan', 'Perez', 'juan@ejemplo.com', 'Director', hashPasswordPrueba, 'superadmin', '/img/default-avatar.png', 1],
        ['87654321B', 'Maria', 'Garcia', 'maria@ejemplo.com', 'Secretaria', hashPasswordPrueba, 'usuario', '/img/default-avatar.png', 1]
    ];

    const stmt = db.prepare(`INSERT OR IGNORE INTO usuarios (dni, nombre, apellidos, email, cargo, password, rol, foto_url, notif_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    usuariosPrueba.forEach((user) => { stmt.run(user); });
    stmt.finalize();

    console.log("✅ Capa de datos e integridad relacional estructuradas correctamente.");

    // =====================================================================
    // 🔐 GENERACIÓN AUTOMÁTICA ÚNICA DE LLAVES OTP (BÚNKER DE EMERGENCIA)
    // =====================================================================
    db.get("SELECT COUNT(*) AS total FROM llaves_maestras", [], (err, row) => {
        if (err) {
            console.error("❌ Error al verificar las llaves maestras en el búnker:", err.message);
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
            console.log("🔒 Búnker de seguridad: Códigos maestros OTP operativos en el sistema.");
        }
    });
});

module.exports = db;