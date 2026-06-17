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

// RUTA: Panel de Usuario (GET - Protegido por Sesión Segura)
router.get('/', (req, res) => {

    if (!req.session || !req.session.usuario) {
        return res.redirect('/login');
    }

    const userDni = req.session.usuario.dni;
    const accesoLimitado = req.session.autenticado_via_cert === false;

    db.get("SELECT nombre, apellidos, rol, cargo, dni, email, foto_url, notif_email FROM usuarios WHERE dni = ?", [userDni], (err, user) => {
        if (err || !user) return res.status(403).send("Acceso denegado o error de sesión interna");

        // 🚀 CONSULTA 1: Documentos Pendientes (con datos del creador)
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

            // Filtramos solo los que realmente faltan por firmar por este usuario
            const pendientes = (docsPendientesBrutos || []).filter(d => !d.firmados_por || !d.firmados_por.includes(userDni));

            // Lógica para el badge del menú lateral
            const numPendientes = pendientes.length;
            const badgePendientes = numPendientes > 0
                ? `<span style="background: #e74c3c; color: white; border-radius: 12px; padding: 2px 8px; font-size: 0.75rem; font-weight: bold; margin-left: auto;">${numPendientes}</span>`
                : '';

            // 🚀 CONSULTA 2: Firmas Recientes (Cruzando con Auditoría para obtener la FECHA REAL DE FIRMA)
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
                        <a href="/admin/bunker" class="nav-link" style="color: #ff7675; border: 1px dashed rgba(255,118,117,0.3); margin-top: 15px; border-radius: 6px;">
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
                        
                        /* 🎨 ESTILOS BLINDADOS: Panel alineado y botón restringido */
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
                            height: 36px; /* Altura fija para evitar que se infle */
                            border-radius: 4px; 
                            font-size: 0.85rem !important; 
                            font-weight: bold; 
                            cursor: pointer; 
                            transition: background 0.2s; 
                            display: inline-flex; 
                            align-items: center; 
                            justify-content: center;
                            gap: 8px; 
                            width: fit-content !important; /* Estricto al tamaño del contenido */
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
                        
                        #firmaOverlay { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.95); z-index:9999; color:white; flex-direction:column; justify-content:center; align-items:center; }
                    </style>
                    <script src="/js/autoscript.js"></script>
                </head>
                <body>
                    <div class="overlay" id="overlay" onclick="cerrarTodosLosModales()"></div>

                    <div id="firmaOverlay">
                        <div style="font-size: 4rem; animation: pulse 1.5s infinite;">⏳</div>
                        <h2 style="margin-top: 20px; color: #38bdf8;">Proceso de Firma Múltiple Activo</h2>
                        <p id="firmaStatus" style="font-size: 1.1rem; color: #cbd5e1;">Preparando el cliente AutoFirma...</p>
                        
                        <div style="width: 400px; background: #334155; height: 12px; border-radius: 6px; margin-top: 20px; overflow: hidden;">
                            <div id="firmaProgress" style="width: 0%; background: #10b981; height: 100%; transition: width 0.3s ease;"></div>
                        </div>
                        
                        <div id="firmaConsola" style="margin-top: 25px; font-family: monospace; font-size: 0.85rem; color: #4ade80; max-width: 600px; width: 100%; background: #000; padding: 15px; border-radius: 6px; height: 120px; overflow-y: auto;">
                            > Iniciando protocolo...
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
                        // 🚀 MOTOR DE MULTIFIRMA EN CLIENTE
                        // ========================================================
                        const userDniJS = "${userDni}";

                        function toggleSeleccionTodos() {
                            const estado = document.getElementById('checkTodos').checked;
                            document.querySelectorAll('.check-doc').forEach(chk => chk.checked = estado);
                            actualizarContador();
                        }

                        function actualizarContador() {
                            const checkboxes = document.querySelectorAll('.check-doc');
                            const seleccionados = document.querySelectorAll('.check-doc:checked').length;
                            
                            // Actualizar contadores y botón
                            document.getElementById('contadorSeleccion').innerText = seleccionados;
                            document.getElementById('btnFirmarLote').disabled = seleccionados === 0;

                            // Actualizar dinámicamente el estado del "check todos"
                            const checkTodos = document.getElementById('checkTodos');
                            if (checkTodos && checkboxes.length > 0) {
                                checkTodos.checked = (seleccionados === checkboxes.length);
                            }
                        }

                        function logConsola(msg, color = "#4ade80") {
                            const c = document.getElementById('firmaConsola');
                            c.innerHTML += \`<br><span style="color:\${color}">> \${msg}</span>\`;
                            c.scrollTop = c.scrollHeight;
                        }

                        async function iniciarMultifirma() {
                            const checkboxes = document.querySelectorAll('.check-doc:checked');
                            const idsAFirmar = Array.from(checkboxes).map(chk => chk.value);
                            
                            if (idsAFirmar.length === 0) return;

                            document.getElementById('firmaOverlay').style.display = 'flex';
                            logConsola("Iniciando lote de " + idsAFirmar.length + " documentos...");
                            
                            try {
                                AutoScript.cargarAppAfirma();
                            } catch(e) {
                                logConsola("ERROR: No se detecta AutoFirma en el equipo.", "#f87171");
                                alert("Por favor, instala AutoFirma o asegúrate de que se está ejecutando.");
                                document.getElementById('firmaOverlay').style.display = 'none';
                                return;
                            }

                            await procesarSiguiente(0, idsAFirmar);
                        }

                        async function procesarSiguiente(index, arrayIds) {
                            if (index >= arrayIds.length) {
                                document.getElementById('firmaProgress').style.width = "100%";
                                document.getElementById('firmaStatus').innerText = "¡Proceso Completado!";
                                logConsola("Lote finalizado con éxito. Recargando panel...", "#38bdf8");
                                setTimeout(() => window.location.reload(), 2000);
                                return;
                            }

                            const docId = arrayIds[index];
                            const numeroDoc = index + 1;
                            const total = arrayIds.length;
                            
                            document.getElementById('firmaStatus').innerText = \`Firmando documento \${numeroDoc} de \${total}...\`;
                            document.getElementById('firmaProgress').style.width = \`\${(index / total) * 100}%\`;
                            logConsola(\`\\n--- Procesando EXP-#\${docId} ---\`, "#fef08a");

                            try {
                                logConsola("Descargando PDF en memoria...");
                                const resDoc = await fetch(\`/api/firmas/obtener-documento?id=\${docId}\`);
                                const dataDoc = await resDoc.json();
                                
                                if (!dataDoc.success) throw new Error("Fallo de red al descargar documento");

                                logConsola("Llamando al cliente AutoFirma (esperando PIN)...", "#fca5a5");
                                const parametrosExtra = "signatureProfile=PAdES-B-LTV\\\\ntsType=RFC3161\\\\ntsaURL=https://freetsa.org/tsr";

                                AutoScript.sign(
                                    dataDoc.base64,
                                    "SHA256withRSA",
                                    "PAdES",
                                    parametrosExtra,
                                    async function (firmaBase64) {
                                        logConsola("Documento sellado correctamente. Subiendo al servidor...");
                                        
                                        const resUpload = await fetch(\`/api/firmas/recibir?documentoId=\${docId}&dni=\${userDniJS}\`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ archivoBase64: firmaBase64 })
                                        });
                                        
                                        const dataUpload = await resUpload.json();

                                        if (dataUpload.success) {
                                            logConsola("Guardado en Base de Datos confirmado.");
                                            procesarSiguiente(index + 1, arrayIds);
                                        } else {
                                            logConsola("ERROR del Servidor: " + dataUpload.error, "#f87171");
                                            abortarProceso();
                                        }
                                    },
                                    function (errorType, errorMessage) {
                                        logConsola(\`Firma CANCELADA o FALLIDA: \${errorType}\`, "#f87171");
                                        abortarProceso();
                                    }
                                );

                            } catch(err) {
                                logConsola(\`ERROR CRÍTICO: \${err.message}\`, "#f87171");
                                abortarProceso();
                            }
                        }

                        function abortarProceso() {
                            document.getElementById('firmaStatus').innerText = "Proceso Interrumpido";
                            document.getElementById('firmaStatus').style.color = "#f87171";
                            document.getElementById('firmaProgress').style.background = "#f87171";
                            setTimeout(() => {
                                if(confirm("El proceso de multifirma se interrumpió. ¿Quieres recargar la página para ver los que sí se firmaron?")) {
                                    window.location.reload();
                                } else {
                                    document.getElementById('firmaOverlay').style.display = 'none';
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