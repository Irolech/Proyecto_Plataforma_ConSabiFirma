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
// MIDDLEWARE: CONTROL DE ACCESO ESTRICTO "BÚNKER" VÍA SESIÓN
// =====================================================================
const verificarSuperadmin = (req, res, next) => {
    if (!req.session || !req.session.usuario) {
        return res.status(403).send("⚠️ Acceso denegado: No hay una sesión activa en el sistema.");
    }

    const adminDni = req.session.usuario.dni;

    // Verificación de doble factor implícita: Comprobar en tiempo real que el rol sigue activo en BD
    db.get("SELECT * FROM usuarios WHERE dni = ? AND rol = 'superadmin'", [adminDni], (err, superuser) => {
        if (err || !superuser) {
            return res.status(403).send("⚠️ Acceso denegado: No tienes credenciales de Superadministrador global.");
        }
        // Adjuntamos los datos verificados del superadmin al objeto de la petición
        req.superuser = superuser;
        next();
    });
};

// =====================================================================
// 1. VISTA: DASHBOARD PRINCIPAL DEL SUPERADMIN (GET) -> ¡URL LIMPIA!
// =====================================================================
router.get('/dashboard', verificarSuperadmin, (req, res) => {
    const superuser = req.superuser; // Extraído de forma segura por nuestro middleware

    // Recuperamos todos los usuarios, estadísticas de documentos y logs de auditoría
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
                        body { background-color: var(--super-bg); color: #f8fafc; font-family: sans-serif; }
                        .card-super { background: var(--super-card); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 25px; margin-bottom: 25px; }
                        .btn-danger { background: var(--super-accent); color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; }
                        .btn-danger:hover { background: #dc2626; }
                        .btn-primary { background: var(--super-blue); color: #0f172a; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; }
                        .btn-primary:hover { background: #0ea5e9; color: white; }
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                        th, td { padding: 12px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); }
                        th { color: var(--super-blue); font-size: 0.85rem; text-transform: uppercase; }
                        .badge-super { background: rgba(239, 68, 68, 0.2); color: var(--super-accent); padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; }
                        .badge-admin { background: rgba(56, 189, 248, 0.2); color: var(--super-blue); padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; }
                        .badge-usuario { background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; }
                        .action-btn { background: none; border: none; cursor: pointer; font-size: 1.1rem; margin-right: 5px; }
                        .grid-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 30px; }
                        input, select { width: 100%; padding: 10px; background: #0f172a; color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; box-sizing: border-box; margin-top: 5px; }
                        label { display: block; font-size: 0.85rem; color: #cbd5e1; margin-top: 12px; }
                    </style>
                </head>
                <body>
                    <div style="padding: 40px; max-width: 1300px; margin: 0 auto;">
                        
                        <header style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 40px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px; gap: 20px;">
                            <div>
                                <h1 style="color: var(--super-accent); margin: 0;">🔒 Búnker de Gestión Global</h1>
                                <p style="color: #94a3b8; margin: 5px 0 0 0;">Control absoluto de base de datos e infraestructura de firmas.</p>
                            </div>
                            <div style="margin-left: auto; display: flex; gap: 10px;">
                                <a href="/admin/dashboard" class="btn btn-outline" style="color: #f8fafc; border-color: rgba(255,255,255,0.3); text-decoration: none; padding: 10px 20px; border: 1px solid; border-radius: 6px; display: inline-block; white-space: nowrap;">Ir a la aplicación de firma</a>
                                <a href="/logout" class="btn-danger" style="text-decoration: none; padding: 10px 20px; border-radius: 6px; display: inline-block; white-space: nowrap;">Cerrar Sesión</a>
                            </div>
                        </header>

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
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${todosLosUsuarios.map(u => `
                                                <tr>
                                                    <td style="font-family: monospace;">${u.dni}</td>
                                                    <td><strong>${u.apellidos}, ${u.nombre}</strong></td>
                                                    <td style="font-size:0.9rem; color:#94a3b8;">${u.email}<br><small>${u.cargo}</small></td>
                                                    <td>
                                                        ${u.rol === 'superadmin' ? '<span class="badge-super">SUPERADMIN</span>' : u.rol === 'admin' ? '<span class="badge-admin">ADMIN</span>' : '<span class="badge-usuario">USUARIO</span>'}
                                                    </td>
                                                    <td>
                                                        <button class="action-btn" title="Modificar Usuario" onclick="cargarFormularioEdicion('${u.dni}', '${u.nombre}', '${u.apellidos}', '${u.email}', '${u.cargo}', '${u.rol}')">✏️</button>
                                                        
                                                        <form action="/superadmin/usuarios/eliminar" method="POST" style="display:inline;">
                                                            <input type="hidden" name="dniEliminar" value="${u.dni}">
                                                            <button type="submit" class="action-btn" title="Eliminar Usuario" onclick="return confirm('⚠️ ¿Estás completamente seguro de eliminar a este usuario de la base de datos?')">❌</button>
                                                        </form>
                                                    </td>
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
                                        <input type="text" name="cargo" id="input-cargo" placeholder="Ej: Profesor de Piano" required>

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
                                        
                                        <button type="submit" class="btn-primary" style="width: 100%; margin-top:20px;" onclick="return confirm('⚠️ ¿Confirmas que deseas agendar o ejecutar este traspaso de administración?')">
                                            CONFIRMAR TRASPASO
                                        </button>
                                    </form>
                                </div>

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
                </body>
                </html>
                `);
            });
        });
    });
});

// =====================================================================
// 2. ACCIÓN: CREAR NUEVO USUARIO (POST)
// =====================================================================
router.post('/usuarios/crear', verificarSuperadmin, (req, res) => {
    const currentAdminDni = req.superuser.dni; // Tomado de forma segura desde la sesión verificada
    const { dni, nombre, apellidos, email, cargo, password, rol } = req.body;

    if (rol === 'superadmin') {
        return res.send(`<script>alert("🛑 Operación ilegal detectada: No se pueden crear superadministradores por esta vía."); window.history.back();</script>`);
    }

    if (!dni || !nombre || !password) {
        return res.send(`<script>alert("❌ Faltan campos requeridos."); window.history.back();</script>`);
    }

    const query = `INSERT INTO usuarios (dni, nombre, apellidos, email, cargo, password, rol) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.run(query, [dni.trim().toUpperCase(), nombre.trim(), apellidos.trim(), email.trim(), cargo.trim(), password, rol], function (err) {
        if (err) {
            return res.send(`<script>alert("❌ Error: El DNI o correo ya se encuentra registrado."); window.history.back();</script>`);
        }

        db.run("INSERT INTO auditoria (usuario_dni, accion, detalles) VALUES (?, 'CREAR USUARIO', ?)",
            [currentAdminDni, `Se registró al usuario ${nombre} ${apellidos} con DNI ${dni} y rol ${rol}.`]);

        res.send(`<script>alert("✅ Usuario creado con éxito en el sistema."); window.location.href = "/superadmin/dashboard";</script>`);
    });
});

// =====================================================================
// 3. ACCIÓN: EDITAR USUARIO EXISTENTE (POST)
// =====================================================================
router.post('/usuarios/editar', verificarSuperadmin, (req, res) => {
    const currentAdminDni = req.superuser.dni;
    const { dni, nombre, apellidos, email, cargo, rol } = req.body;

    if (rol === 'superadmin') {
        return res.send(`<script>alert("🛑 Operación ilegal detectada: No se puede asignar el rango de superadministrador."); window.history.back();</script>`);
    }

    const query = `UPDATE usuarios SET nombre = ?, apellidos = ?, email = ?, cargo = ?, rol = ? WHERE dni = ?`;

    db.run(query, [nombre.trim(), apellidos.trim(), email.trim(), cargo.trim(), rol, dni], function (err) {
        if (err) {
            return res.send(`<script>alert("❌ Error al actualizar el registro."); window.history.back();</script>`);
        }

        db.run("INSERT INTO auditoria (usuario_dni, accion, detalles) VALUES (?, 'MODIFICAR USUARIO', ?)",
            [currentAdminDni, `Se modificaron los datos del DNI ${dni}. Nuevo rol asignado: ${rol}.`]);

        res.send(`<script>alert("✅ Registro actualizado correctamente."); window.location.href = "/superadmin/dashboard";</script>`);
    });
});

// =====================================================================
// 4. ACCIÓN: ELIMINAR USUARIO DE LA BASE DE DATOS (POST)
// =====================================================================
router.post('/usuarios/eliminar', verificarSuperadmin, (req, res) => {
    const currentAdminDni = req.superuser.dni;
    const { dniEliminar } = req.body;

    if (currentAdminDni === dniEliminar) {
        return res.send(`<script>alert("🛑 OPERACIÓN RECHAZADA: No puedes eliminar tu propio usuario mientras estés en activo."); window.history.back();</script>`);
    }

    db.run("DELETE FROM usuarios WHERE dni = ?", [dniEliminar], function (err) {
        if (err) {
            return res.send(`<script>alert("❌ Error al intentar eliminar el registro."); window.history.back();</script>`);
        }

        db.run("INSERT INTO auditoria (usuario_dni, accion, detalles) VALUES (?, 'ELIMINAR USUARIO', ?)",
            [currentAdminDni, `Se eliminó por completo al usuario con DNI ${dniEliminar} del sistema.`]);

        res.send(`<script>alert("🗑️ Usuario eliminado de forma definitiva."); window.location.href = "/superadmin/dashboard";</script>`);
    });
});

// =====================================================================
// 5. ACCIÓN: TRASPASO VOLUNTARIO (INMEDIATO O PROGRAMADO)
// =====================================================================
router.post('/traspaso-voluntario', verificarSuperadmin, (req, res) => {
    const currentAdminDni = req.superuser.dni;
    const { nuevoDni, tipoTraspaso, fechaHoraEfecto, rolDestinoAntiguo } = req.body;
    const dniSucesor = nuevoDni ? nuevoDni.trim().toUpperCase() : null;

    if (!dniSucesor) {
        return res.send(`<script>alert("❌ Debes seleccionar un sucesor válido de la lista."); window.history.back();</script>`);
    }

    db.get("SELECT nombre, apellidos FROM usuarios WHERE dni = ?", [dniSucesor], (err, usuarioDestino) => {
        if (err || !usuarioDestino) {
            return res.send(`<script>alert("❌ El DNI del sucesor no existe en la base de datos."); window.history.back();</script>`);
        }

        if (currentAdminDni === dniSucesor) {
            return res.send(`<script>alert("🛑 Operación redundante: No puedes traspasarte los poderes a ti mismo."); window.history.back();</script>`);
        }

        // --- CASO A: INMEDIATO ---
        if (tipoTraspaso === 'inmediato') {
            db.serialize(() => {
                db.run("UPDATE usuarios SET rol = ? WHERE dni = ?", [rolDestinoAntiguo, currentAdminDni]);
                db.run("UPDATE usuarios SET rol = 'superadmin' WHERE dni = ?", [dniSucesor]);

                db.run("INSERT INTO auditoria (usuario_dni, accion, detalles) VALUES (?, 'TRASPASO DIRECTO', ?)",
                    [currentAdminDni, `Cede voluntariamente poderes a ${usuarioDestino.nombre} ${usuarioDestino.apellidos}. Tu nuevo rol: ${rolDestinoAntiguo.toUpperCase()}.`]);

                // 🔄 Degradamos el rol en la sesión actual para evitar inconsistencias de acceso inmediatas
                req.session.usuario.rol = rolDestinoAntiguo;

                res.send(`
                    <script>
                        alert("👑 Traspaso completado con éxito. Tus privilegios globales cambian a ${rolDestinoAntiguo.toUpperCase()} ahora mismo.");
                        window.location.href = "/"; 
                    </script>
                `);
            });
        }
        // --- CASO B: PROGRAMADO ---
        else if (tipoTraspaso === 'programado') {
            if (!fechaHoraEfecto) {
                return res.send(`<script>alert("❌ Debes indicar una fecha y hora válidas."); window.history.back();</script>`);
            }

            const queryInsert = `INSERT INTO cambios_superadmin_programados (dni_nuevo, dni_antiguo, rol_destino_antiguo, fecha_ejecucion) VALUES (?, ?, ?, ?)`;

            db.run(queryInsert, [dniSucesor, currentAdminDni, rolDestinoAntiguo, fechaHoraEfecto], function (errInsert) {
                if (errInsert) {
                    return res.send(`<script>alert("❌ Error al agendar el traspaso diferido."); window.history.back();</script>`);
                }

                db.run("INSERT INTO auditoria (usuario_dni, accion, detalles) VALUES (?, 'TRASPASO PROGRAMADO', ?)",
                    [currentAdminDni, `Agenda cambio de superadmin para el ${fechaHoraEfecto.replace('T', ' ')}. Tu rol futuro será: ${rolDestinoAntiguo.toUpperCase()}.`]);

                res.send(`<script>alert("📅 Traspaso agendado para el ${fechaHoraEfecto.replace('T', ' ')}. Hasta entonces seguirás al mando."); window.location.href = "/superadmin/dashboard";</script>`);
            });
        }
    });
});

// =====================================================================
// 6. ACCIÓN: REEMPLAZO POR LLAVE MAESTRA OTP (COMPLETADO COMO BYPASS)
// =====================================================================
// Nota: Esta ruta NO lleva el middleware verificarSuperadmin porque está 
// diseñada para usarse en una emergencia externa si el superadmin pierde acceso.
router.post('/reemplazar', (req, res) => {
    const { nuevoDni, llaveOtp } = req.body;
    const llaveLimpia = llaveOtp.trim().toUpperCase();
    const hashIntroducido = crypto.createHash('sha256').update(llaveLimpia).digest('hex');

    db.get("SELECT * FROM llaves_maestras WHERE hash = ? AND utilizada = 0", [hashIntroducido], (err, llave) => {
        if (err || !llave) {
            return res.send(`<script>alert("🛑 Llave OTP inválida, caducada o ya utilizada."); window.history.back();</script>`);
        }

        const dniDestino = nuevoDni.trim().toUpperCase();

        // Verificar que el sucesor exista
        db.get("SELECT * FROM usuarios WHERE dni = ?", [dniDestino], (errUser, usuarioDestino) => {
            if (errUser || !usuarioDestino) {
                return res.send(`<script>alert("❌ El DNI del sucesor no existe en el sistema."); window.history.back();</script>`);
            }

            db.serialize(() => {
                // 1. Degradamos a cualquier superadmin previo a rango admin
                db.run("UPDATE usuarios SET rol = 'admin' WHERE rol = 'superadmin'");
                // 2. Coronamos al nuevo superadmin de emergencia
                db.run("UPDATE usuarios SET rol = 'superadmin' WHERE dni = ?", [dniDestino]);
                // 3. Quemamos la llave para que no se pueda reutilizar
                db.run("UPDATE llaves_maestras SET utilizada = 1 WHERE id = ?", [llave.id]);
                // 4. Registramos el bypass físico en auditoría
                db.run("INSERT INTO auditoria (usuario_dni, accion, detalles) VALUES (?, 'BYPASS OTP CRÍTICO', ?)",
                    [dniDestino, `Reemplazo de infraestructura ejecutado por hardware físico OTP. Asume el rol de Superadmin.`]);

                res.send(`
                    <script>
                        alert("🔒 BÚNKER PROGRAMÁTICO RESTABLECIDO: Se han revocado los poderes anteriores y asignado el control global al DNI ${dniDestino}. Inicie sesión de nuevo.");
                        window.location.href = "/logout";
                    </script>
                `);
            });
        });
    });
});

module.exports = router;