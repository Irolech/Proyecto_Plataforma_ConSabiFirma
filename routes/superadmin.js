const express = require('express');
const router = express.Router();
const db = require('../database');

// RUTA: Panel de Gestión de la Aplicación
router.get('/dashboard/:dni', (req, res) => {
    const dni = req.params.dni;

    db.get("SELECT nombre, apellidos, dni, rol, cargo, email, foto_url, notif_email FROM usuarios WHERE dni = ?", [dni], (err, usuario) => {
        if (err || !usuario || usuario.rol !== 'superadmin') {
            return res.status(403).send("Acceso denegado");
        }

        db.all("SELECT * FROM usuarios ORDER BY rol DESC, apellidos ASC", [], (errUsers, listaUsuarios) => {

            // Función para obtener iniciales correctas (Nombre + Primer Apellido)
            const getAvatarUrl = (u) => {
                if (u.foto_url && u.foto_url !== '/img/default-avatar.png') {
                    return u.foto_url;
                }
                const primerApellido = u.apellidos ? u.apellidos.split(' ')[0] : '';
                const bgColor = u.rol === 'superadmin' ? 'ff793f' : '6c5ce7';
                return `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nombre)}+${encodeURIComponent(primerApellido)}&background=${bgColor}&color=fff&bold=true`;
            };

            const miFotoPerfil = getAvatarUrl(usuario);

            res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Gestión - Consabfirma</title>
                <link rel="stylesheet" href="/css/style.css">
                <style>
                    .sidebar { display: flex; flex-direction: column; height: 100vh; position: fixed; border-right-color: var(--super); }
                    .brand { font-size: 1.5rem; font-weight: bold; color: var(--super); margin-bottom: 40px; text-align: center; }
                    .user-profile { 
                        background: rgba(255,255,255,0.05); padding: 15px; border-radius: var(--radius); 
                        margin-bottom: 30px; border: 1px solid rgba(255, 121, 63, 0.2); 
                    }
                    .role-badge { color: var(--super); font-size: 0.7rem; font-weight: bold; text-transform: uppercase; }
                    .nav-menu { flex-grow: 1; }
                    .logout-area { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; margin-top: auto; padding-bottom: 20px; }
                    
                    /* Estilos Modal Perfil */
                    .overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 998; }
                    .modal-profile { 
                        display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                        background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                        z-index: 999; width: 90%; max-width: 550px;
                    }

                    .user-avatar-list {
                        width: 35px; height: 35px; border-radius: 50%; object-fit: cover; vertical-align: middle;
                    }
                </style>
            </head>
            <body>
                <div class="overlay" id="overlay" onclick="cerrarTodosLosModales()"></div>

                <div class="modal-profile" id="modalPerfil">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="margin: 0; color: var(--text-dark);">Mi Perfil</h2>
                        <span onclick="cerrarPerfil()" style="cursor: pointer; font-size: 1.5rem;">&times;</span>
                    </div>

                    <div style="display: flex; gap: 20px; align-items: start; border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 20px;">
                        <div style="text-align: center;">
                            <img src="${miFotoPerfil}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid var(--super);">
                            <form action="/perfil/update-avatar" method="POST" enctype="multipart/form-data" style="margin-top: 10px;">
                                <input type="hidden" name="dni" value="${usuario.dni}">
                                <label for="file-upload" class="btn btn-outline" style="font-size: 0.7rem; padding: 5px 10px; cursor: pointer; color: var(--super); border-color: var(--super);">Cambiar foto</label>
                                <input id="file-upload" name="avatar" type="file" style="display:none" onchange="this.form.submit()">
                            </form>
                        </div>
                        <div style="flex: 1;">
                            <div style="margin-bottom: 10px;">
                                <label style="font-size: 0.7rem; color: var(--text-muted); display: block;">Nombre Completo</label>
                                <span style="font-weight: bold; color: var(--text-dark);">${usuario.nombre} ${usuario.apellidos}</span>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label style="font-size: 0.7rem; color: var(--text-muted); display: block;">DNI y Cargo</label>
                                <span style="font-family: monospace;">${usuario.dni}</span> | <span>${usuario.cargo || 'Superadmin'}</span>
                            </div>
                            <div>
                                <label style="font-size: 0.7rem; color: var(--text-muted); display: block;">Correo Electrónico</label>
                                <span>${usuario.email}</span>
                            </div>
                        </div>
                    </div>

                    <form action="/perfil/update-settings" method="POST">
                        <input type="hidden" name="dni" value="${usuario.dni}">
                        <h4 style="margin-bottom: 15px; color: var(--text-dark);">Seguridad y Preferencias</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div>
                                <label style="font-size: 0.8rem; display: block; margin-bottom: 5px;">Pass Actual</label>
                                <input type="password" name="currentPassword" class="input-field" style="width: 100%;" placeholder="Requerido">
                            </div>
                            <div>
                                <label style="font-size: 0.8rem; display: block; margin-bottom: 5px;">Nueva Pass</label>
                                <input type="password" name="newPassword" class="input-field" style="width: 100%;" placeholder="Opcional">
                            </div>
                        </div>
                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.9rem;">
                                <input type="checkbox" name="notif_email" id="perf-notif" value="1" ${usuario.notif_email === 1 ? 'checked' : ''}> 
                                Avisarme por email de firmas pendientes
                            </label>
                        </div>
                        <button type="submit" class="btn btn-primary" style="width: 100%; background: var(--super); border:none;">Guardar Cambios</button>
                    </form>
                </div>

                <div class="sidebar">
                    <div class="brand">Consabfirma</div>
                    <div class="user-profile">
                        <span class="role-badge">🛡️ Superadministrador</span>
                        <div style="font-weight: bold; margin-top:5px; color: white;">${usuario.nombre} ${usuario.apellidos}</div>
                    </div>

                    <nav class="nav-menu">
                        <a href="/superadmin/dashboard/${usuario.dni}" class="nav-link active" style="color: var(--super);">⚙️ Gestión Global</a>
                        <a href="/admin/${usuario.dni}" class="nav-link">📤 Mi panel de envío</a>
                        <a href="/usuario/${usuario.dni}" class="nav-link">✍️ Mi panel de firma</a>
                        <div style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
                            <a href="#" class="nav-link" onclick="abrirPerfil()">⚙️ Mi Perfil</a>
                        </div>
                    </nav>

                    <div class="logout-area">
                        <a href="/" class="btn-logout" style="text-decoration:none; color:#ff7675; display:flex; align-items:center; justify-content:center; gap:10px; font-weight:bold;">🚪 Cerrar Sesión</a>
                    </div>
                </div>

                <div class="main-content">
                    <header style="margin-bottom: 40px;">
                        <h1>Gestión del Sistema</h1>
                        <p style="color: var(--text-muted);">Panel de control total de usuarios y configuración.</p>
                    </header>

                    <div class="card" style="margin-bottom: 30px; border-top: 4px solid var(--super);">
                        <h3 style="margin-bottom: 20px;">➕ Registrar Nuevo Usuario</h3>
                        <form action="/superadmin/crear-usuario" method="POST" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                            <input type="hidden" name="adminDni" value="${usuario.dni}">
                            <input type="text" name="nuevoDni" class="input-field" placeholder="DNI (con letra)" required>
                            <input type="text" name="nombre" class="input-field" placeholder="Nombre" required>
                            <input type="text" name="apellidos" class="input-field" placeholder="Apellidos" required>
                            <input type="email" name="email" class="input-field" placeholder="Email" required>
                            <input type="text" name="cargo" class="input-field" placeholder="Cargo/Puesto">
                            <input type="password" name="password" class="input-field" placeholder="Contraseña Temporal" required>
                            <select name="rol" class="input-field">
                                <option value="usuario">Rol: Usuario Firmante</option>
                                <option value="admin">Rol: Administrador (Envío)</option>
                                <option value="superadmin">Rol: Superadministrador</option>
                            </select>
                            <button type="submit" class="btn btn-primary" style="background: var(--super); border:none;">Crear Cuenta</button>
                        </form>
                    </div>

                    <div class="card">
                        <h3 style="margin-bottom: 20px;">Cuentas Activas</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="text-align: left; border-bottom: 2px solid var(--border);">
                                    <th style="padding: 15px;">Usuario</th>
                                    <th style="padding: 15px;">DNI</th>
                                    <th style="padding: 15px;">Rol</th>
                                    <th style="padding: 15px;">Cargo</th>
                                    <th style="padding: 15px; text-align: right;">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${listaUsuarios.map(u => {
                const avatarUrl = getAvatarUrl(u);
                return `
                                    <tr style="border-bottom: 1px solid var(--border);">
                                        <td style="padding: 15px; display: flex; align-items: center; gap: 10px;">
                                            <img src="${avatarUrl}" class="user-avatar-list">
                                            <span>${u.nombre} ${u.apellidos}</span>
                                        </td>
                                        <td style="padding: 15px; font-family: monospace;">${u.dni}</td>
                                        <td style="padding: 15px;">
                                            <span class="status-pill" style="background: ${u.rol === 'superadmin' ? '#fff4ed' : '#e0e7ff'}; color: ${u.rol === 'superadmin' ? 'var(--super)' : 'var(--primary)'};">
                                                ${u.rol.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style="padding: 15px;">${u.cargo || '---'}</td>
                                        <td style="padding: 15px; text-align: right;">
                                            <button class="btn btn-outline" style="font-size: 0.7rem; padding: 5px 10px; color: var(--danger); border-color: #ff7675;" onclick="confirmarEliminacion('${u.dni}', '${u.nombre}', '${usuario.dni}')">Eliminar</button>
                                        </td>
                                    </tr>`;
            }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <script>
                    function abrirPerfil() {
                        document.getElementById('modalPerfil').style.display = 'block';
                        document.getElementById('overlay').style.display = 'block';
                    }
                    function cerrarPerfil() {
                        document.getElementById('modalPerfil').style.display = 'none';
                        document.getElementById('overlay').style.display = 'none';
                    }
                    function cerrarTodosLosModales() { cerrarPerfil(); }
                    function confirmarEliminacion(targetDni, nombre, adminDni) {
                        if (confirm('¿Estás seguro de que deseas eliminar a ' + nombre + '?')) {
                            window.location.href = '/superadmin/eliminar-usuario/' + adminDni + '/' + targetDni;
                        }
                    }
                </script>
            </body>
            </html>
            `);
        });
    });
});

module.exports = router;