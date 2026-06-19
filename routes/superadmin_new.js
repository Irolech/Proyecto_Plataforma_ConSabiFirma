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
// 1. RUTA CRÍTICA: BYPASS DE EMERGENCIA (HARDWARE OTP / LLAVE MAESTRA)
// =====================================================================
router.post('/bypass-emergencia', (req, res) => {
    const { tokenMaster, dniDestino } = req.body;

    if (!tokenMaster || !dniDestino) {
        return res.send(`<script>alert("❌ Parámetros incompletos para el bypass de emergencia."); window.history.back();</script>`);
    }

    db.get("SELECT * FROM llaves_maestras WHERE token = ? AND utilizada = 0", [tokenMaster.trim()], (errLlave, llave) => {
        if (errLlave || !llave) {
            return res.send(`<script>alert("❌ Llave maestra inválida, expirada o ya utilizada."); window.history.back();</script>`);
        }

        db.get("SELECT dni FROM usuarios WHERE dni = ?", [dniDestino.trim()], (errUser, usuarioDestino) => {
            if (errUser || !usuarioDestino) {
                return res.send(`<script>alert("❌ El DNI del sucesor no existe en el censo del centro."); window.history.back();</script>`);
            }

            db.serialize(() => {
                db.run("UPDATE usuarios SET rol = 'admin' WHERE rol = 'superadmin'");
                db.run("UPDATE usuarios SET rol = 'superadmin' WHERE dni = ?", [dniDestino.trim()]);
                db.run("UPDATE llaves_maestras SET utilizada = 1 WHERE id = ?", [llave.id]);

                db.run("INSERT INTO auditoria (usuario_dni, accion, detalles) VALUES (?, 'BYPASS OTP CRÍTICO', ?)",
                    [dniDestino.trim(), `Reemplazo de infraestructura ejecutado por hardware físico OTP. Asume el rol de Superadmin.`],
                    function (errAudit) {
                        res.send(`
                            <script>
                                alert("🔒 BÚNKER PROGRAMÁTICO RESTABLECIDO: Se han revocado los poderes anteriores y asignado el control global al DNI ${dniDestino}. Inicie sesión de nuevo.");
                                window.location.href = "/logout";
                            </script>
                        `);
                    }
                );
            });
        });
    });
});

// =====================================================================
// MIDDLEWARE: CONTROL DE ACCESO ESTRICTO "BÚNKER" VÍA SESIÓN
// =====================================================================
const verificarSuperadmin = (req, res, next) => {
    if (!req.session || !req.session.usuario) {
        return res.status(403).send("⚠️ Acceso denegado: Sesión no válida o expirada.");
    }
    if (req.session.usuario.rol !== 'superadmin') {
        return res.status(403).send("⚠️ Acceso restringido: Se requieren privilegios de Superadmin.");
    }
    next();
};

router.use(verificarSuperadmin);

// =====================================================================
// 2. VISTA PRINCIPAL DEL PANEL DE CONTROL GLOBAL (BÚNKER) -> ¡REPARADA!
// =====================================================================
router.get('/', (req, res) => {
    const modoConsulta = req.session.autenticado_via_cert === false;
    const user = req.session.usuario;

    db.all("SELECT nombre, apellidos, dni, cargo, rol FROM usuarios ORDER BY apellidos ASC", [], (errUsers, usuarios) => {
        if (errUsers) return res.status(500).send("Error interno al cargar el censo de usuarios.");

        db.all("SELECT * FROM cambios_superadmin_programados ORDER BY fecha_ejecucion ASC", [], (errCambios, cronograma) => {
            if (errCambios) return res.status(500).send("Error interno al obtener el cronograma de traspasos.");

            const listaUsuarios = usuarios || [];
            const listaCronograma = cronograma || [];

            // Devolución directa de HTML dinámico inyectado por el servidor (Estilo Consabfirma)
            res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Consabfirma - Búnker Superadmin</title>
                <link rel="stylesheet" href="/css/style.css">
                <style>
                    .sidebar { display: flex; flex-direction: column; height: 100vh; position: fixed; }
                    .user-profile { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #ff7675; }
                    .role-badge { color: #ff7675; font-size: 0.7rem; font-weight: bold; text-transform: uppercase; }
                    .nav-menu { flex-grow: 1; }
                    .logout-area { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; margin-top: auto; padding-bottom: 20px; }
                    
                    table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 9pt; margin-bottom: 20px; }
                    th, td { padding: 12px; border-bottom: 1px solid var(--border); text-align: left; }
                    th { background: #f8fafc; font-weight: bold; color: #475569; }
                    
                    .alerta-bunker { background: #f0fdf4; color: #166534; padding: 15px; border-radius: 6px; margin-bottom: 25px; border-left: 5px solid #22c55e; font-size: 0.95rem; }
                    .alerta-lectura { background: #fef08a; color: #854d0e; padding: 15px; border-radius: 6px; margin-bottom: 25px; border-left: 5px solid #eab308; font-size: 0.95rem; }
                    
                    .grid-bunker { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                    .panel-bunker { background: #f8fafc; border: 1px solid #e2e8f0; padding: 25px; border-radius: 8px; box-sizing: border-box; }
                    .form-group { margin-bottom: 15px; }
                    .form-group label { display: block; font-size: 0.8rem; font-weight: bold; color: #475569; margin-bottom: 5px; }
                    .select-field, .input-field { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 0.9rem; }
                    
                    .btn-danger { background: #ef4444; color: white; border: none; padding: 12px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: background 0.2s; }
                    .btn-danger:hover { background: #dc2626; }
                    .btn-danger:disabled { background: #cbd5e1; cursor: not-allowed; }
                    
                    .btn-secondary { background: #4f46e5; color: white; border: none; padding: 12px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: background 0.2s; }
                    .btn-secondary:hover { background: #4338ca; }
                    .btn-secondary:disabled { background: #cbd5e1; cursor: not-allowed; }
                </style>
            </head>
            <body>
                <div class="sidebar">
                    <div class="brand">Consabfirma</div>
                    <div class="user-profile">
                        <span class="role-badge">⚡ BÚNKER SUPERADMIN</span>
                        <div style="font-weight: bold; margin-top:5px; color: white;">${user.nombre} ${user.apellidos}</div>
                        <div style="font-size: 0.8rem; opacity: 0.5; color: white; font-family: monospace;">${user.dni}</div>
                    </div>

                    <nav class="nav-menu">
                        <a href="/usuario" class="nav-link">✍️ Mi panel de firma</a>
                        <a href="/admin" class="nav-link">📤 Panel de envío</a>
                        <a href="/superadmin" class="nav-link active">🔒 Búnker de Control</a>
                    </nav>

                    <div class="logout-area">
                        <a href="/logout" class="btn-logout" style="text-decoration:none; color:#ff7675; display:flex; align-items:center; justify-content:center; gap:10px; font-weight:bold;">🚪 Cerrar Sesión</a>
                    </div>
                </div>

                <div class="main-content">
                    <header style="margin-bottom: 30px;">
                        <h1>🔒 Búnker de Control Global</h1>
                        <p style="color: var(--text-muted);">Gestión de infraestructura crítica, privilegios absolutos y traspaso diferido de poderes.</p>
                    </header>

                    ${modoConsulta ? `
                        <div class="alerta-lectura">
                            <strong>⚠️ MODO DE SOLO CONSULTA ACTIVO</strong><br>
                            Has accedido mediante contraseña ordinaria. Puedes auditar el censo del centro y revisar planificaciones pendientes, pero para realizar traspasos estructurales de poder o cancelaciones debes acceder obligatoriamente con tu certificado digital (mTLS).
                        </div>
                    ` : `
                        <div class="alerta-bunker">
                            <strong>🔒 ENTORNO DE CONFIANZA FUERTE ACTIVO</strong><br>
                            Autenticación criptográfica mTLS verificada con éxito. Tienes acceso completo para modificar los roles estructurales y privilegios de la plataforma.
                        </div>
                    `}

                    <div class="grid-bunker">
                        <div class="panel-bunker">
                            <h3 style="margin-top:0; color: #1e293b; display:flex; align-items:center; gap:8px;">📅 Programar Traspaso Diferido</h3>
                            <p style="font-size:0.8rem; color:#64748b; margin-bottom:20px;">Agenda de forma automatizada un cambio de liderazgo en el sistema para una fecha y hora futura concretas.</p>
                            
                            <form action="/superadmin/programar-cambio" method="POST">
                                <div class="form-group">
                                    <label>Sucesor Designado</label>
                                    <select name="dni_nuevo" class="select-field" required ${modoConsulta ? 'disabled' : ''}>
                                        <option value="">-- Seleccionar usuario del censo --</option>
                                        ${listaUsuarios.filter(u => u.dni !== user.dni).map(u => `
                                            <option value="${u.dni}">${u.apellidos}, ${u.nombre} (${u.dni}) - [${u.rol}]</option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Fecha y Hora de Ejecución</label>
                                    <input type="datetime-local" name="fecha_ejecucion" class="input-field" required ${modoConsulta ? 'disabled' : ''}>
                                </div>
                                <div class="form-group">
                                    <label>Mi Rol tras la salida</label>
                                    <select name="rol_destino_antiguo" class="select-field" ${modoConsulta ? 'disabled' : ''}>
                                        <option value="admin">Administrador (Gestión ordinaria)</option>
                                        <option value="usuario" selected>Usuario Firmante (Solo firma)</option>
                                    </select>
                                </div>
                                <button type="submit" class="btn-secondary" style="width:100%; margin-top:5px;" ${modoConsulta ? 'disabled' : ''}>Planificar Traspaso Diferido</button>
                            </form>
                        </div>

                        <div class="panel-bunker" style="border-color: #fee2e2; background: #fffafb;">
                            <h3 style="margin-top:0; color: #991b1b; display:flex; align-items:center; gap:8px;">⚡ Traspaso Inmediato en Caliente</h3>
                            <p style="font-size:0.8rem; color:#64748b; margin-bottom:20px;">Transfiere la gobernanza absoluta del centro ahora mismo. **Tu sesión de superadmin se cerrará de forma automática**.</p>
                            
                            <form action="/superadmin/ejecutar-inmediato" method="POST" onsubmit="return confirm('⚠️ ALERTA CRÍTICA: ¿Estás totalmente seguro de delegar de inmediato tus poderes globales de Superadmin? Perderás el acceso de control en este preciso instante.');">
                                <div class="form-group">
                                    <label>Nuevo Superadmin Absoluto</label>
                                    <select name="dni_nuevo" class="select-field" required ${modoConsulta ? 'disabled' : ''}>
                                        <option value="">-- Seleccionar sucesor --</option>
                                        ${listaUsuarios.filter(u => u.dni !== user.dni).map(u => `
                                            <option value="${u.dni}">${u.apellidos}, ${u.nombre} (${u.dni})</option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Mi Rol de salida inmediato</label>
                                    <select name="rol_destino_antiguo" class="select-field" ${modoConsulta ? 'disabled' : ''}>
                                        <option value="admin" selected>Administrador</option>
                                        <option value="usuario">Usuario Firmante</option>
                                    </select>
                                </div>
                                <button type="submit" class="btn-danger" style="width:100%; margin-top:5px;" ${modoConsulta ? 'disabled' : ''}>Ejecutar Relevo Inmediato</button>
                            </form>
                        </div>
                    </div>

                    <div class="card" style="margin-bottom:30px;">
                        <h3 class="section-title">🕒 Cronograma de Traspasos Programados</h3>
                        <div style="overflow-x: auto;">
                            <table>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Sucesor Designado</th>
                                        <th>Superadmin Saliente</th>
                                        <th>Rol Salida</th>
                                        <th>Fecha Programada</th>
                                        <th>Estado</th>
                                        <th style="text-align: right;">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${listaCronograma.length === 0 ? `
                                        <tr><td colspan="7" style="padding:25px; text-align:center; color:#64748b;">No constan traspasos programados activos en el calendario del servidor.</td></tr>
                                    ` : listaCronograma.map(c => {
                const badgeEstado = c.ejecutado === 1
                    ? '<span style="background:#d1fae5; color:#065f46; padding:3px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold;">Ejecutado</span>'
                    : '<span style="background:#eff6ff; color:#1e40af; padding:3px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold;">Pendiente</span>';

                const formCancelar = (c.ejecutado === 0 && !modoConsulta)
                    ? `<form action="/superadmin/cancelar-cambio" method="POST" style="margin:0;">
                                                   <input type="hidden" name="id_cambio" value="${c.id}">
                                                   <button type="submit" class="btn-danger" style="font-size:0.7rem; padding:4px 10px; border-radius:4px;">Revocar</button>
                                               </form>`
                    : `<button class="btn-danger" style="font-size:0.7rem; padding:4px 10px; border-radius:4px;" disabled>Bloqueado</button>`;

                return `
                                            <tr>
                                                <td><strong>#${c.id}</strong></td>
                                                <td><span style="font-family:monospace; font-weight:bold;">${c.dni_nuevo}</span></td>
                                                <td><span style="font-family:monospace;">${c.dni_antiguo}</span></td>
                                                <td><span style="text-transform:uppercase; font-size:0.75rem; color:#64748b;">${c.rol_destino_antiguo || 'usuario'}</span></td>
                                                <td><code>${c.fecha_ejecucion.replace('T', ' ')}</code></td>
                                                <td>${badgeEstado}</td>
                                                <td style="text-align: right;">${formCancelar}</td>
                                            </tr>
                                        `;
            }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="card">
                        <h3 class="section-title">👥 Censo Completo de Usuarios Autorizados</h3>
                        <div style="overflow-x: auto;">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Apellidos y Nombre</th>
                                        <th>DNI / Identificador</th>
                                        <th>Cargo asignado</th>
                                        <th>Nivel de Privilegios (Rol)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${listaUsuarios.map(u => `
                                        <tr style="${u.dni === user.dni ? 'background: #f0fdf4; font-weight:bold;' : ''}">
                                            <td>${u.apellidos}, ${u.nombre} ${u.dni === user.dni ? ' <span style="color:#166534;">(Tú)</span>' : ''}</td>
                                            <td style="font-family:monospace;">${u.dni}</td>
                                            <td>${u.cargo || 'Personal del Centro'}</td>
                                            <td>
                                                <span style="padding:4px 10px; border-radius:12px; font-size:0.7rem; font-weight:bold; 
                                                    ${u.rol === 'superadmin' ? 'background:#fee2e2; color:#991b1b;' : u.rol === 'admin' ? 'background:#fef3c7; color:#92400e;' : 'background:#f1f5f9; color:#334155;'}">
                                                    ${u.rol.toUpperCase()}
                                                </span>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            `);
        });
    });
});

// =====================================================================
// 3. PROGRAMAR TRASPASO DE PODERES DIFERIDO
// =====================================================================
router.post('/programar-cambio', (req, res) => {
    if (req.session.autenticado_via_cert === false) {
        return res.status(403).send("🔒 Operación denegada: El modo consulta restringe la modificación de roles críticos del centro.");
    }

    const { dni_nuevo, fecha_ejecucion, rol_destino_antiguo } = req.body;
    const dni_antiguo = req.session.usuario.dni;

    if (!dni_nuevo || !fecha_ejecucion) {
        return res.send(`<script>alert("⚠️ Por favor, rellene todos los campos obligatorios."); window.history.back();</script>`);
    }

    db.get("SELECT dni FROM usuarios WHERE dni = ?", [dni_nuevo.trim()], (err, user) => {
        if (err || !user) {
            return res.send(`<script>alert("❌ El DNI del nuevo administrador no consta en el censo del sistema."); window.history.back();</script>`);
        }

        if (dni_nuevo.trim() === dni_antiguo) {
            return res.send(`<script>alert("⚠️ No puedes programar un traspaso de poderes a ti mismo."); window.history.back();</script>`);
        }

        const query = `
            INSERT INTO cambios_superadmin_programados (dni_nuevo, dni_antiguo, rol_destino_antiguo, fecha_ejecucion, ejecutado)
            VALUES (?, ?, ?, ?, 0)
        `;

        db.run(query, [dni_nuevo.trim(), dni_antiguo, rol_destino_antiguo || 'usuario', fecha_ejecucion], function (errInsert) {
            if (errInsert) {
                console.error("❌ Error al guardar programación de superadmin:", errInsert.message);
                return res.status(500).send("Error interno al registrar la planificación en la Base de Datos.");
            }

            db.run("INSERT INTO auditoria (usuario_dni, accion, detalles) VALUES (?, 'TRASPASO PROGRAMADO', ?)",
                [dni_antiguo, `Traspaso de control global agendado hacia DNI ${dni_nuevo} para la fecha ${fecha_ejecucion}`],
                function () {
                    res.send(`<script>alert('📅 Traspaso diferido agendado correctamente en el sistema.'); window.location.href = '/superadmin';</script>`);
                }
            );
        });
    });
});

// =====================================================================
// 4. CANCELAR PLANIFICACIÓN DE TRASPASO
// =====================================================================
router.post('/cancelar-cambio', (req, res) => {
    if (req.session.autenticado_via_cert === false) {
        return res.status(403).send("🔒 Operación denegada: El modo consulta impide la eliminación de eventos calendarizados.");
    }

    const { id_cambio } = req.body;

    db.run("DELETE FROM cambios_superadmin_programados WHERE id = ? AND ejecutado = 0", [id_cambio], function (err) {
        if (err) {
            console.error("❌ Error al cancelar traspaso programado:", err.message);
            return res.status(500).send("Error al eliminar el registro de planificación.");
        }

        db.run("INSERT INTO auditoria (usuario_dni, accion, detalles) VALUES (?, 'TRASPASO CANCELADO', ?)",
            [req.session.usuario.dni, `Cancelación del cambio programado ID #${id_cambio}`],
            function () {
                res.send(`<script>alert('❌ Traspaso diferido cancelado con éxito.'); window.location.href = '/superadmin';</script>`);
            }
        );
    });
});

// =====================================================================
// 5. EJECUTAR TRASPASO INMEDIATO EN CALIENTE
// =====================================================================
router.post('/ejecutar-inmediato', (req, res) => {
    if (req.session.autenticado_via_cert === false) {
        return res.status(403).send("🔒 Operación denegada: El modo consulta impide la alteración estructural inmediata del búnker.");
    }

    const { dni_nuevo, rol_destino_antiguo } = req.body;
    const dni_antiguo = req.session.usuario.dni;
    const rolDestino = rol_destino_antiguo || 'admin';

    if (!dni_nuevo) {
        return res.send(`<script>alert("⚠️ Debe especificar el DNI del sucesor de administración."); window.history.back();</script>`);
    }

    db.get("SELECT dni FROM usuarios WHERE dni = ?", [dni_nuevo.trim()], (err, user) => {
        if (err || !user) {
            return res.send(`<script>alert("❌ El DNI indicado no pertenece a ningún usuario del centro registrado."); window.history.back();</script>`);
        }

        db.serialize(() => {
            db.run("UPDATE usuarios SET rol = ? WHERE dni = ?", [rolDestino, dni_antiguo]);
            db.run("UPDATE usuarios SET rol = 'superadmin' WHERE dni = ?", [dni_nuevo.trim()]);

            db.run("INSERT INTO auditoria (usuario_dni, accion, detalles) VALUES (?, 'TRASPASO INMEDIATO', ?)",
                [dni_antiguo, `Traspaso en caliente ejecutado por el Superadmin saliente. Nuevo administrador absoluto: ${dni_nuevo}.`],
                function (errAudit) {
                    res.send(`
                        <script>
                            alert("🔒 ROLES DE CONTROL TRASPASADOS: Sus privilegios han sido revocados y transferidos al DNI ${dni_nuevo}. Su sesión se cerrará de forma automática.");
                            window.location.href = "/logout";
                        </script>
                    `);
                }
            );
        });
    });
});

module.exports = router;