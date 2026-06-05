const express = require('express');
const path = require('path');
const session = require('express-session'); // 🔑 Gestión de sesiones seguras

// --- IMPORTACIONES DE MÓDULOS ---
const db = require('./database');
const inicializarProyecto = require('./config/init');

// --- IMPORTACIÓN DE RUTAS ---
const adminRoutes = require('./routes/admin');
const documentoRoutes = require('./routes/documentos');
const usuarioRoutes = require('./routes/usuarios');
const superadminRoutes = require('./routes/superadmin');
const perfilRoutes = require('./routes/perfil');
const firmaRoutes = require('./routes/firmas'); // 🔌 NUEVO: Módulo receptor de Autofirma

const app = express();

// --- MIDDLEWARES ---
// 🚀 MODIFICADO: Ampliado el límite a 50mb para permitir la transferencia de PDFs en Base64
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json({ limit: '50mb' }));

// 🔒 CONFIGURACIÓN DEL MOTOR DE SESIONES (La llave invisible)
app.use(session({
    secret: 'clave_secreta_ultra_segura_para_consabfirma_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Cambiar a 'true' si en el futuro se usa HTTPS en producción
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


// 🔒 --- MIDDLEWARE DE PROTECCIÓN GLOBAL PARA EL BÚNKER ---
const cerrojoSuperadmin = (req, res, next) => {
    // 1. Caso de Emergencia: La ruta de reemplazo por OTP debe estar accesible 
    if (req.path === '/reemplazar') {
        return next();
    }

    // 2. Verificación de sesión activa en el servidor
    if (!req.session || !req.session.usuario) {
        return res.status(403).send("⚠️ Acceso denegado: No hay ninguna sesión activa. Inicie sesión.");
    }

    const { dni } = req.session.usuario;

    // 3. Verificación de seguridad activa en la Base de Datos para asegurar vigencia del rol
    db.get("SELECT rol FROM usuarios WHERE dni = ?", [dni], (err, usuario) => {
        if (err || !usuario) {
            return res.status(403).send("⚠️ Acceso denegado: Identidad no reconocida.");
        }

        if (usuario.rol !== 'superadmin') {
            // Dejamos constancia en auditoría del intento de intrusión
            db.run(`INSERT INTO auditoria (documento_id, usuario_dni, accion, detalles) 
                    VALUES (NULL, ?, 'ALERTA SEGURIDAD', 'Intento fallido de acceder al Búnker sin rol de superadmin activo.')`,
                [dni]);

            return res.status(403).send("🛑 ACCESO DENEGADO: Este intento ha sido registrado en la auditoría central.");
        }

        // Si la sesión es válida y sigue siendo superadmin en DB, abrimos compuertas
        next();
    });
};


// --- ACTIVACIÓN DE RUTAS ---
app.use('/admin', adminRoutes);
app.use('/admin', documentoRoutes);
app.use('/usuario', usuarioRoutes);
app.use('/perfil', perfilRoutes);

// 🔌 NUEVO: Activación de la API para la recepción de firmas criptográficas
app.use('/api/firmas', firmaRoutes);

// 🔒 Aplicamos el cerrojo de seguridad exclusivamente al prefijo /superadmin
app.use('/superadmin', cerrojoSuperadmin, superadminRoutes);


// --- SISTEMA DE AUTENTICACIÓN (LOGIN) ---
app.post('/auth', (req, res) => {
    const { dni, password } = req.body;

    const query = "SELECT * FROM usuarios WHERE dni = ? AND password = ?";
    db.get(query, [dni, password], (err, user) => {
        if (err) {
            console.error("❌ Error crítico en consulta de autenticación:", err);
            return res.status(500).send("Error interno del servidor");
        }

        if (user) {
            // 🔑 Guardamos los datos del usuario en la sesión del servidor de forma invisible
            req.session.usuario = {
                dni: user.dni,
                rol: user.rol
            };

            // 🚀 REDIRECCIÓN LIMPIA Y CIEGA
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
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">Consabfirma</div>
                <p>Acceso al Sistema de Firmas</p>
                <form action="/auth" method="POST">
                    <label>DNI</label>
                    <input type="text" name="dni" placeholder="12345678A" required autofocus>
                    <label>Contraseña</label>
                    <input type="password" name="password" placeholder="••••••••" required>
                    <button type="submit" class="btn-login">Entrar al Sistema</button>
                </form>
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
                console.error("❌ [🤖 CRON] Error al consultar cambios_superadmin_programados. Asegúrate de añadir la tabla en database.js:", err.message);
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

                    console.log(`[🤖 CRON] Cambio diferido ejecutado. Nuevo Superadmin: ${tarea.dni_nuevo}, Antiguo pasó a: ${tarea.rol_destino_antiguo}`);
                });
            });
        }
    );
}, 60000);


// --- LANZAMIENTO ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('---');
    console.log(`🚀 Servidor listo en: http://localhost:${PORT}`);
    console.log(`📂 Gestión integrada de estáticos en: /uploads`);
    console.log('---');
});