const express = require('express');
const path = require('path');

// --- IMPORTACIONES DE MÓDULOS ---
const db = require('./database');
const inicializarProyecto = require('./config/init');

// --- IMPORTACIÓN DE RUTAS ---
const adminRoutes = require('./routes/admin');
const documentoRoutes = require('./routes/documentos');
const usuarioRoutes = require('./routes/usuarios');
const superadminRoutes = require('./routes/superadmin');
const perfilRoutes = require('./routes/perfil');

const app = express();

// --- MIDDLEWARES ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Servir archivos estáticos del frontend (CSS, JS, imágenes decorativas)
app.use(express.static(path.join(__dirname, 'public')));

// --- CONFIGURACIÓN DE CARPETAS DE CARGA (Uploads) ---
// Separamos las rutas para evitar que Express se confunda al buscar archivos
app.use('/uploads/documentos', express.static(path.join(__dirname, 'documentos_firmados')));
app.use('/uploads/avatars', express.static(path.join(__dirname, 'uploads/avatars')));

// Inicializar carpetas necesarias y base de datos
inicializarProyecto();

// --- ACTIVACIÓN DE RUTAS ---
app.use('/admin', adminRoutes);
app.use('/admin', documentoRoutes); // Comparte prefijo con admin
app.use('/usuario', usuarioRoutes);
app.use('/superadmin', superadminRoutes);
app.use('/perfil', perfilRoutes); // Ruta para la API y vista de perfil

// --- SISTEMA DE AUTENTICACIÓN (LOGIN) ---
app.post('/auth', (req, res) => {
    const { dni, password } = req.body;

    const query = "SELECT * FROM usuarios WHERE dni = ? AND password = ?";
    db.get(query, [dni, password], (err, user) => {
        if (err) {
            console.error("Error en DB:", err);
            return res.status(500).send("Error interno del servidor");
        }

        if (user) {
            // Redirección según el rol del usuario
            switch (user.rol) {
                case 'superadmin':
                    res.redirect(`/superadmin/dashboard/${user.dni}`);
                    break;
                case 'admin':
                    res.redirect(`/admin/${user.dni}`);
                    break;
                default:
                    res.redirect(`/usuario/${user.dni}`);
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

// --- LANZAMIENTO ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('---');
    console.log(`🚀 Servidor listo en: http://localhost:${PORT}`);
    console.log(`📂 Documentos en: /uploads/documentos`);
    console.log(`👤 Avatars en: /uploads/avatars`);
    console.log('---');
});