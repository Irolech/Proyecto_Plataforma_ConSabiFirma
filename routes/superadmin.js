const express = require('express');
const router = express.Router();
const db = require('../database');
const crypto = require('crypto');

// =====================================================================
// 0. INICIALIZACIÓN DE INFRAESTRUCTURA DE FECHAS Y ROLES DE SALIDA
// =====================================================================
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS cambios_superadmin_programados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dni_nuevo TEXT NOT NULL,
            dni_antiguo TEXT NOT NULL,
            rol_destino_antiguo TEXT DEFAULT 'usuario',
            fecha_ejecucion TEXT NOT NULL, -- Formato HTML5: YYYY-MM-DDTHH:MM
            ejecutado INTEGER DEFAULT 0
        )
    `);

    // Añadimos la columna de forma segura por si la tabla ya existía previamente en local
    db.run("ALTER TABLE cambios_superadmin_programados ADD COLUMN rol_destino_antiguo TEXT DEFAULT 'usuario'", (err) => {
        // Se ignora el error si la columna ya existe en la base de datos
    });
});

// =====================================================================
// 1. RUTA CRÍTICA: VISTA DEL BYPASS DE EMERGENCIA (GET /superadmin/bunker)
// =====================================================================
// 💡 ARQUITECTURA SEGURA: Esta ruta se posiciona ANTES del middleware de control
// para que cualquier usuario inhabilitado pueda acceder y usar la llave física OTP.
router.get('/bunker', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Consabfirma - Bypass de Emergencia</title>
        <link rel="stylesheet" href="/css/style.css">
        <style>
            :root { --super-bg: #0f172a; --super-card: #1e293b; --super-accent: #ef4444; --super-blue: #38bdf8; }
            body { background-color: var(--super-bg); color: #f8fafc; font-family: sans-serif; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
            .card-emergencia { background: var(--super-card); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 30px; max-width: 450px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            .btn-danger { background: var(--super-accent); color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: bold; width: 100%; margin-top: 15px; font-size: 1rem; text-transform: uppercase; }
            .btn-danger:hover { background: #dc2626; }
            input { width: 100%; padding: 12px; background: #0f172a; color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; box-sizing: border-box; margin-top: 8px; margin-bottom: 15px; font-size: 1rem; }
            input:focus { border-color: var(--super-accent); outline: none; }
            label { display: block; font-size: 0.9rem; color: #cbd5e1; }
            .back-link { display: block; text-align: center; margin-top: 20px; color: #64748b; text-decoration: none; font-size: 0.9rem; }
            .back-link:hover { color: var(--super-blue); }
        </style>
    </head>
    <body>
        <div class="card-emergencia">
            <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 3rem;">🚨</span>
                <h2 style="color: var(--super-accent); margin: 10px 0 5px 0;">Bypass de Emergencia</h2>
                <p style="color: #94a3b8; margin: 0; font-size: 0.85rem;">Restablecimiento de infraestructura mediante Llave Maestra Física (OTP)</p>
            </div>

            <form action="/superadmin/reemplazar" method="POST">
                <label for="nuevoDni">DNI/NIE del Sucesor Administrador:</label>
                <input type="text" name="nuevoDni" id="nuevoDni" required placeholder="Ej: 12345678A" autocomplete="off">

                <label for="llaveOtp">Llave Maestra OTP:</label>
                <input type="text" name="llaveOtp" id="llaveOtp" required placeholder="SABI-XXXX-XXXX" style="font-family: monospace; text-transform: uppercase;" autocomplete="off">

                <button type="submit" class="btn-danger">Forzar Control con Llave Física</button>
            </form>

            <a href="/usuario" class="back-link">← Volver al Panel de Firma</a>
        </div>
    </body>
    </html>
    `);
});

// =====================================================================
// 1.5. REDIRECCIÓN DE CORTESÍA (GET /superadmin)
// =====================================================================
router.get('/', (req, res) => {
    res.redirect('/superadmin/dashboard');
});

// =====================================================================
// MIDDLEWARE: CONTROL DE ACCESO ESTRICTO "BÚNKER" VÍA SESIÓN
// =====================================================================
const verificarSuperadmin = (req, res, next) => {
    if (!req.session || !req.session.usuario) {
        return res.status(403).send("⚠️ Acceso denegado: No hay una sesión activa en el sistema.");
    }

    const adminDni = req.session.usuario.dni;

    db.get("SELECT * FROM usuarios WHERE dni = ? AND rol = 'superadmin'", [adminDni], (err, superuser) => {
        if (err || !superuser) {
            return res.status(403).send("⚠️ Acceso denegado: No tienes credenciales de Superadministrador global.");
        }
        req.superuser = superuser;
        next();
    });
};

// =====================================================================
// 2. VISTA: DASHBOARD PRINCIPAL DEL SUPERADMIN (GET /superadmin/dashboard)
// =====================================================================
router.get('/dashboard', verificarSuperadmin, (req, res) => {
    const superuser = req.superuser;
    const accesoLimitado = req.session.autenticado_via_cert === false;

    db.all("SELECT dni, nombre, apellidos, email, cargo, rol FROM usuarios ORDER BY rol DESC, apellidos ASC", [], (errUsers, todosLosUsuarios) => {
        db.get("SELECT COUNT(*) AS total_docs FROM documentos", [], (errDocs, statsDocs) => {
            db.all("SELECT * FROM auditoria ORDER BY fecha DESC LIMIT 10", [], (errAudit, logsAuditoria) => {

                res.send(`
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Consabfirma - Búnker Superadmin</title>
                    <link rel="stylesheet" href="/css/style.css">
                    <style>
                        :root { --super-bg: #0f172a; --super-card: #1e293b; --super-accent: #ef4444; --super-blue: #38bdf8; }
                        body { background-color: var(--super-bg); color: #f8fafc; font-family: sans-serif; margin: 0; }
                        .card-super { background: var(--super-card); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 25px; margin-bottom: 25px; }
                        .btn-danger { background: var(--super-accent); color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; }
                        .btn-danger:hover { background: #dc2626; }
                        .btn-primary { background: var(--super-blue); color: #0f172a; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; }
                        .btn-primary:hover { background: #0ea5e9; color: white; }
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                        th, td { padding: 12px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); font-family: Arial, sans-serif; font-size: 9pt; }
                        th { color: var(--super-blue); text-transform: uppercase; font-weight: bold; }
                        .badge-super { background: rgba(239, 68, 68, 0.2); color: var(--super-accent); padding: 3px 8px; border-radius: 4px; font-weight: bold; }
                        .badge-admin { background: rgba(56, 189, 248, 0.2); color: var(--super-blue); padding: 3px 8px; border-radius: 4px; font-weight: bold; }
                        .badge-usuario { background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 3px 8px; border-radius: 4px; font-weight: bold; }
                        .action-btn { background: none; border: none; cursor: pointer; font-size: 1.1rem; margin-right: 5px; opacity: 0.8; transition: opacity 0.2s; }
                        .action-btn:hover { opacity: 1; }
                        .grid-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 30px; }
                        input, select { width: 100%; padding: 10px; background: #0f172a; color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; box-sizing: border-box; margin-top: 5px; }
                        label { display: block; font-size: 0.85rem; color: #cbd5e1; margin-top: 12px; }
                        .alerta-lectura { background: #fef08a; color: #854d0e; padding: 15px; border-radius: 6px; margin-bottom: 25px; border-left: 5px solid #eab308; display: flex; align-items: center; gap: 10px; }
                        
                        .nav-bunker { display: flex; gap: 10px; margin-bottom: 25px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 15px; }
                        .nav-link-bunker { color: #94a3b8; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-size: 0.9rem; font-weight: 500; transition: all 0.2s; border: 1px solid transparent; }
                        .nav-link-bunker:hover { color: #f8fafc; background: rgba(255,255,255,0.05); }
                        .nav-link-bunker.active { color: var(--super-blue); background: rgba(56, 189, 248, 0.1); border-color: rgba(56, 189, 248, 0.15); font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div style="padding: 40px; max-width: 1300px; margin: 0 auto;">
                        
                        <header style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 20px; gap: 20px;">
                            <div>
                                <h1 style="color: var(--super-accent); margin: 0;">🔒 Búnker de Gestión Global</h1>
                                <p style="color: #94a3b8; margin: 5px 0 0 0;">Control absoluto de base de datos e infraestructura de firmas.</p>
                            </div>
                            <div style="margin-left: auto; display: flex; gap: 10px;">
                                <a href="/logout" class="btn-danger" style="text-decoration: none; padding: 10px 20px; border-radius: 6px; display: inline-block; white-space: nowrap;">Cerrar Sesión</a>
                            </div>
                        </header>

                        <div class="nav-bunker">
                            <a href="/superadmin/dashboard" class="nav-link-bunker active">🔒 Gestión de la plataforma</a>
                            <a href="/admin/dashboard" class="nav-link-bunker">📤 Panel de envío</a>
                            <a href="/usuario" class="nav-link-bunker">✍️ Mi panel de firma</a>
                        </div>

                        ${accesoLimitado ? `
                            <div class="alerta-lectura">
                                <span style="font-size: 1.5rem;">⚠️</span>
                                <div>
                                    <strong>MODO DE SOLO CONSULTA ACTIVO</strong><br>
                                    Has accedido mediante contraseña. Por seguridad, la creación, edición y eliminación de usuarios están deshabilitadas.
                                </div>
                            </div>
                        ` : ''}

                        <div class="grid-layout">
                            <div>
                                <div class="card-super">
                                    <h3 style="margin-top:0;">👥 Gestión de Usuarios Registrados</h3>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>DNI</th>
                                                <th>Nombre Completo</th>
                                                <th>Email / Cargo</th>
                                                <th>Rol</th>
                                                ${!accesoLimitado ? '<th>Acciones</th>' : ''}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${todosLosUsuarios.map(u => `
                                                <tr>
                                                    <td style="font-family: monospace;">${u.dni}</td>
                                                    <td><strong>${u.apellidos}, ${u.nombre}</strong></td>
                                                    <td>${u.email}<br><small style="color:#94a3b8;">${u.cargo}</small></td>
                                                    <td>
                                                        ${u.rol === 'superadmin' ? '<span class="badge-super">SUPERADMIN</span>' : u.rol === 'admin' ? '<span class="badge-admin">ADMIN</span>' : '<span class="badge-usuario">USUARIO</span>'}
                                                    </td>
                                                    ${!accesoLimitado ? `
                                                    <td>
                                                        <button class="action-btn" title="Modificar Usuario" onclick="cargarFormularioEdicion('${u.dni}', '${u.nombre}', '${u.apellidos}', '${u.email}', '${u.cargo}', '${u.rol}')">✏️</button>
                                                        
                                                        <form action="/superadmin/usuarios/eliminar" method="POST" style="display:inline;">
                                                            <input type="hidden" name="dniEliminar" value="${u.dni}">
                                                            <button type="submit" class="action-btn" title="Eliminar Usuario" onclick="return confirm('⚠️ ¿Estás seguro de eliminar este usuario?')">❌</button>
                                                        </form>
                                                    </td>
                                                    ` : ''}
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>

                                <div class="card-super">
                                    <h3>📜 Registro del Sistema (Auditoría)</h3>
                                    <div style="font-size: 0.85rem; font-family: monospace; max-height: 200px; overflow-y: auto; background:#0f172a; padding:15px; border-radius:6px;">
                                        ${logsAuditoria.map(log => `
                                            <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                <span style="color: #64748b;">[${log.fecha}]</span> 
                                                <span style="color: var(--super-accent);">DNI: ${log.usuario_dni}</span> -> 
                                                <strong style="color: var(--super-blue);">${log.accion}</strong>: ${log.detalles}
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>

                            <div>
                                ${!accesoLimitado ? `
                                <div class="card-super" style="border: 1px solid rgba(56, 189, 248, 0.2);" id="contenedor-formulario">
                                    <h3 id="titulo-form" style="color: var(--super-blue); margin-top:0;">➕ Registrar Nuevo Usuario</h3>
                                    <p id="desc-form" style="font-size:0.8rem; color:#94a3b8;">Inserta un nuevo miembro en la base de datos del centro.</p>
                                    
                                    <form id="form-usuarios" action="/superadmin/usuarios/crear" method="POST">
                                        <label>Documento de Identidad (DNI/NIE):</label>
                                        <input type="text" name="dni" id="input-dni" placeholder="12345678A" required>

                                        <label>Nombre:</label>
                                        <input type="text" name="nombre" id="input-nombre" placeholder="Ej: Carlos" required>

                                        <label>Apellidos:</label>
                                        <input type="text" name="apellidos" id="input-apellidos" placeholder="Ej: Perbech" required>

                                        <label>Correo Electrónico:</label>
                                        <input type="email" name="email" id="input-email" placeholder="correo@ejemplo.com" required>

                                        <label>Cargo / Puesto:</label>
                                        <input type="text" name="cargo" id="input-cargo" placeholder="Ej: Profesor" required>

                                        <div id="bloque-password">
                                            <label>Contraseña Inicial:</label>
                                            <input type="password" name="password" id="input-password" placeholder="••••••••" required>
                                        </div>

                                        <label>Rol de Permisos:</label>
                                        <select name="rol" id="input-rol">
                                            <option value="usuario">Usuario (Solo firma documentos)</option>
                                            <option value="admin">Administrador (Envía y gestiona plantillas)</option>
                                        </select>

                                        <div style="margin-top:20px; display:flex; gap:10px;">
                                            <button type="submit" id="btn-submit-form" class="btn-primary" style="flex:1;">Guardar en Base de Datos</button>
                                            <button type="button" id="btn-cancelar-form" class="btn-danger" style="display:none; background:#475569;" onclick="restablecerFormularioOriginal()">Cancelar</button>
                                        </div>
                                    </form>
                                </div>

                                <div class="card-super" style="border: 1px solid var(--super-blue);">
                                    <h3 style="color: var(--super-blue); margin-top: 0;">👑 Traspaso Oficial de Poderes</h3>
                                    <p style="font-size: 0.8rem; color: #94a3b8; line-height: 1.4;">
                                        Cede el control global a otro usuario de forma voluntaria sin consumir llaves OTP.
                                    </p>
                                    
                                    <form action="/superadmin/traspaso-voluntario" method="POST" style="margin-top: 15px;">
                                        <label>Selecciona al Sucesor Administrador:</label>
                                        <select name="nuevoDni" required style="margin-bottom: 10px;">
                                            <option value="" disabled selected>-- Selecciona un miembro del centro --</option>
                                            ${todosLosUsuarios
                            .filter(u => u.dni !== superuser.dni)
                            .map(u => `
                                                    <option value="${u.dni}">
                                                        ${u.apellidos}, ${u.nombre} (${u.cargo}) — [${u.rol.toUpperCase()}]
                                                    </option>
                                                `).join('')}
                                        </select>

                                        <label>Tu rol de salida (Superadmin saliente):</label>
                                        <select name="rolDestinoAntiguo" style="margin-bottom: 10px;">
                                            <option value="admin" selected>Convertirme en Administrador (Recomendado)</option>
                                            <option value="usuario">Convertirme en Usuario estándar (Solo firma)</option>
                                            <option value="inactivo">Desactivar mi cuenta / Baja del sistema</option>
                                        </select>
                                        
                                        <label>¿Cuándo debe aplicarse el cambio?</label>
                                        <select name="tipoTraspaso" id="select-tipo-traspaso" onchange="conmutarVisibilidadFecha()" style="margin-bottom: 10px;">
                                            <option value="inmediato">Al cerrar la sesión actual (Inmediato)</option>
                                            <option value="programado">Programar para un momento posterior 🗓️</option>
                                        </select>

                                        <div id="bloque-fecha-hora" style="display: none; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; margin-top: 10px; border: 1px dashed rgba(255,255,255,0.1);">
                                            <label style="margin-top:0; color: var(--super-blue);">Fecha y Hora de Efectos:</label>
                                            <input type="datetime-local" name="fechaHoraEfecto" id="input-fecha-hora">
                                        </div>
                                        
                                        <button type="submit" class="btn-primary" style="width: 100%; margin-top:20px;" onclick="return confirm('⚠️ ¿Confirmas que deseas agendar o ejecutar este traspaso?')">
                                            CONFIRMAR TRASPASO
                                        </button>
                                    </form>
                                </div>
                                ` : `
                                <div class="card-super" style="border: 1px dashed rgba(255,255,255,0.2); text-align: center; padding: 40px 20px; opacity: 0.7;">
                                    <div style="font-size: 3rem; margin-bottom: 15px;">🔒</div>
                                    <h3 style="margin-top: 0; color: #94a3b8;">Herramientas Bloqueadas</h3>
                                    <p style="font-size: 0.9rem; color: #64748b;">
                                        Para modificar datos, debes acceder utilizando tu certificado digital.
                                    </p>
                                </div>
                                `}

                                <div class="card-super" style="border: 1px solid rgba(239, 68, 68, 0.3); opacity: 0.85;">
                                    <h4 style="color: var(--super-accent); margin-top: 0; margin-bottom:5px;">🚨 Bypass de Emergencia (OTP)</h4>
                                    <form action="/superadmin/reemplazar" method="POST">
                                        <input type="text" name="nuevoDni" required placeholder="DNI Sucesor" style="padding: 6px; font-size:0.85rem; margin-bottom:5px;">
                                        <input type="text" name="llaveOtp" required placeholder="SABI-XXXX-XXXX" style="padding: 6px; font-size:0.85rem; font-family: monospace;">
                                        <button type="submit" class="btn-danger" style="padding: 6px 12px; font-size:0.8rem; width:100%; margin-top:5px;">Forzar con Llave Física</button>
                                    </form>
                                </div>

                            </div>
                        </div>
                    </div>

                    ${!accesoLimitado ? `
                    <script>
                        function conmutarVisibilidadFecha() {
                            const tipo = document.getElementById('select-tipo-traspaso').value;
                            const bloque = document.getElementById('bloque-fecha-hora');
                            const inputFecha = document.getElementById('input-fecha-hora');
                            
                            if (tipo === 'programado') {
                                bloque.style.display = 'block';
                                inputFecha.required = true;
                                const ahora = new Date();
                                ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
                                inputFecha.min = ahora.toISOString().slice(0,16);
                            } else {
                                bloque.style.display = 'none';
                                inputFecha.required = false;
                                inputFecha.value = '';
                            }
                        }

                        function cargarFormularioEdicion(dni, nombre, apellidos, email, cargo, rol) {
                            document.getElementById('titulo-form').innerText = "✏️ Modificar Usuario";
                            document.getElementById('desc-form').innerText = "Editando el perfil seleccionado de la base de datos.";
                            document.getElementById('btn-submit-form').innerText = "Actualizar Registro";
                            document.getElementById('form-usuarios').action = "/superadmin/usuarios/editar";
                            
                            document.getElementById('input-dni').value = dni;
                            document.getElementById('input-dni').readOnly = true; 
                            document.getElementById('input-dni').style.opacity = "0.5";
                            
                            document.getElementById('input-nombre').value = nombre;
                            document.getElementById('input-apellidos').value = apellidos;
                            document.getElementById('input-email').value = email;
                            document.getElementById('input-cargo').value = cargo;
                            document.getElementById('input-rol').value = (rol === 'superadmin') ? 'admin' : rol;
                            
                            document.getElementById('bloque-password').style.display = "none";
                            document.getElementById('input-password').required = false;
                            document.getElementById('btn-cancelar-form').style.display = "block";
                            
                            document.getElementById('contenedor-formulario').scrollIntoView({ behavior: 'smooth' });
                        }

                        function restablecerFormularioOriginal() {
                            document.getElementById('titulo-form').innerText = "➕ Registrar Nuevo Usuario";
                            document.getElementById('desc-form').innerText = "Inserta un nuevo miembro en la base de datos.";
                            document.getElementById('btn-submit-form').innerText = "Guardar en Base de Datos";
                            document.getElementById('form-usuarios').action = "/superadmin/usuarios/crear";
                            
                            document.getElementById('input-dni').value = "";
                            document.getElementById('input-dni').readOnly = false;
                            document.getElementById('input-dni').style.opacity = "1";
                            
                            document.getElementById('input-nombre').value = "";
                            document.getElementById('input-apellidos').value = "";
                            document.getElementById('input-email').value = "";
                            document.getElementById('input-cargo').value = "";
                            document.getElementById('input-rol').value = "usuario";
                            
                            document.getElementById('bloque-password').style.display = "block";
                            document.getElementById('input-password').value = "";
                            document.getElementById('input-password').required = true;
                            document.getElementById('btn-cancelar-form').style.display = "none";
                        }
                    </script>
                    ` : ''}
                </body>
                </html>
                `);
            });
        });
    });
});

// =====================================================================
// 3. ACCIÓN: CREAR NUEVO USUARIO (POST)
// =====================================================================
router.post('/usuarios/crear', verificarSuperadmin, (req, res) => {
    const currentAdminDni = req.superuser.dni;
    const { dni, nombre, apellidos, email, cargo, password, rol } = req.body;

    if (rol === 'superadmin') {
        return res.send(`<script>alert("🛑 Operación ilegal."); window.history.back();</script>`);
    }

    if (!dni || !nombre || !password) {
        return res.send(`<script>alert("❌ Faltan campos."); window.history.back();</script>`);
    }

    const query = `INSERT INTO usuarios (dni, nombre, apellidos, email, cargo, password, rol) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.run(query, [dni.trim().toUpperCase(), nombre.trim(), apellidos.trim(), email.trim(), cargo.trim(), password, rol], function (err) {
        if (err) {
            return res.send(`<script>alert("❌ El DNI o correo ya existe."); window.history.back();</script>`);
        }

        db.run("INSERT INTO auditoria (usuario_dni, accion, detalles) VALUES (?, 'CREAR USUARIO', ?)",
            [currentAdminDni, `Se registró al usuario ${nombre} ${apellidos} con DNI ${dni}.`]);

        res.send(`<script>alert("✅ Usuario creado con éxito."); window.location.href = "/superadmin/dashboard";</script>`);
    });
});

// =====================================================================
// 4. ACCIÓN: EDITAR USUARIO EXISTENTE (POST)
// =====================================================================
router.post('/usuarios/editar', verificarSuperadmin, (req, res) => {
    const currentAdminDni = req.superuser.dni;
    const { dni, nombre, apellidos, email, cargo, rol } = req.body;

    if (rol === 'superadmin') {
        return res.send(`<script>alert("🛑 Operación no permitida."); window.history.back();</script>`);
    }

    const query = `UPDATE usuarios SET nombre = ?, apellidos = ?, email = ?, cargo = ?, rol = ? WHERE dni = ?`;

    db.run(query, [nombre.trim(), apellidos.trim(), email.trim(), cargo.trim(), rol, dni], function (err) {
        if (err) {
            return res.send(`<script>alert("❌ Error al actualizar."); window.history.back();</script>`);
        }

        db.run("INSERT INTO auditoria (usuario_dni, accion, detalles) VALUES (?, 'MODIFICAR USUARIO', ?)",
            [currentAdminDni, `Modificado DNI ${dni} a rol ${rol}.`]);

        res.send(`<script>alert("✅ Registro actualizado."); window.location.href = "/superadmin/dashboard";</script>`);
    });
});

// =====================================================================
// 5. ACCIÓN: ELIMINAR USUARIO DE LA BASE DE DATOS (POST)
// =====================================================================
router.post('/usuarios/eliminar', verificarSuperadmin, (req, res) => {
    const currentAdminDni = req.superuser.dni;
    const { dniEliminar } = req.body;

    if (currentAdminDni === dniEliminar) {
        return res.send(`<script>alert("🛑 No puedes eliminar tu propio usuario."); window.history.back();</script>`);
    }

    db.run("DELETE FROM usuarios WHERE dni = ?", [dniEliminar], function (err) {
        if (err) {
            return res.send(`<script>alert("❌ Error al eliminar."); window.history.back();</script>`);
        }

        db.run("INSERT INTO auditoria (usuario_dni, accion, detalles) VALUES (?, 'ELIMINAR USUARIO', ?)",
            [currentAdminDni, `Se eliminó al usuario con DNI ${dniEliminar}.`]);

        res.send(`<script>alert("🗑️ Usuario eliminado."); window.location.href = "/superadmin/dashboard";</script>`);
    });
});

// =====================================================================
// 6. ACCIÓN: TRASPASO VOLUNTARIO (INMEDIATO O PROGRAMADO)
// =====================================================================
router.post('/traspaso-voluntario', verificarSuperadmin, (req, res) => {
    const currentAdminDni = req.superuser.dni;
    const { nuevoDni, tipoTraspaso, fechaHoraEfecto, rolDestinoAntiguo } = req.body;
    const dniSucesor = nuevoDni ? nuevoDni.trim().toUpperCase() : null;

    if (!dniSucesor) {
        return res.send(`<script>alert("❌ Selecciona un sucesor válido."); window.history.back();</script>`);
    }

    db.get("SELECT nombre, apellidos FROM usuarios WHERE dni = ?", [dniSucesor], (err, usuarioDestino) => {
        if (err || !usuarioDestino) {
            return res.send(`<script>alert("❌ El sucesor no existe."); window.history.back();</script>`);
        }

        if (currentAdminDni === dniSucesor) {
            return res.send(`<script>alert("🛑 Operación redundante."); window.history.back();</script>`);
        }

        if (tipoTraspaso === 'inmediato') {
            db.serialize(() => {
                db.run("UPDATE usuarios SET rol = ? WHERE dni = ?", [rolDestinoAntiguo, currentAdminDni]);
                db.run("UPDATE usuarios SET rol = 'superadmin' WHERE dni = ?", [dniSucesor]);

                db.run("INSERT INTO auditoria (usuario_dni, accion, detalles) VALUES (?, 'TRASPASO DIRECTO', ?)",
                    [currentAdminDni, `Cede poderes a ${usuarioDestino.nombre} ${usuarioDestino.apellidos}.`]);

                req.session.usuario.rol = rolDestinoAntiguo;

                res.send(`
                    <script>
                        alert("👑 Traspaso completado. Tu nuevo rol: ${rolDestinoAntiguo.toUpperCase()}.");
                        window.location.href = "/logout"; 
                    </script>
                `);
            });
        }
        else if (tipoTraspaso === 'programado') {
            if (!fechaHoraEfecto) {
                return res.send(`<script>alert("❌ Indica una fecha y hora."); window.history.back();</script>`);
            }

            const queryInsert = `INSERT INTO cambios_superadmin_programados (dni_nuevo, dni_antiguo, rol_destino_antiguo, fecha_ejecucion) VALUES (?, ?, ?, ?)`;

            db.run(queryInsert, [dniSucesor, currentAdminDni, rolDestinoAntiguo, fechaHoraEfecto], function (errInsert) {
                if (errInsert) {
                    return res.send(`<script>alert("❌ Error al agendar el traspaso."); window.history.back();</script>`);
                }

                db.run("INSERT INTO auditoria (usuario_dni, accion, detalles) VALUES (?, 'TRASPASO PROGRAMADO', ?)",
                    [currentAdminDni, `Agenda cambio de superadmin para el ${fechaHoraEfecto.replace('T', ' ')}.`]);

                res.send(`<script>alert("📅 Traspaso agendado para el ${fechaHoraEfecto.replace('T', ' ')}."); window.location.href = "/superadmin/dashboard";</script>`);
            });
        }
    });
});

// =====================================================================
// 7. ACCIÓN: REEMPLAZO POR LLAVE MAESTRA OTP (BYPASS CRÍTICO)
// =====================================================================
router.post('/reemplazar', (req, res) => {
    const { nuevoDni, llaveOtp } = req.body;
    const llaveLimpia = llaveOtp.trim().toUpperCase();
    const hashIntroducido = crypto.createHash('sha256').update(llaveLimpia).digest('hex');

    db.get("SELECT * FROM llaves_maestras WHERE hash = ? AND utilizada = 0", [hashIntroducido], (err, llave) => {
        if (err || !llave) {
            return res.send(`<script>alert("🛑 Llave OTP inválida o caducada."); window.history.back();</script>`);
        }

        const dniDestino = nuevoDni.trim().toUpperCase();

        db.get("SELECT * FROM usuarios WHERE dni = ?", [dniDestino], (errUser, usuarioDestino) => {
            if (errUser || !usuarioDestino) {
                return res.send(`<script>alert("❌ El sucesor no existe en el sistema."); window.history.back();</script>`);
            }

            db.serialize(() => {
                db.run("UPDATE usuarios SET rol = 'admin' WHERE rol = 'superadmin'");
                db.run("UPDATE usuarios SET rol = 'superadmin' WHERE dni = ?", [dniDestino]);
                db.run("UPDATE llaves_maestras SET utilizada = 1 WHERE id = ?", [llave.id]);
                db.run("INSERT INTO auditoria (usuario_dni, accion, detalles) VALUES (?, 'BYPASS OTP CRÍTICO', ?)",
                    [dniDestino, `Reemplazo de infraestructura por hardware físico OTP.`]);

                res.send(`
                    <script>
                        alert("🔒 BÚNKER RESTABLECIDO: Control global asignado al DNI ${dniDestino}. Inicie sesión de nuevo.");
                        window.location.href = "/logout";
                    </script>
                `);
            });
        });
    });
});

module.exports = router;