require('dotenv').config(); // 2.3: Cargamos las variables de entorno al inicio
const express = require('express');
const path = require('path');
const fs = require('fs'); // 🔌 Módulo nativo para lectura de archivos físicos
const session = require('express-session'); // 🔑 Gestión de sesiones seguras
const https = require('https'); // 🔒 Motor nativo HTTPS para mTLS
const http = require('http'); // 🌐 Motor nativo HTTP para el portal público

// 🚀 CONFIGURACIÓN GLOBAL DE PUERTOS Y ENLACES (Evita colisiones de red)
const PORT_HTTP = process.env.PORT || 8085;
const PORT_HTTPS = process.env.PORT_HTTPS || 8086;
const BASE_URL = process.env.URL_VERIFICACION || `http://localhost:${PORT_HTTP}`;

// --- IMPORTACIONES DE MÓDULOS ---
const db = require('./database'); // 🛠️ Apunta a database.js
const inicializarProyecto = require('./config/init');

// --- IMPORTACIÓN DE RUTAS ---
const adminRoutes = require('./routes/admin');
const documentoRoutes = require('./routes/documentos');
const usuarioRoutes = require('./routes/usuarios');
const superadminRoutes = require('./routes/superadmin');
const perfilRoutes = require('./routes/perfil');
const firmaRoutes = require('./routes/firmas'); // 🔌 Módulo receptor de Autofirma
const validacionRoutes = require('./routes/validacion'); // 🚀 Módulo de validación pública CSV
const verificacionRoutes = require('./routes/verificacion'); // 🔍 Módulo de cotejo público de evidencia de firmas

const app = express();

// --- MIDDLEWARES ---
// 🚀 Ampliado el límite a 50mb para permitir la transferencia de PDFs en Base64
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json({ limit: '50mb' }));

// 🔒 CONFIGURACIÓN DEL MOTOR DE SESIONES
app.use(session({
    secret: 'clave_secreta_ultra_segura_para_consabfirma_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // ⚠️ IMPORTANTE: Como el login tradicional entra por HTTP, debe estar en false en desarrollo
        httpOnly: true, // Protege la cookie contra ataques XSS
        maxAge: 30 * 60 * 1000 // ⏱️ Duración: 30 minutos de inactividad
    }
}));

// Servir archivos estáticos del frontend (CSS, JS, imágenes de la interfaz)
app.use(express.static(path.join(__dirname, 'public')));

// --- CONFIGURACIÓN DE CARPETAS DE CARGA (Uploads) UNIFICADA ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Inicializar carpetas necesarias y base de datos
inicializarProyecto();


// 🔒 --- MIDDLEWARE DE EXTRACCIÓN Y AUTENTICACIÓN POR CERTIFICADO DIGITAL (mTLS) ---
app.use((req, res, next) => {
    if (req.session && req.session.autenticado_via_cert === true) {
        return next();
    }

    if (req.socket && typeof req.socket.getPeerCertificate === 'function') {
        const cert = req.socket.getPeerCertificate();

        if (cert && Object.keys(cert).length > 0 && cert.subject) {
            let dni = null;

            if (cert.subject.serialNumber) {
                dni = cert.subject.serialNumber.replace('IDCES-', '');
            } else if (cert.subject.CN) {
                const match = cert.subject.CN.match(/([0-8][0-9]{7}[A-Z])/i);
                if (match) {
                    dni = match[1];
                } else {
                    dni = cert.subject.CN;
                }
            }

            if (dni) {
                dni = dni.trim().toUpperCase();

                // 🔍 DEPILACIÓN DE CERTIFICADO
                console.log(`\n--- LECTURA DE CERTIFICADO ---`);
                console.log(`DNI extraído por el servidor: [${dni}]`);
                console.log(`--------------------------------\n`);

                db.get("SELECT * FROM usuarios WHERE dni = ?", [dni], (err, user) => {
                    if (!err && user) {
                        req.session.usuario = {
                            dni: user.dni,
                            rol: user.rol
                        };
                        req.session.autenticado_via_cert = true;
                        console.log(`🔒 [mTLS] Autenticación fuerte exitosa via certificado para: ${dni} (${user.rol})`);
                    } else {
                        console.log(`⚠️ [mTLS] Certificado leído pero el DNI ${dni} no está en la base de datos.`);
                    }
                    next();
                });
                return;
            }
        }
    }

    if (req.session && req.session.usuario && req.session.autenticado_via_cert === undefined) {
        req.session.autenticado_via_cert = false;
    }
    next();
});


// 🔒 --- MIDDLEWARE DE CONTROL DE ACCESO PARA OPERACIONES DE ESCRITURA Y GESTIÓN ---
const requiereCertificado = (req, res, next) => {
    if (!req.session || !req.session.usuario) {
        return res.status(403).send("⚠️ Acceso denegado: No hay ninguna sesión activa. Inicie sesión.");
    }

    if (!req.session.autenticado_via_cert) {
        return res.status(403).send("🛑 ACCIÓN RESTRINGIDA: Para realizar modificaciones, crear registros, gestionar la aplicación o firmar documentos, es obligatorio acceder utilizando su certificado electrónico.");
    }

    next();
};


// 🔌 RUTA: Lectura y conversión a Base64 en tiempo real de 'documento_prueba.pdf'
app.get('/api/documento-prueba', (req, res) => {
    try {
        const pdfPath = path.join(__dirname, 'documento_prueba.pdf');
        if (!fs.existsSync(pdfPath)) {
            return res.status(404).json({ success: false, error: "No se encontró el archivo 'documento_prueba.pdf'." });
        }
        const pdfBase64 = fs.readFileSync(pdfPath, { encoding: 'base64' });
        res.json({ success: true, base64: pdfBase64 });
    } catch (error) {
        console.error("❌ Error procesando el PDF de prueba:", error);
        res.status(500).json({ success: false, error: "Error interno en el servidor." });
    }
});


// 🔒 --- MIDDLEWARE DE PROTECCIÓN GLOBAL PARA EL BÚNKER ---
const cerrojoSuperadmin = (req, res, next) => {
    if (req.path === '/bypass-emergencia') {
        return next();
    }

    if (!req.session || !req.session.usuario) {
        return res.status(403).send("⚠️ Acceso denegado: No hay ninguna sesión activa. Inicie sesión.");
    }

    const { dni } = req.session.usuario;

    db.get("SELECT rol FROM usuarios WHERE dni = ?", [dni], (err, usuario) => {
        if (err || !usuario) {
            return res.status(403).send("⚠️ Acceso denegado: Identidad no reconocida.");
        }

        if (usuario.rol !== 'superadmin') {
            db.run(`INSERT INTO auditoria (documento_id, usuario_dni, accion, detalles) 
                    VALUES (NULL, ?, 'ALERTA SEGURIDAD', 'Intento fallido de acceder al Búnker sin rol de superadmin activo.')`,
                [dni]);

            return res.status(403).send("🛑 ACCESO DENEGADO: This attempt has been logged.");
        }

        next();
    });
};


// --- APLICACIÓN E INYECCIÓN DE CONTROL DE RUTAS DE ESCRITURA ---
app.use('/admin', (req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        return requiereCertificado(req, res, next);
    }
    next();
});

app.use('/api/firmas', (req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        return requiereCertificado(req, res, next);
    }
    next();
});

// --- ACTIVACIÓN DE RUTAS ---
app.use('/admin', adminRoutes);
app.use('/admin', documentoRoutes);
app.use('/usuario', usuarioRoutes);
app.use('/perfil', perfilRoutes);
app.use('/api/firmas', firmaRoutes);
app.use('/api/validacion', validacionRoutes);
app.use('/verificar', verificacionRoutes); // 🛡️ Ruta pública para la verificación individual de evidencias

// 🚀 Ruta pública para acceder al portal de Sede Electrónica (Frontend)
app.get('/validar', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'validar.html'));
});

// 🔒 Aplicamos el cerrojo de seguridad de identidad al Búnker
app.use('/superadmin', cerrojoSuperadmin, (req, res, next) => {
    if (req.path === '/bypass-emergencia') {
        return next();
    }

    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        return requiereCertificado(req, res, next);
    }
    next();
}, superadminRoutes);


// --- RUTA RAÍZ (PORTAL DE ACCESO INTELIGENTE DE DOBLE VÍA) ---
app.get('/', (req, res) => {
    if (req.secure) {
        if (req.session && req.session.usuario) {
            const { rol } = req.session.usuario;
            if (rol === 'superadmin') return res.redirect('/superadmin');
            if (rol === 'admin') return res.redirect('/admin');
            return res.redirect('/usuario');
        } else {
            return res.redirect(`${BASE_URL}/`);
        }
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Consabfirma - Portal Público</title>
            <style>
                body { height: 100vh; align-items: center; justify-content: center; display: flex; background: #f4f7f6; margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                .container { background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); max-width: 450px; width: 100%; text-align: center; }
                .logo { font-size: 2.2rem; font-weight: bold; color: #2ecc71; margin-bottom: 10px; letter-spacing: -1px; }
                p.subtitle { color: #666; margin-bottom: 25px; font-size: 1.1rem; }
                .btn-cert { display: block; width: 100%; background: #0056b3; color: white; text-decoration: none; padding: 14px; border-radius: 8px; font-weight: bold; transition: background 0.3s; margin-bottom: 15px; box-sizing: border-box; font-size: 1rem; }
                .btn-cert:hover { background: #004494; }
                .btn-secondary { width: 100%; background: transparent; color: #7f8c8d; border: 2px solid #bdc3c7; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 0.95rem; font-weight: bold; transition: all 0.3s; }
                .btn-secondary:hover { border-color: #95a5a6; color: #34495e; background: #f8f9fa; }
                #login-form { display: none; margin-top: 20px; text-align: left; animation: fadeIn 0.4s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                label { display: block; margin-top: 15px; font-weight: 600; color: #444; font-size: 0.9rem; }
                input { width: 100%; padding: 12px; margin-top: 5px; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; transition: border 0.3s; }
                input:focus { border-color: #2ecc71; outline: none; }
                .alerta-limitacion { margin-top: 15px; padding: 12px; background: #fff3cd; border-left: 4px solid #ffc107; font-size: 0.85rem; color: #856404; text-align: left; }
                .btn-primary { width: 100%; background: #2ecc71; color: white; border: none; padding: 14px; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: bold; margin-top: 20px; transition: background 0.3s; }
                .btn-primary:hover { background: #27ae60; }
                .enlace-validador { display: block; margin-top: 30px; font-size: 0.85rem; color: #0056b3; text-decoration: none; border-top: 1px solid #eee; padding-top: 15px; }
                .enlace-validador:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">Consabfirma</div>
                <p class="subtitle">Portal de Acceso</p>
                <a href="https://localhost:${PORT_HTTPS}/" class="btn-cert">🔒 Acceder con Certificado Digital</a>
                <button class="btn-secondary" onclick="document.getElementById('login-form').style.display='block'; this.style.display='none';">Acceso con Contraseña (Solo Lectura)</button>
                <div id="login-form">
                    <div class="alerta-limitacion">⚠️ <strong>Modo Solo Consulta:</strong> Al acceder mediante DNI y contraseña, tus permisos estarán limitados.</div>
                    <form action="/auth" method="POST">
                        <label>DNI del Usuario</label>
                        <input type="text" name="dni" placeholder="Ej: 12345678A" required>
                        <label>Contraseña</label>
                        <input type="password" name="password" placeholder="••••••••" required>
                        <button type="submit" class="btn-primary">Entrar al sistema</button>
                    </form>
                </div>
                <a href="/validar" class="enlace-validador">🔍 Verificar la autenticidad de un documento (CSV)</a>
            </div>
        </body>
        </html>
    `);
});


// --- SISTEMA DE AUTENTICACIÓN TRADICIONAL (LOGIN FORMULARIO) ---
app.post('/auth', (req, res) => {
    const { dni, password } = req.body;
    const query = "SELECT * FROM usuarios WHERE dni = ? AND password = ?";
    db.get(query, [dni, password], (err, user) => {
        if (err) {
            console.error("❌ Error crítico en consulta de autenticación:", err);
            return res.status(500).send("Error interno del servidor");
        }
        if (user) {
            req.session.usuario = { dni: user.dni, rol: user.rol };
            req.session.autenticado_via_cert = false;
            switch (user.rol) {
                case 'superadmin': res.redirect('/superadmin'); break;
                case 'admin': res.redirect('/admin'); break;
                default: res.redirect('/usuario'); break;
            }
        } else {
            res.send(`<script>alert("Usuario o contraseña incorrectos"); window.location.href = "${BASE_URL}/";</script>`);
        }
    });
});


// --- RUTA DE CIERRE DE SESIÓN SEGURO (LOGOUT) ---
app.get('/logout', (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                console.error("❌ Error destruyendo la sesión en logout:", err);
                return res.status(500).send("Error interno al cerrar sesión.");
            }
            res.redirect(`${BASE_URL}/`);
        });
    } else {
        res.redirect(`${BASE_URL}/`);
    }
});


// =====================================================================
// ⏰ MOTOR DE COMPROBACIÓN: TRASPASOS PROGRAMADOS DE SUPERADMIN
// =====================================================================
setInterval(() => {
    const ahora = new Date();
    const yyyy = ahora.getFullYear();
    const mm = String(ahora.getMonth() + 1).padStart(2, '0');
    const dd = String(ahora.getDate()).padStart(2, '0');
    const hh = String(ahora.getHours()).padStart(2, '0');
    const min = String(ahora.getMinutes()).padStart(2, '0');
    const stringFechaServidor = `${yyyy}-${mm}-${dd}T${hh}:${min}`;

    db.all(
        "SELECT * FROM cambios_superadmin_programados WHERE ejecutado = 0 AND fecha_ejecucion <= ?",
        [stringFechaServidor],
        (err, tareasPendientes) => {
            if (err) {
                console.error("❌ [🤖 CRON] Error al consultar cambios_superadmin_programados:", err.message);
                return;
            }
            if (!tareasPendientes || tareasPendientes.length === 0) return;

            tareasPendientes.forEach((tarea) => {
                db.serialize(() => {
                    db.run("UPDATE usuarios SET rol = ? WHERE dni = ?", [tarea.rol_destino_antiguo, tarea.dni_antiguo]);
                    db.run("UPDATE usuarios SET rol = 'usuario' WHERE rol = 'superadmin' AND dni != ?", [tarea.dni_nuevo]);
                    db.run("UPDATE usuarios SET rol = 'superadmin' WHERE dni = ?", [tarea.dni_nuevo]);
                    db.run("UPDATE cambios_superadmin_programados SET ejecutado = 1 WHERE id = ?", [tarea.id]);
                    db.run(`INSERT INTO auditoria (documento_id, usuario_dni, accion, detalles) 
                           VALUES (NULL, ?, 'AUTOMATISMO: CAMBIO PODER', ?)`,
                        [tarea.dni_nuevo, `El sistema ejecutó el cambio programado por DNI ${tarea.dni_antiguo}. Rol asignado al antiguo: ${tarea.rol_destino_antiguo}.`]);
                    console.log(`[🤖 CRON] Cambio diferido ejecutado. Nuevo Superadmin: ${tarea.dni_nuevo}`);
                });
            });
        }
    );
}, 60000);


// --- CONFIGURACIÓN DE APERTURA NATIVA HTTPS CON mTLS ---
const opcionesHttps = {
    key: fs.readFileSync(path.join(__dirname, 'server.key')),
    cert: fs.readFileSync(path.join(__dirname, 'server.crt')),
    requestCert: true,
    rejectUnauthorized: false
};


// --- LANZAMIENTO DUAL (HTTP + HTTPS) EN PUERTOS SEPARADOS ---

// 1. Servidor Público (Portal HTTP)
const servidorHttp = http.createServer(app).listen(PORT_HTTP, () => {
    console.log('---');
    console.log(`🌐 PORTAL PÚBLICO (HTTP) ACTIVO EN: ${BASE_URL}`);
});

// 2. Servidor Seguro (HTTPS con mTLS)
const servidorHttps = https.createServer(opcionesHttps, app).listen(PORT_HTTPS, () => {
    console.log(`🚀 SERVIDOR SEGURO (HTTPS/mTLS) ACTIVO EN: https://localhost:${PORT_HTTPS}`);
    console.log(`📂 Gestión integrada de estáticos en: /uploads`);
    console.log('---');
});


// =====================================================================
// 🔌 INTEGRADOR MULTICANAL EN TIEMPO REAL: SOCKET.IO (Sala por DNI)
// =====================================================================
const io = require('socket.io')(servidorHttps, {
    cors: {
        origin: "*", // Permite conexiones cruzadas fluidas en fase de desarrollo local
        methods: ["GET", "POST"]
    }
});

// Compartimos el objeto global 'io' con Express para que las rutas independientes lo utilicen
app.set('io', io);

io.on('connection', (socket) => {
    // Escuchamos el evento de autenticación inmediata que enviará el frontend con su DNI
    socket.on('unirse_a_panel', (data) => {
        if (data && data.dni) {
            const dniSala = data.dni.trim().toUpperCase();
            socket.join(`sala_${dniSala}`);
            console.log(`🔌 [Tiempo Real] Usuario con DNI ${dniSala} se ha conectado y unido a 'sala_${dniSala}'`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔌 [Tiempo Real] Un cliente ha cerrado su canal de comunicación.`);
    });
});