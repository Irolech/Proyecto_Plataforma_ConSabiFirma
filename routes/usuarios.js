const express = require('express');
const router = express.Router();
const db = require('../database');
const path = require('path');
const multer = require('multer');

// CONFIGURACIÓN DE MULTER (Para la foto de perfil)
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'uploads/'); },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({ storage: storage });

/**
 * 🛡️ HELPER: Valida si es el turno exacto de firma para el usuario actual
 */
function esMiTurno(doc, userDni) {
    if (!doc) return false;

    const listaFirmantes = doc.firmantes ? doc.firmantes.split(',').map(s => s.trim()).filter(Boolean) : [];
    const listaFirmados = doc.firmados_por ? doc.firmados_por.split(',').map(s => s.trim()).filter(Boolean) : [];

    if (!listaFirmantes.includes(userDni) || listaFirmados.includes(userDni)) {
        return false;
    }

    if (doc.estado && doc.estado !== 'pendiente') {
        return false;
    }

    if (!doc.tipo_flujo || doc.tipo_flujo === 'indistinto') {
        return true;
    }

    if (doc.tipo_flujo === 'secuencial') {
        const turnoActivoDni = listaFirmantes.find(dni => !listaFirmados.includes(dni));
        return turnoActivoDni === userDni;
    }

    return false;
}

// RUTA: Panel de Usuario (GET)
router.get('/', (req, res) => {

    if (!req.session || !req.session.usuario) {
        return res.redirect('/');
    }

    const userDni = req.session.usuario.dni;
    const accesoLimitado = req.session.autenticado_via_cert === false;

    db.get("SELECT nombre, apellidos, rol, cargo, dni, email, foto_url, notif_email FROM usuarios WHERE dni = ?", [userDni], (err, user) => {
        if (err || !user) return res.status(403).send("Acceso denegado o error de sesión interna");

        const sqlPendientes = `
            SELECT d.*, u.nombre AS creador_nombre, u.apellidos AS creador_apellidos 
            FROM documentos d 
            LEFT JOIN usuarios u ON d.creador_dni = u.dni 
            WHERE d.firmantes LIKE ? 
            ORDER BY d.id DESC
        `;

        db.all(sqlPendientes, [`%${userDni}%`], (errPend, docsPendientesBrutos) => {
            if (errPend) {
                console.error("Error al buscar documentos pendientes:", errPend);
                return res.status(500).send("Error interno al cargar los documentos pendientes");
            }

            const pendientes = (docsPendientesBrutos || []).filter(d => esMiTurno(d, userDni));

            const numPendientes = pendientes.length;
            const badgePendientes = numPendientes > 0 
                ? `<span style="background: #e74c3c; color: white; border-radius: 12px; padding: 2px 8px; font-size: 0.75rem; font-weight: bold; margin-left: auto;">${numPendientes}</span>` 
                : '';

            const sqlFirmados = `
                SELECT d.*, a.fecha AS fecha_firma, u.nombre AS creador_nombre, u.apellidos AS creador_apellidos 
                FROM auditoria a
                JOIN documentos d ON a.documento_id = d.id
                LEFT JOIN usuarios u ON d.creador_dni = u.dni
                WHERE a.usuario_dni = ? AND a.accion = 'FIRMA REALIZADA'
                ORDER BY a.fecha DESC
            `;

            db.all(sqlFirmados, [userDni], (errFirm, docsFirmados) => {
                if (errFirm) {
                    console.error("Error al buscar historial de firmas:", errFirm);
                    return res.status(500).send("Error interno al cargar el historial");
                }

                const finalizados = docsFirmados || [];

                let botonAdmin = '';
                let botonEmergencia = '';

                if (user.rol === 'admin' || user.rol === 'superadmin') {
                    botonAdmin = `<a href="/admin" class="nav-link">📤 Panel de envío</a>`;
                }

                if ((user.rol === 'admin' || user.rol === 'superadmin') && !accesoLimitado) {
                    botonEmergencia = `
                        <a href="/superadmin/bunker" class="nav-link" style="color: #ff7675; border: 1px dashed rgba(255,118,117,0.3); margin-top: 15px; border-radius: 6px;">
                            🚨 Código de Emergencia
                        </a>`;
                }

                const primerApellido = user.apellidos ? user.apellidos.split(' ')[0] : '';
                const fotoPerfil = (user.foto_url && user.foto_url !== '/img/default-avatar.png') 
                    ? user.foto_url 
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nombre)}+${encodeURIComponent(primerApellido)}&background=6c5ce7&color=fff&bold=true`;

                res.send(`
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Consabfirma - Mi Panel</title>
                    <link rel="stylesheet" href="/css/style.css">
                    <style>
                        .sidebar { display: flex; flex-direction: column; height: 100vh; position: fixed; }
                        .user-profile { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 30px; border: 1px solid rgba(108, 92, 231, 0.2); }
                        .role-badge { color: var(--primary); font-size: 0.7rem; font-weight: bold; text-transform: uppercase; }
                        .nav-menu { flex-grow: 1; }
                        .logout-area { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; margin-top: auto; padding-bottom: 20px; }
                        
                        .overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 998; }
                        .modal-profile, .modal-users { display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 999; width: 90%; }
                        .modal-profile { max-width: 550px; }
                        .modal-users { max-width: 700px; }

                        .search-container { display: flex; gap: 10px; margin-bottom: 20px; }
                        .search-input { flex: 1; padding: 10px; border: 1px solid var(--border); border-radius: 6px; }
                        .history-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #eee; }
                        
                        .multifirma-panel { 
                            background: #f8fafc; 
                            border: 1px solid #e2e8f0; 
                            padding: 10px 15px; 
                            border-radius: 8px; 
                            margin-bottom: 20px; 
                            display: flex; 
                            justify-content: space-between; 
                            align-items: center; 
                            width: 100%; 
                            box-sizing: border-box;
                        }
                        
                        .btn-firmar-lote { 
                            background: #10b981; 
                            color: white; 
                            border: none; 
                            padding: 0 16px !important; 
                            height: 36px; 
                            border-radius: 4px; 
                            font-size: 0.85rem !important; 
                            font-weight: bold; 
                            cursor: pointer; 
                            transition: background 0.2s; 
                            display: inline-flex; 
                            align-items: center; 
                            justify-content: center;
                            gap: 8px; 
                            width: fit-content !important; 
                            max-width: 250px;
                            flex-shrink: 0;
                            white-space: nowrap;
                            box-sizing: border-box;
                        }
                        .btn-firmar-lote:hover { background: #059669; }
                        .btn-firmar-lote:disabled { background: #94a3b8; cursor: not-allowed; }
                        
                        table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 9pt; }
                        th, td { padding: 12px; border-bottom: 1px solid var(--border); text-align: left; }
                        
                        .alerta-lectura { background: #fef08a; color: #854d0e; padding: 15px; border-radius: 6px; margin-bottom: 25px; border-left: 5px solid #eab308; display: flex; align-items: center; gap: 10px; font-size: 0.95rem; }
                        
                        /* 🎨 MODAL DE FIRMA MODERNO Y MINIMALISTA */
                        #firmaOverlay { 
                            display: none; 
                            position: fixed; 
                            top: 0; left: 0; 
                            width: 100%; height: 100%; 
                            background: rgba(15, 23, 42, 0.75); 
                            backdrop-filter: blur(8px);
                            -webkit-backdrop-filter: blur(8px);
                            z-index: 9999; 
                            color: white; 
                            justify-content: center; 
                            align-items: center; 
                        }
                        .firma-card {
                            background: #1e293b;
                            border: 1px solid rgba(255, 255, 255, 0.1);
                            border-radius: 16px;
                            padding: 40px;
                            max-width: 440px;
                            width: 90%;
                            text-align: center;
                            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
                        }
                        .spinner-container {
                            position: relative;
                            width: 84px;
                            height: 84px;
                            margin: 0 auto 20px auto;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }
                        .spinner-ring {
                            position: absolute;
                            width: 100%;
                            height: 100%;
                            border: 3px solid rgba(56, 189, 248, 0.15);
                            border-top-color: #38bdf8;
                            border-radius: 50%;
                            animation: spinRing 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
                        }
                        .hourglass-anim {
                            font-size: 2.8rem;
                            display: inline-block;
                            animation: flipSand 2.4s infinite ease-in-out;
                        }
                        @keyframes spinRing {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                        @keyframes flipSand {
                            0% { transform: rotate(0deg) scale(1); }
                            40% { transform: rotate(180deg) scale(1.15); }
                            50% { transform: rotate(180deg) scale(1.15); }
                            90% { transform: rotate(360deg) scale(1); }
                            100% { transform: rotate(360deg) scale(1); }
                        }
                        .progress-bar-bg {
                            width: 100%;
                            background: #334155;
                            height: 8px;
                            border-radius: 9999px;
                            margin-top: 25px;
                            overflow: hidden;
                        }
                        .progress-bar-fill {
                            width: 0%;
                            background: linear-gradient(90deg, #38bdf8, #10b981);
                            height: 100%;
                            transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                            border-radius: 9999px;
                        }
                        .firma-subnote {
                            font-size: 0.8rem;
                            color: #94a3b8;
                            margin-top: 18px;
                            line-height: 1.4;
                            background: rgba(255, 255, 255, 0.03);
                            padding: 10px;
                            border-radius: 6px;
                            border: 1px solid rgba(255, 255, 255, 0.05);
                        }
                    </style>
                    <script src="/socket.io/socket.io.js"></script>
                    <script src="/js/autoscript.js"></script>
                </head>
                <body>
                    <div class="overlay" id="overlay" onclick="cerrarTodosLosModales()"></div>

                    <!-- 🚀 PANTALLA DE PROCESO DE FIRMA RENOVADA -->
                    <div id="firmaOverlay">
                        <div class="firma-card">
                            <div class="spinner-container">
                                <div class="spinner-ring"></div>
                                <div class="hourglass-anim">⏳</div>
                            </div>
                            
                            <h3 style="margin: 0; color: #f8fafc; font-size: 1.3rem;">Procesando firma digital</h3>
                            <p id="firmaStatus" style="font-size: 0.95rem; color: #38bdf8; margin-top: 8px; margin-bottom: 0;">Iniciando AutoFirma...</p>
                            
                            <div class="progress-bar-bg">
                                <div id="firmaProgress" class="progress-bar-fill"></div>
                            </div>
                            
                            <div class="firma-subnote">
                                💡 Por favor, mantén esta ventana abierta y responde a <strong>AutoFirma</strong> si solicita la selección de tu certificado o PIN.
                            </div>
                        </div>
                    </div>

                    <div class="modal-profile" id="modalPerfil">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h2 style="margin: 0; color: var(--text-dark);">Mi Perfil</h2>
                            <span onclick="cerrarPerfil()" style="cursor: pointer; font-size: 1.5rem;">&times;</span>
                        </div>
                        <div style="display: flex; gap: 20px; align-items: start; border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 20px;">
                            <div style="text-align: center;">
                                <img src="${fotoPerfil}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary);">
                                ${!accesoLimitado ? `
                                <form action="/perfil/update-avatar" method="POST" enctype="multipart/form-data" style="margin-top: 10px;">
                                    <input type="hidden" name="dni" value="${user.dni}">
                                    <label for="file-upload" class="btn btn-outline" style="font-size: 0.7rem; padding: 5px 10px; cursor: pointer;">Cambiar foto</label>
                                    <input id="file-upload" name="avatar" type="file" style="display:none" onchange="this.form.submit()">
                                </form>
                                ` : ''}
                            </div>
                            <div style="flex: 1;">
                                <div style="margin-bottom: 10px;">
                                    <label style="font-size: 0.7rem; color: var(--text-muted); display: block;">Nombre Completo</label>
                                    <span style="font-weight: bold; color: var(--text-dark);">${user.nombre} ${user.apellidos}</span>
                                </div>
                                <div style="margin-bottom: 10px;">
                                    <label style="font-size: 0.7rem; color: var(--text-muted); display: block;">DNI y Cargo</label>
                                    <span style="font-family: monospace;">${user.dni}</span> | <span>${user.cargo || 'Usuario'}</span>
                                </div>
                                <div>
                                    <label style="font-size: 0.7rem; color: var(--text-muted); display: block;">Correo Electrónico</label>
                                    <span>${user.email}</span>
                                </div>
                            </div>
                        </div>
                        
                        ${!accesoLimitado ? `
                        <form action="/perfil/update-settings" method="POST">
                            <input type="hidden" name="dni" value="${user.dni}">
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
                                    <input type="checkbox" name="notif_email" id="perf-notif" value="1" ${user.notif_email === 1 ? 'checked' : ''}> 
                                    Avisarme por email de firmas pendientes
                                </label>
                            </div>
                            <button type="submit" class="btn btn-primary" style="width: 100%; border:none;">Guardar Cambios</button>
                        </form>
                        ` : `
                        <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; color: #64748b; font-size: 0.85rem;">
                            🔒 La modificación de contraseña y preferencias está deshabilitada en el modo de solo lectura. Accede con certificado digital para realizar cambios.
                        </div>
                        `}
                    </div>

                    <div class="modal-users" id="modalHistorial">
                        <h3>🔍 Buscador de Historial Personal</h3>
                        <div class="search-container">
                            <input type="text" id="filterNombre" class="search-input" placeholder="Nombre del documento..." onkeyup="filtrarHistorial()">
                            <input type="date" id="filterFecha" class="search-input" onchange="filtrarHistorial()">
                        </div>
                        <div id="listaHistorialCompleta" style="max-height: 400px; overflow-y: auto; background: #f8fafc; border-radius: 8px;">
                            ${finalizados.map(d => {
                    const fechaMostrar = d.fecha_firma ? new Date(d.fecha_firma).toLocaleDateString('es-ES') : 'Fecha desconocida';
                    const estaFinalizado = d.estado === 'finalizado';
                    const displayBtn = estaFinalizado
                        ? `<button onclick="revisarPDF('/uploads/copia_autentica_${d.id}.pdf')" class="btn btn-outline" style="font-size: 0.7rem; cursor:pointer;">Copia Auténtica</button>`
                        : `<span style="font-size: 0.7rem; color: #d97706; background: #fef3c7; padding: 3px 6px; border-radius: 4px;">Pendiente terceros</span>`;

                    return `
                                <div class="history-item" data-nombre="${d.nombre.toLowerCase()}" data-fecha="${d.fecha_firma || ''}">
                                    <div><div style="font-weight: bold;">${d.nombre}</div><div style="font-size: 0.75rem; color: var(--text-muted);">Firmado el: ${fechaMostrar}</div></div>
                                    ${displayBtn}
                                </div>
                                `;
                }).join('')}
                        </div>
                        <button class="btn btn-primary" style="width: 100%; margin-top: 20px;" onclick="cerrarTodosLosModales()">Cerrar</button>
                    </div>

                    <div class="sidebar">
                        <div class="brand">Consabfirma</div>
                        <div class="user-profile">
                            <span class="role-badge">👤 Usuario Firmante</span>
                            <div style="font-weight: bold; margin-top:5px; color: white;">${user.nombre} ${user.apellidos}</div>
                            <div style="font-size: 0.8rem; opacity: 0.5; color: white; font-family: monospace;">${user.dni}</div>
                        </div>

                        <nav class="nav-menu">
                            <a href="/usuario" class="nav-link active" style="display: flex; align-items: center;">
                                ✍️ Mi panel de firma ${badgePendientes}
                            </a>
                            ${botonAdmin}
                            <a href="#" class="nav-link" onclick="abrirHistorial()">📜 Historial personal</a>
                            ${botonEmergencia} 
                            <div style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
                                <a href="#" class="nav-link" onclick="abrirPerfil()">⚙️ Mi Perfil</a>
                            </div>
                        </nav>

                        <div class="logout-area">
                            <a href="/logout" class="btn-logout" style="text-decoration:none; color:#ff7675; display:flex; align-items:center; justify-content:center; gap:10px; font-weight:bold;">🚪 Cerrar Sesión</a>
                        </div>
                    </div>

                    <div class="main-content">
                        <header style="margin-bottom: 30px;">
                            <h1>Mi panel de firma</h1>
                            <p style="color: var(--text-muted);">Gestiona tus documentos pendientes y revisa tus firmas realizadas.</p>
                        </header>

                        ${accesoLimitado ? `
                            <div class="alerta-lectura">
                                <span style="font-size: 1.5rem;">⚠️</span>
                                <div>
                                    <strong>MODO DE SOLO CONSULTA ACTIVO</strong><br>
                                    Has accedido mediante contraseña. Puedes revisar el contenido de los documentos pendientes, pero para <strong>firmarlos digitalmente</strong> debes cerrar sesión y acceder utilizando tu certificado.
                                </div>
                            </div>
                        ` : ''}

                        <div class="card" style="margin-bottom: 30px;">
                            <h3 class="section-title">✍️ Documentos a firmar</h3>
                            
                            ${!accesoLimitado && pendientes.length > 0 ? `
                            <div class="multifirma-panel">
                                <div>
                                    <label style="cursor:pointer; font-weight:bold; color: #475569; display:flex; align-items:center; gap:8px;">
                                        <input type="checkbox" id="checkTodos" autocomplete="off" onchange="toggleSeleccionTodos()" style="transform: scale(1.2);"> 
                                        Seleccionar todos los documentos
                                    </label>
                                </div>
                                <button id="btnFirmarLote" class="btn-firmar-lote" onclick="iniciarMultifirma()" disabled>
                                    🖊️ Firmar Seleccionados (<span id="contadorSeleccion">0</span>)
                                </button>
                            </div>
                            ` : ''}

                            <div style="overflow-x: auto;">
                                <table>
                                    <thead>
                                        <tr style="text-align: left; border-bottom: 2px solid var(--border);">
                                            ${!accesoLimitado ? `<th style="width: 40px;"></th>` : ''}
                                            <th>Documento / Referencia</th>
                                            <th style="text-align: right;">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${pendientes.length === 0 ? `<tr><td colspan="${accesoLimitado ? '2' : '3'}" style="padding:30px; text-align:center; color:var(--text-muted);">Sin tareas pendientes</td></tr>` :
                        pendientes.map(d => `
                                            <tr>
                                                ${!accesoLimitado ? `
                                                <td>
                                                    <input type="checkbox" class="check-doc" autocomplete="off" value="${d.id}" onchange="actualizarContador()" style="transform: scale(1.2); cursor:pointer;">
                                                </td>
                                                ` : ''}
                                                <td>
                                                    <strong>${d.nombre}</strong>
                                                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
                                                        Enviado por: <strong>${d.creador_apellidos || 'Administración'} ${d.creador_nombre || ''}</strong> el ${new Date(d.fecha_creacion).toLocaleDateString('es-ES')}
                                                    </div>
                                                </td>
                                                <td style="text-align: right;">
                                                    <button onclick="revisarPDF('/uploads/${path.basename(d.archivo_original)}')" class="btn btn-outline" style="font-size:0.8rem; border-color: #cbd5e1; color: #475569; cursor:pointer;">👁️ Revisar PDF</button>
                                                </td>
                                            </tr>`).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div class="card" style="background: #fcfdfd; padding: 0; overflow: hidden;">
                            <h3 class="section-title" style="padding: 20px 20px 10px 20px; margin: 0;">✅ Firmas recientes</h3>
                            
                            <div style="max-height: 320px; overflow-y: auto; overflow-x: auto;">
                                <table style="margin: 0;">
                                    <thead style="position: sticky; top: 0; background: #fcfdfd; z-index: 10; box-shadow: 0 2px 2px -1px rgba(0,0,0,0.1);">
                                        <tr style="text-align: left; border-bottom: 1px solid var(--border); color: var(--text-muted);">
                                            <th style="font-weight: normal; padding-left: 20px;">Documento</th>
                                            <th style="text-align: right; font-weight: normal; padding-right: 20px;">Descarga</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${finalizados.slice(0, 15).map(d => {
                            const fechaMostrar = d.fecha_firma ? new Date(d.fecha_firma).toLocaleDateString('es-ES') : 'Fecha desconocida';
                            const estaFinalizado = d.estado === 'finalizado';
                            const badgeFaltan = !estaFinalizado ? '<span style="background:#fef3c7; color:#d97706; padding:3px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; margin-left:8px;">⏳ Faltan firmas externas</span>' : '';
                            const botonDescarga = estaFinalizado
                                ? `<button onclick="revisarPDF('/uploads/copia_autentica_${d.id}.pdf')" class="btn btn-outline" style="font-size:0.75rem; cursor:pointer; border-color:#10b981; color:#10b981;">📄 Copia Auténtica</button>`
                                : `<span style="font-size:0.75rem; color:var(--text-muted);">Bloqueado temporalmente</span>`;

                            return `
                                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                                <td style="padding-left: 20px;">
                                                    <div style="font-weight:bold;">${d.nombre}</div>
                                                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
                                                        ✓ Firmado el ${fechaMostrar} ${badgeFaltan}
                                                    </div>
                                                </td>
                                                <td style="text-align: right; padding-right: 20px;">
                                                    ${botonDescarga}
                                                </td>
                                            </tr>
                                            `;
                        }).join('')}
                                        ${finalizados.length === 0 ? '<tr><td colspan="2" style="padding:20px; text-align:center; color:var(--text-muted);">Sin historial reciente</td></tr>' : ''}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <script>
                        window.addEventListener('pageshow', function() {
                            const checks = document.querySelectorAll('.check-doc');
                            if (checks) checks.forEach(chk => chk.checked = false);
                            const checkTodos = document.getElementById('checkTodos');
                            if (checkTodos) checkTodos.checked = false;
                            actualizarContador();
                        });

                        function abrirPerfil() { document.getElementById('modalPerfil').style.display = 'block'; document.getElementById('overlay').style.display = 'block'; }
                        function cerrarPerfil() { document.getElementById('modalPerfil').style.display = 'none'; document.getElementById('overlay').style.display = 'none'; }
                        function abrirHistorial() { document.getElementById('modalHistorial').style.display = 'block'; document.getElementById('overlay').style.display = 'block'; }
                        function cerrarTodosLosModales() { document.getElementById('modalPerfil').style.display = 'none'; document.getElementById('modalHistorial').style.display = 'none'; document.getElementById('overlay').style.display = 'none'; }
                        
                        function filtrarHistorial() {
                            const nombreBusqueda = document.getElementById('filterNombre').value.toLowerCase();
                            const fechaBusqueda = document.getElementById('filterFecha').value;
                            document.querySelectorAll('.history-item').forEach(item => {
                                const coincideNombre = item.getAttribute('data-nombre').includes(nombreBusqueda);
                                const coincideFecha = !fechaBusqueda || item.getAttribute('data-fecha').startsWith(fechaBusqueda);
                                item.style.display = (coincideNombre && coincideFecha) ? 'flex' : 'none';
                            });
                        }

                        async function revisarPDF(url) {
                            try {
                                const response = await fetch(url);
                                const blob = await response.blob();
                                const blobUrl = URL.createObjectURL(blob);
                                window.open(blobUrl, '_blank');
                                setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
                            } catch (error) {
                                console.error("Error al abrir el PDF:", error);
                                alert("Hubo un problema al cargar el documento.");
                            }
                        }

                        // ========================================================
                        // 🚀 MOTOR DE FIRMA MASIVA EN LOTE (BATCH SIGNING)
                        // ========================================================
                        const userDniJS = "${userDni}";

                        const socket = io();

                        socket.on('connect', () => {
                            socket.emit('join_room', 'sala_' + userDniJS);
                            socket.emit('unirse_a_panel', { dni: userDniJS });
                        });

                        socket.on('actualizar_paneles', () => {
                            console.log("⚡ Evento de actualización recibido. Recargando panel para reflejar cambios...");
                            window.location.reload(); 
                        });

                        function toggleSeleccionTodos() {
                            const estado = document.getElementById('checkTodos').checked;
                            document.querySelectorAll('.check-doc').forEach(chk => chk.checked = estado);
                            actualizarContador();
                        }

                        function actualizarContador() {
                            const checkboxes = document.querySelectorAll('.check-doc');
                            const seleccionados = document.querySelectorAll('.check-doc:checked').length;
                            
                            document.getElementById('contadorSeleccion').innerText = seleccionados;
                            document.getElementById('btnFirmarLote').disabled = seleccionados === 0;

                            const checkTodos = document.getElementById('checkTodos');
                            if (checkTodos && checkboxes.length > 0) {
                                checkTodos.checked = (seleccionados === checkboxes.length);
                            }
                        }

                        async function iniciarMultifirma() {
                            const checkboxes = document.querySelectorAll('.check-doc:checked');
                            const idsAFirmar = Array.from(checkboxes).map(chk => parseInt(chk.value, 10)).filter(Boolean);

                            if (idsAFirmar.length === 0) return;

                            const overlay = document.getElementById('firmaOverlay');
                            const statusText = document.getElementById('firmaStatus');
                            const progressBar = document.getElementById('firmaProgress');

                            // 1. Configurar UI de carga
                            overlay.style.display = 'flex';
                            statusText.style.color = "#38bdf8";
                            statusText.innerText = \`Preparando lote de \${idsAFirmar.length} documento(s)...\`;
                            progressBar.style.background = "linear-gradient(90deg, #38bdf8, #10b981)";
                            progressBar.style.width = "15%";

                            // 2. ⚠️ INICIALIZAR AUTOFIRMA 
                            try {
                                AutoScript.cargarAppAfirma();
                            } catch(e) {
                                console.error("ERROR: No se detecta AutoFirma en el equipo.", e);
                                alert("Por favor, instala AutoFirma o asegúrate de que se está ejecutando en tu equipo.");
                                abortarProceso("AutoFirma no detectado.");
                                return;
                            }

                            try {
                                // 3. Solicitar al backend el XML estructurado para la firma en lote
                                const respPrep = await fetch('/api/firmas/preparar-lote', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ ids: idsAFirmar, dni: userDniJS })
                                });

                                const dataPrep = await respPrep.json();

                                if (!dataPrep.success || !dataPrep.xmlBatchBase64) {
                                    throw new Error(dataPrep.error || "No se pudo generar el lote de documentos en el servidor.");
                                }

                                statusText.innerText = \`Invocando AutoFirma para \${dataPrep.totalDocs || idsAFirmar.length} documento(s)...\`;
                                progressBar.style.width = "50%";

                                // 4. Invocar AutoFirma en modo 'batch' enviando el XML Base64 del lote
                                // CAMBIO: "batch" en estricta minúscula, como requiere la API de AutoFirma.
                                AutoScript.sign(
                                    dataPrep.xmlBatchBase64,
                                    "SHA256withRSA",
                                    "batch",
                                    "",
                                    async function (xmlResultBase64) {
                                        statusText.innerText = "Firma completada. Guardando evidencias en el servidor...";
                                        progressBar.style.width = "85%";

                                        try {
                                            // 5. Enviar la respuesta XML con todos los PDFs firmados al backend
                                            const respRecibir = await fetch(\`/api/firmas/recibir-lote?dni=\${encodeURIComponent(userDniJS)}\`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    xmlResultBase64: xmlResultBase64,
                                                    dni: userDniJS
                                                })
                                            });

                                            const dataRecibir = await respRecibir.json();

                                            if (dataRecibir.success) {
                                                progressBar.style.width = "100%";
                                                statusText.innerText = "¡Proceso de firma por lote completado!";
                                                setTimeout(() => window.location.reload(), 1200);
                                            } else {
                                                throw new Error(dataRecibir.error || "Error al procesar los resultados en el servidor.");
                                            }
                                        } catch (errRecibir) {
                                            console.error("❌ Error enviando resultado del lote:", errRecibir);
                                            abortarProceso(errRecibir.message);
                                        }
                                    },
                                    function (errorType, errorMessage) {
                                        console.error("❌ Error de AutoFirma en lote:", errorType, errorMessage);
                                        abortarProceso(errorMessage || "Proceso de firma cancelado o fallido en AutoFirma.");
                                    }
                                );

                            } catch (err) {
                                console.error("❌ Error iniciando la multifirma:", err);
                                abortarProceso(err.message);
                            }
                        }

                        function abortarProceso(mensaje) {
                            const statusText = document.getElementById('firmaStatus');
                            const progressBar = document.getElementById('firmaProgress');

                            statusText.innerText = mensaje ? \`Error: \${mensaje}\` : "Proceso Interrumpido";
                            statusText.style.color = "#f87171";
                            progressBar.style.background = "#f87171";

                            setTimeout(() => {
                                if (confirm("El proceso de firma no pudo completarse. ¿Deseas recargar la página?")) {
                                    window.location.reload();
                                } else {
                                    document.getElementById('firmaOverlay').style.display = 'none';
                                    statusText.style.color = "#38bdf8";
                                    progressBar.style.background = "linear-gradient(90deg, #38bdf8, #10b981)";
                                    progressBar.style.width = "0%";
                                }
                            }, 1000);
                        }
                    </script>
                </body>
                </html>
                `);
            });
        });
    });
});

module.exports = router;