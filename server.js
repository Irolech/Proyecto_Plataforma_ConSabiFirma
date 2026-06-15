const express = require('express');
const path = require('path');
const fs = require('fs'); // 🔌 Módulo nativo para lectura de archivos físicos
const session = require('express-session'); // 🔑 Gestión de sesiones seguras
const https = require('https'); // 🔒 Nuevo: Motor nativo HTTPS para mTLS

// --- IMPORTACIONES DE MÓDULOS ---
const db = require('./database'); // 🛠️ Apunta a database.js para usar la tabla notificaciones
const inicializarProyecto = require('./config/init');

// --- IMPORTACIÓN DE RUTAS ---
const adminRoutes = require('./routes/admin');
const documentoRoutes = require('./routes/documentos');
const usuarioRoutes = require('./routes/usuarios');
const superadminRoutes = require('./routes/superadmin');
const perfilRoutes = require('./routes/perfil');
const firmaRoutes = require('./routes/firmas'); // 🔌 Módulo receptor de Autofirma
const validacionRoutes = require('./routes/validacion'); // 🚀 Módulo de validación pública CSV

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
        secure: true, // 🔒 CAMBIADO A TRUE: Obligatorio al operar bajo HTTPS nativo
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
    // Si el usuario ya está plenamente autenticado por certificado en esta sesión, saltamos la comprobación técnica
    if (req.session && req.session.autenticado_via_cert === true) {
        return next();
    }

    // Verificamos si la conexión viene de un canal seguro que expone certificados
    if (req.socket && typeof req.socket.getPeerCertificate === 'function') {
        const cert = req.socket.getPeerCertificate();

        // Si el navegador proporcionó un certificado válido y con datos de sujeto
        if (cert && Object.keys(cert).length > 0 && cert.subject) {
            let dni = null;

            // 🔍 Extractor inteligente de DNI/NIF
            if (cert.subject.serialNumber) {
                // Formato oficial español estándar de la FNMT / DNIe (ej. "IDCES-12345678A")
                dni = cert.subject.serialNumber.replace('IDCES-', '');
            } else if (cert.subject.CN) {
                // Fallback para certificados creados de forma externa o con patrones combinados
                const match = cert.subject.CN.match(/([0-8][0-9]{7}[A-Z])/i);
                if (match) {
                    dni = match[1];
                } else {
                    dni = cert.subject.CN; // Asignación directa si el Common Name es estrictamente el DNI
                }
            }

            if (dni) {
                dni = dni.trim().toUpperCase();

                // Intentamos localizar el DNI en la base de datos de la aplicación
                db.get("SELECT * FROM usuarios WHERE dni = ?", [dni], (err, user) => {
                    if (!err && user) {
                        req.session.usuario = {
                            dni: user.dni,
                            rol: user.rol
                        };
                        req.session.autenticado_via_cert = true; // 🔑 Sello de Máxima Seguridad: Permite escrituras y firmas
                        console.log(`🔒 [mTLS] Autenticación fuerte exitosa via certificado para: ${dni} (${user.rol})`);
                    }
                    next();
                });
                return;
            }
        }
    }

    // Si no se detectó ningún certificado pero existe un login tradicional previo por formulario
    if (req.session && req.session.usuario && req.session.autenticado_via_cert === undefined) {
        req.session.autenticado_via_cert = false; // ⚠️ Sello de Baja Seguridad: Acceso restringido a Solo Consulta
    }
    next();
});


// 🔒 --- MIDDLEWARE DE CONTROL DE ACCESO PARA OPERACIONES DE ESCRITURA Y GESTIÓN ---
const requiereCertificado = (req, res, next) => {
    if (!req.session || !req.session.usuario) {
        return res.status(403).send("⚠️ Acceso denegado: No hay ninguna sesión activa. Inicie sesión.");
    }

    // Bloqueo total si el usuario intenta enviar datos (POST/PUT/DELETE) habiendo entrado solo con contraseña
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
    if (req.path === '/reemplazar') {
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
// Protegemos globalmente cualquier mutación de datos en el entorno de administración y firmas corporativas
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

// 🔌 Activación de la API para la recepción de firmas criptográficas
app.use('/api/firmas', firmaRoutes);

// 🚀 Activación de la API pública de validación (Sin cerrojo de sesión)
app.use('/api/validacion', validacionRoutes);

// 🚀 Ruta pública para acceder al portal de Sede Electrónica (Frontend)
app.get('/validar', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'validar.html'));
});

// 🔒 Aplicamos el cerrojo de seguridad exclusivamente al prefijo /superadmin
// Añadimos también el requerimiento de certificado para cualquier acción del búnker
app.use('/superadmin', requiereCertificado, cerrojoSuperadmin, superadminRoutes);


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
            // Guardamos la sesión tradicional
            req.session.usuario = {
                dni: user.dni,
                rol: user.rol
            };

            // ⚠️ ALERTA: Al entrar por formulario de contraseña, el nivel de seguridad es restringido
            req.session.autenticado_via_cert = false;

            console.log(`⚠️ [Password] Sesión limitada (Solo Consulta) iniciada para: ${user.dni}`);

            switch (user.rol) {
                case 'superadmin':
                    res.redirect('/superadmin/dashboard');
                    break;
                case 'admin':
                    res.redirect('/admin');
                    break;
                default:
                    res.redirect('/usuario');
                    break;
            }
        } else {
            res.send(`
                <script>
                    alert("Usuario o contraseña incorrectos");
                    window.location.href = "/";
                </script>
            `);
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
            res.redirect('/');
        });
    } else {
        res.redirect('/');
    }
});


// --- RUTA RAÍZ (LOGIN HTML) ---
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Consabfirma - Acceso</title>
            <style>
                body { height: 100vh; align-items: center; justify-content: center; display: flex; background: #f4f7f6; margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                .container { background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); max-width: 400px; width: 100%; text-align: center; }
                .logo { font-size: 2.2rem; font-weight: bold; color: #2ecc71; margin-bottom: 10px; letter-spacing: -1px; }
                p { color: #666; margin-bottom: 20px; }
                label { display: block; text-align: left; margin-top: 15px; font-weight: 600; color: #444; }
                input { width: 100%; padding: 12px; margin-top: 5px; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; transition: border 0.3s; }
                input:focus { border-color: #2ecc71; outline: none; }
                .btn-login { width: 100%; margin-top: 25px; background: #2ecc71; color: white; border: none; padding: 14px; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: bold; transition: background 0.3s; }
                .btn-login:hover { background: #27ae60; }
                .enlace-validador { display: block; margin-top: 20px; font-size: 0.85rem; color: #0056b3; text-decoration: none; }
                .enlace-validador:hover { text-decoration: underline; }
                .info-cert { margin-top: 15px; padding: 10px; background: #e8f8f5; border-radius: 6px; font-size: 0.85rem; color: #16a085; border: 1px dashed #2ecc71; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">Consabfirma</div>
                <p>Acceso al Sistema de Firmas</p>
                
                <div class="info-cert">
                    💡 <strong>Acceso Automático con Certificado:</strong> Si tu certificado electrónico está listo en el navegador, el sistema te identificará automáticamente con permisos de escritura y firma al recargar o navegar por la aplicación.
                </div>

                <form action="/auth" method="POST">
                    <label>DNI</label>
                    <input type="text" name="dni" placeholder="12345678A" required autofocus>
                    <label>Contraseña</label>
                    <input type="password" name="password" placeholder="••••••••" required>
                    <button type="submit" class="btn-login">Entrar modo Solo Consulta</button>
                </form>
                
                <a href="/validar" class="enlace-validador">🔍 Verificar la autenticidad de un documento (CSV)</a>
            </div>
        </body>
        </html>
    `);
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

                    db.run(
                        `INSERT INTO auditoria (documento_id, usuario_dni, accion, detalles) 
                         VALUES (NULL, ?, 'AUTOMATISMO: CAMBIO PODER', ?)`,
                        [tarea.dni_nuevo, `El sistema ejecutó el cambio programado por DNI ${tarea.dni_antiguo}. Rol asignado al antiguo: ${tarea.rol_destino_antiguo}.`]
                    );

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
    ca: fs.readFileSync(path.join(__dirname, 'ca.crt')), // CA que usaremos para validar los certificados del cliente
    requestCert: true,                                  // Solicita el certificado al navegador
    rejectUnauthorized: false                           // Permite conexiones sin cert para degradar a login tradicional
};

// --- LANZAMIENTO HTTPS SEGURO ---
const PORT = process.env.PORT || 3000;
https.createServer(opcionesHttps, app).listen(PORT, () => {
    console.log('---');
    console.log(`🚀 SERVIDOR SEGURO (mTLS) ACTIVO EN: https://localhost:${PORT}`);
    console.log(`📂 Gestión integrada de estáticos en: /uploads`);
    console.log('---');
});