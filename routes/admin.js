const express = require('express');
const router = express.Router();
const db = require('../database');
const path = require('path');
const multer = require('multer');

// CONFIGURACIÓN DE MULTER
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'uploads/'); },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos PDF'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// RUTA: Panel de Envío de Documentos (GET)
router.get('/:dni', (req, res) => {
    const adminDni = req.params.dni;

    db.get("SELECT nombre, apellidos, rol, cargo, dni, email, foto_url, notif_email FROM usuarios WHERE dni = ?", [adminDni], (err, user) => {
        if (err || !user) return res.status(403).send("Error de autenticación");

        db.all("SELECT nombre, apellidos, dni, cargo FROM usuarios ORDER BY apellidos ASC, nombre ASC", [], (errUsers, usuariosSistema) => {
            db.all("SELECT * FROM documentos WHERE estado != 'finalizado' ORDER BY id DESC", [], (errPend, docsPendientes) => {
                db.all("SELECT * FROM documentos WHERE estado = 'finalizado' ORDER BY id DESC LIMIT 15", [], (errFin, docsFinalizados) => {

                    let botonesSuper = '';
                    if (user.rol === 'superadmin') {
                        botonesSuper = `<a href="/superadmin/dashboard/${adminDni}" class="nav-link" style="color: var(--super); border: 1px dashed var(--super); margin-bottom: 20px;">⬅️ Gestión Global</a>`;
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
                    <title>Consabfirma - Panel de Administración</title>
                    <link rel="stylesheet" href="/css/style.css">
                    <style>
                        .sidebar { display: flex; flex-direction: column; height: 100vh; position: fixed; }
                        .user-profile { 
                            background: rgba(255,255,255,0.05); padding: 15px; border-radius: var(--radius); 
                            margin-bottom: 30px; border: 1px solid rgba(108, 92, 231, 0.2); 
                        }
                        .role-badge { color: var(--primary); font-size: 0.7rem; font-weight: bold; text-transform: uppercase; }
                        .nav-menu { flex-grow: 1; }
                        .logout-area { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; margin-top: auto; padding-bottom: 20px; }
                        
                        .modal-profile { 
                            display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                            background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                            z-index: 999; width: 90%; max-width: 550px;
                        }

                        .envio-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; }
                        @media (max-width: 768px) { .envio-grid { grid-template-columns: 1fr; } }
                        #seccionEnvioFinal { display: none; margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid var(--border); }
                        .search-box { width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 10px; font-size: 0.85rem; box-sizing: border-box; }
                        .libreta-container { max-height: 180px; overflow-y: auto; background: white; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 10px; }
                        .user-item-click { padding: 10px; border-bottom: 1px solid #f1f5f9; cursor: pointer; font-size: 0.85rem; transition: background 0.2s; display: block; }
                        .user-item-click:hover { background: #e2e8f0; }
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
                                <img src="${fotoPerfil}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary);">
                                <form action="/perfil/update-avatar" method="POST" enctype="multipart/form-data" style="margin-top: 10px;">
                                    <input type="hidden" name="dni" value="${user.dni}">
                                    <label for="file-upload" class="btn btn-outline" style="font-size: 0.7rem; padding: 5px 10px; cursor: pointer;">Cambiar foto</label>
                                    <input id="file-upload" name="avatar" type="file" style="display:none" onchange="this.form.submit()">
                                </form>
                            </div>
                            <div style="flex: 1;">
                                <div style="margin-bottom: 10px;">
                                    <label style="font-size: 0.7rem; color: var(--text-muted); display: block;">Nombre Completo</label>
                                    <span style="font-weight: bold; color: var(--text-dark);">${user.nombre} ${user.apellidos}</span>
                                </div>
                                <div style="margin-bottom: 10px;">
                                    <label style="font-size: 0.7rem; color: var(--text-muted); display: block;">DNI y Cargo</label>
                                    <span style="font-family: monospace;">${user.dni}</span> | <span>${user.cargo || 'Administrador'}</span>
                                </div>
                                <div>
                                    <label style="font-size: 0.7rem; color: var(--text-muted); display: block;">Correo Electrónico</label>
                                    <span>${user.email}</span>
                                </div>
                            </div>
                        </div>
                        <form action="/perfil/update-settings" method="POST">
                            <input type="hidden" name="dni" value="${user.dni}">
                            <h4 style="margin-bottom: 15px; color: var(--text-dark);">Seguridad y Preferencias</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                                <div>
                                    <label style="font-size: 0.8rem; display: block; margin-bottom: 5px;">Pass Actual</label>
                                    <input type="password" name="currentPassword" class="input-field" style="width: 100%;" placeholder="Requerido" required>
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
                    </div>

                    <div class="modal-users" id="modalUsers">
                        <h3 style="margin-top:0">Seleccionar Firmante</h3>
                        <div style="max-height: 350px; overflow-y: auto; margin: 15px 0;" id="contenedorOpcionesUsuarios">
                            ${usuariosSistema.map(u => `
                                <div class="user-option" id="opt-${u.dni}" onclick="selectUser('${u.dni}', '${u.apellidos}, ${u.nombre}', '${u.cargo || 'Miembro'}')">
                                    <div style="font-weight:bold">${u.apellidos}, ${u.nombre}</div>
                                    <div style="font-size:0.75rem; color:var(--text-muted)">${u.dni} | ${u.cargo || ''}</div>
                                </div>
                            `).join('')}
                        </div>
                        <button class="btn btn-outline" style="width:100%;" onclick="closeModal()">Cerrar</button>
                    </div>

                    <div class="modal-users" id="modalEmail" style="max-width: 450px;">
                        <h3 style="margin-top:0">Añadir Destinatario Externo (CC)</h3>
                        <div style="margin-bottom: 15px;">
                            <label style="font-size: 0.85rem; font-weight: bold; color: var(--text-dark);">Correo Electrónico:</label>
                            <input type="email" id="nuevoEmail" class="input-field" style="width:100%; margin-top:5px;" placeholder="nombre@empresa.com">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer; color: var(--text-dark);">
                                <input type="checkbox" id="checkMensajePersonalizado" onchange="toggleCuerpoMensaje('contenedorMensajePersonalizado', 'checkMensajePersonalizado')">
                                Personalizar mensaje para este destinatario
                            </label>
                        </div>
                        <div id="contenedorMensajePersonalizado" style="display:none; margin-bottom: 15px;">
                            <label style="font-size: 0.85rem; font-weight: bold; color: var(--text-dark);">Nota específica:</label>
                            <textarea id="nuevoMensaje" class="input-field" rows="3" style="width:100%; margin-top:5px; font-family: inherit; resize: none;" placeholder="Ej: Adjunto la copia para su archivo personal..."></textarea>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <button type="button" class="btn btn-primary" style="flex:1" onclick="guardarExterno()">Añadir</button>
                            <button type="button" class="btn btn-outline" style="flex:1" onclick="cerrarModalEmail()">Cancelar</button>
                        </div>
                    </div>

                    <div class="modal-users" id="modalNotaInterno" style="max-width: 450px;">
                        <h3 style="margin-top:0">Mensaje para Personal Interno</h3>
                        <p id="txtNombreInternoModal" style="font-weight: bold; color: var(--primary); margin: 5px 0 15px 0; font-size: 0.9rem;"></p>
                        <input type="hidden" id="hdnInternoDni">
                        <input type="hidden" id="hdnInternoNombre">
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer; color: var(--text-dark);">
                                <input type="checkbox" id="checkMensajeInterno" onchange="toggleCuerpoMensaje('contenedorMensajeInterno', 'checkMensajeInterno')">
                                Personalizar mensaje para este compañero
                            </label>
                        </div>
                        <div id="contenedorMensajeInterno" style="display:none; margin-bottom: 15px;">
                            <label style="font-size: 0.85rem; font-weight: bold; color: var(--text-dark);">Nota específica:</label>
                            <textarea id="nuevoMensajeInterno" class="input-field" rows="3" style="width:100%; margin-top:5px; font-family: inherit; resize: none;" placeholder="Ej: Aquí tienes la copia firmada que me pediste ayer..."></textarea>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <button type="button" class="btn btn-primary" style="flex:1" onclick="guardarInternoConNota()">Añadir al Listado</button>
                            <button type="button" class="btn btn-outline" style="flex:1" onclick="cerrarModalNotaInterno()">Cancelar</button>
                        </div>
                    </div>

                    <div class="sidebar">
                        <div class="brand">Consabfirma</div>
                        <div class="user-profile">
                            <span class="role-badge">🚀 Panel Administrador</span>
                            <div style="font-weight: bold; margin-top:5px; color: white;">${user.nombre} ${user.apellidos}</div>
                            <div style="font-size: 0.8rem; opacity: 0.5; color: white; font-family: monospace;">${user.dni}</div>
                        </div>
                        <nav class="nav-menu">
                            ${botonesSuper}
                            <a href="/admin/${adminDni}" class="nav-link active">📤 Enviar a firmar</a>
                            <a href="/usuario/${adminDni}" class="nav-link" style="color: var(--primary);">✍️ Mi panel de firma</a>
                            <div style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
                                <a href="#" class="nav-link" onclick="abrirPerfil()">⚙️ Mi Perfil</a>
                            </div>
                        </nav>
                        <div class="logout-area">
                            <a href="/" class="btn-logout" style="text-decoration:none; color:#ff7675; display:flex; align-items:center; justify-content:center; gap:10px; font-weight:bold;">🚪 Cerrar Sesión</a>
                        </div>
                    </div>

                    <div class="main-content">
                        <header style="margin-bottom: 30px;">
                            <h1>Panel de envío de documentos</h1>
                            <p style="color: var(--text-muted);">Inicia un proceso de firma digital y gestiona el flujo de trabajo.</p>
                        </header>

                        <div class="card" style="padding: 30px; margin-bottom: 40px;">
                            <form action="/admin/upload" method="post" enctype="multipart/form-data" id="formLanzar">
                                <input type="hidden" name="adminDni" value="${adminDni}">
                                
                                <div style="margin-bottom: 25px;">
                                    <label style="font-weight:bold; display:block; margin-bottom:8px;">Nombre Identificativo del Documento:</label>
                                    <input type="text" name="nombreDoc" class="input-field" required style="width: 100%;" placeholder="Ej: Contrato de Arrendamiento">
                                </div>

                                <div class="drop-zone" id="dropZone" style="margin-bottom: 25px;">
                                    <span class="drop-zone__prompt">📄 Haz clic o arrastra el archivo PDF aquí</span>
                                    <input type="file" name="archivo" accept="application/pdf" required>
                                </div>

                                <div class="envio-grid" style="margin-bottom: 25px;">
                                    <div>
                                        <label style="font-weight:bold; display:block; margin-bottom:8px;">Tipo de Flujo:</label>
                                        <select name="tipo_flujo" class="input-field" style="width: 100%;">
                                            <option value="secuencial">Secuencial (Uno tras otro)</option>
                                            <option value="indistinto">Indistinto (Cualquiera primero)</option>
                                        </select>
                                    </div>
                                </div>

                                <div id="selectedFirmantes" style="margin-bottom: 20px;">
                                    <label style="font-weight:bold; display:block; margin-bottom:12px;">Circuito de Firmantes:</label>
                                    <p id="noFirmantesMsg" style="color:var(--text-muted); font-size:0.85rem; background:#f8fafc; padding:15px; border-radius:8px; border: 1px dashed var(--border);">No has añadido firmantes todavía.</p>
                                </div>
                                <button type="button" class="btn btn-outline" onclick="openModal()" style="margin-bottom: 30px;">+ Añadir Firmante</button>
                                <input type="hidden" name="dni_firmantes_json" id="dni_firmantes_json">

                                <div style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd;">
                                    <label style="display: flex; align-items: center; cursor: pointer; font-weight: bold; gap: 12px; margin: 0; color: #0369a1;">
                                        <input type="checkbox" id="checkEnvio" onchange="toggleEnvioFinal()" style="transform: scale(1.2);">
                                        Notificar y enviar copia al finalizar el proceso (CC)
                                    </label>
                                </div>

                                <div id="seccionEnvioFinal">
                                    <div class="envio-grid">
                                        <div>
                                            <label style="font-weight:bold; font-size: 0.85rem; display:block; margin-bottom:5px;">Personal Interno (CC):</label>
                                            <input type="text" id="userSearch" class="search-box" placeholder="🔍 Buscar compañero..." onkeyup="filterUsers()">
                                            <div class="libreta-container">
                                                ${usuariosSistema.map(u => `
                                                    <div class="user-item-click" data-search="${u.nombre} ${u.apellidos} ${u.dni}" onclick="abrirModalNotaInterno('${u.dni}', '${u.apellidos}, ${u.nombre}')">
                                                        <span>👤 ${u.apellidos}, ${u.nombre}</span>
                                                    </div>
                                                `).join('')}
                                            </div>
                                            <div id="listaInternosConfirmados" style="min-height: 40px; background: #fff; padding: 5px; border: 1px dashed #cbd5e1; border-radius: 6px;">
                                                <p id="noInternosMsg" style="color:var(--text-muted); font-size:0.75rem; margin: 5px;">Ningún compañero seleccionado.</p>
                                            </div>
                                            <input type="hidden" name="internos_seleccionados" id="internos_json">
                                        </div>
                                        <div>
                                            <label style="font-weight:bold; font-size: 0.85rem; display:block; margin-bottom:5px;">Contactos Externos (CC):</label>
                                            <div id="listaExternos" style="margin-bottom: 10px; min-height: 50px; background: #fff; padding: 5px; border: 1px dashed #cbd5e1; border-radius: 6px;">
                                                <p id="noExternosMsg" style="color:var(--text-muted); font-size:0.75rem; margin: 5px;">No hay correos externos.</p>
                                            </div>
                                            <button type="button" class="btn btn-outline" onclick="abrirModalEmail()" style="font-size: 0.8rem; width: 100%;">+ Añadir Destinatario Externo</button>
                                            <input type="hidden" name="destinatariosExternos" id="destinatariosExternos_json">
                                        </div>
                                    </div>
                                    <div style="margin-top: 15px;">
                                        <label style="font-weight:bold; font-size: 0.85rem; display:block; margin-bottom:5px;">Mensaje común del correo:</label>
                                        <textarea name="mensajeFinal" class="input-field" rows="3" style="width: 100%; font-family: inherit;" placeholder="Texto base que recibirán todos..."></textarea>
                                    </div>
                                </div>

                                <div style="margin-top: 40px; border-top: 1px solid var(--border); padding-top: 25px; text-align: right;">
                                    <button type="submit" class="btn btn-primary" style="padding: 14px 50px;">ENVIAR DOCUMENTO</button>
                                </div>
                            </form>
                        </div>

                        <div class="card" style="margin-bottom: 40px;">
                            <h3 class="section-title">⏳ Pendientes</h3>
                            <div style="overflow-x: auto;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr style="text-align: left; border-bottom: 2px solid var(--border);">
                                            <th style="padding: 12px;">Documento</th>
                                            <th style="padding: 12px;">Progreso</th>
                                            <th style="padding: 12px; text-align: right;">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${docsPendientes.map(d => {
                        const listaT = d.firmantes ? d.firmantes.split(',').filter(s => s.trim() !== '') : [];
                        const listaF = d.firmados_por ? d.firmados_por.split(',').filter(s => s.trim() !== '') : [];
                        const porcentaje = listaT.length > 0 ? Math.round((listaF.length / listaT.length) * 100) : 0;
                        return `
                                            <tr style="border-bottom: 1px solid var(--border);">
                                                <td style="padding: 12px;"><strong>${d.nombre}</strong></td>
                                                <td style="padding: 12px;">
                                                    <div style="font-size:0.7rem;">${porcentaje}%</div>
                                                    <div class="progress-bar-bg" style="width:100px; height:8px; background:#eee; border-radius:4px; overflow:hidden;">
                                                        <div class="progress-bar-fill" style="width: ${porcentaje}%; height:100%; background:var(--primary);"></div>
                                                    </div>
                                                </td>
                                                <td style="padding: 12px; text-align: right;">
                                                    <a href="/uploads/${path.basename(d.archivo_original)}" target="_blank" class="btn btn-outline" style="font-size:0.75rem;">Ver</a>
                                                </td>
                                            </tr>`;
                    }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <script>
                        function abrirPerfil() { document.getElementById('modalPerfil').style.display = 'block'; document.getElementById('overlay').style.display = 'block'; }
                        function cerrarPerfil() { document.getElementById('modalPerfil').style.display = 'none'; document.getElementById('overlay').style.display = 'none'; }
                        
                        function cerrarTodosLosModales() { 
                            ['modalPerfil', 'modalUsers', 'modalEmail', 'modalNotaInterno'].forEach(id => {
                                const el = document.getElementById(id);
                                if(el) el.style.display = 'none';
                            });
                            document.getElementById('overlay').style.display = 'none'; 
                        }

                        let firmantesSeleccionados = [];
                        let destinatariosExternos = [];
                        let internosSeleccionados = []; // NUEVO: Array para guardar objetos de internos [{dni, nombre, mensaje}]

                        function openModal() { document.getElementById('modalUsers').style.display = 'block'; document.getElementById('overlay').style.display = 'block'; }
                        function closeModal() { document.getElementById('modalUsers').style.display = 'none'; document.getElementById('overlay').style.display = 'none'; }

                        function selectUser(dni, nombre, cargo) {
                            if (firmantesSeleccionados.find(f => f.dni === dni)) return;
                            firmantesSeleccionados.push({ dni, nombre, cargo });
                            renderFirmantes();
                            closeModal();
                        }

                        function removeUser(dni) {
                            firmantesSeleccionados = firmantesSeleccionados.filter(f => f.dni !== dni);
                            renderFirmantes();
                        }

                        function renderFirmantes() {
                            const container = document.getElementById('selectedFirmantes');
                            const msg = document.getElementById('noFirmantesMsg');
                            container.querySelectorAll('.firmante-row').forEach(r => r.remove());
                            if (firmantesSeleccionados.length === 0) { msg.style.display = 'block'; } else {
                                msg.style.display = 'none';
                                firmantesSeleccionados.forEach((f, i) => {
                                    const div = document.createElement('div');
                                    div.className = 'firmante-row';
                                    div.style = "display:flex; justify-content:space-between; align-items:center; padding:10px; background:white; border:1px solid #ddd; border-radius:8px; margin-bottom:5px;";
                                    div.innerHTML = \`<div>\${i+1}. \${f.nombre}</div><button type="button" onclick="removeUser('\${f.dni}')" style="color:red; background:none; border:none; cursor:pointer; font-weight:bold;">&times;</button>\`;
                                    container.appendChild(div);
                                });
                            }
                            document.getElementById('dni_firmantes_json').value = JSON.stringify(firmantesSeleccionados);
                        }

                        function abrirModalEmail() { document.getElementById('modalEmail').style.display = 'block'; document.getElementById('overlay').style.display = 'block'; }
                        function cerrarModalEmail() { document.getElementById('modalEmail').style.display = 'none'; document.getElementById('overlay').style.display = 'none'; }
                        function toggleEnvioFinal() { document.getElementById('seccionEnvioFinal').style.display = document.getElementById('checkEnvio').checked ? 'block' : 'none'; }
                        
                        function toggleCuerpoMensaje(containerId, checkboxId) { 
                            document.getElementById(containerId).style.display = document.getElementById(checkboxId).checked ? 'block' : 'none'; 
                        }

                        // LÓGICA DE EXTERNOS (RESTAURADA)
                        function guardarExterno() {
                            const email = document.getElementById('nuevoEmail').value.trim();
                            const mensaje = document.getElementById('checkMensajePersonalizado').checked 
                                ? document.getElementById('nuevoMensaje').value.trim() 
                                : null;
                            if(!email) return;
                            destinatariosExternos.push({ email, mensaje });
                            renderExternos();
                            cerrarModalEmail();
                            document.getElementById('nuevoEmail').value = '';
                            document.getElementById('nuevoMensaje').value = '';
                            document.getElementById('checkMensajePersonalizado').checked = false;
                            document.getElementById('contenedorMensajePersonalizado').style.display = 'none';
                        }

                        function renderExternos() {
                            const container = document.getElementById('listaExternos');
                            container.innerHTML = destinatariosExternos.length === 0 ? '<p id="noExternosMsg" style="color:var(--text-muted); font-size:0.75rem; margin: 5px;">No hay correos externos.</p>' : '';
                            destinatariosExternos.forEach((ext, i) => {
                                const div = document.createElement('div');
                                div.style = "display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #eee; font-size: 0.8rem; align-items:center;";
                                const badge = ext.mensaje ? ' <small style="color:var(--primary); font-weight:bold;">(con nota)</small>' : '';
                                div.innerHTML = \`<span>📧 \${ext.email}\${badge}</span><button type="button" onclick="destinatariosExternos.splice(\${i},1); renderExternos();" style="color:red; border:none; background:none; cursor:pointer; font-weight:bold;">&times;</button>\`;
                                container.appendChild(div);
                            });
                            document.getElementById('destinatariosExternos_json').value = JSON.stringify(destinatariosExternos);
                        }

                        // NUEVA LÓGICA SIMÉTRICA PARA PERSONAL INTERNO (CC)
                        function abrirModalNotaInterno(dni, nombre) {
                            if(internosSeleccionados.find(i => i.dni === dni)) return; // Ya añadido
                            document.getElementById('txtNombreInternoModal').innerText = nombre;
                            document.getElementById('hdnInternoDni').value = dni;
                            document.getElementById('hdnInternoNombre').value = nombre;
                            document.getElementById('modalNotaInterno').style.display = 'block';
                            document.getElementById('overlay').style.display = 'block';
                        }

                        function cerrarModalNotaInterno() {
                            document.getElementById('modalNotaInterno').style.display = 'none';
                            document.getElementById('overlay').style.display = 'none';
                            document.getElementById('nuevoMensajeInterno').value = '';
                            document.getElementById('checkMensajeInterno').checked = false;
                            document.getElementById('contenedorMensajeInterno').style.display = 'none';
                        }

                        function guardarInternoConNota() {
                            const dni = document.getElementById('hdnInternoDni').value;
                            const nombre = document.getElementById('hdnInternoNombre').value;
                            const mensaje = document.getElementById('checkMensajeInterno').checked
                                ? document.getElementById('nuevoMensajeInterno').value.trim()
                                : null;
                            
                            internosSeleccionados.push({ dni, nombre, mensaje });
                            renderInternosConfirmados();
                            cerrarModalNotaInterno();
                        }

                        function renderInternosConfirmados() {
                            const container = document.getElementById('listaInternosConfirmados');
                            container.innerHTML = internosSeleccionados.length === 0 ? '<p id="noInternosMsg" style="color:var(--text-muted); font-size:0.75rem; margin: 5px;">Ningún compañero seleccionado.</p>' : '';
                            internosSeleccionados.forEach((int, i) => {
                                const div = document.createElement('div');
                                div.style = "display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #eee; font-size: 0.8rem; align-items:center;";
                                const badge = int.mensaje ? ' <small style="color:var(--primary); font-weight:bold;">(con nota)</small>' : '';
                                div.innerHTML = \`<span>👤 \${int.nombre}\${badge}</span><button type="button" onclick="internosSeleccionados.splice(\${i},1); renderInternosConfirmados();" style="color:red; border:none; background:none; cursor:pointer; font-weight:bold;">&times;</button>\`;
                                container.appendChild(div);
                            });
                            document.getElementById('internos_json').value = JSON.stringify(internosSeleccionados);
                        }

                        function filterUsers() {
                            const query = document.getElementById('userSearch').value.toLowerCase();
                            document.querySelectorAll('.user-item-click').forEach(item => {
                                item.style.display = item.getAttribute('data-search').toLowerCase().includes(query) ? 'block' : 'none';
                            });
                        }

                        const dropZone = document.getElementById('dropZone');
                        const fileInput = dropZone.querySelector('input');
                        dropZone.onclick = () => fileInput.click();
                        fileInput.onchange = () => { if(fileInput.files[0]) dropZone.querySelector('.drop-zone__prompt').innerText = "✅: " + fileInput.files[0].name; };
                    </script>
                </body>
                </html>
                `);
                });
            });
        });
    });
});

// PROCESAMIENTO DEL FORMULARIO
router.post('/upload', upload.single('archivo'), (req, res) => {
    const { adminDni, nombreDoc, dni_firmantes_json, tipo_flujo, internos_seleccionados, destinatariosExternos, mensajeFinal } = req.body;
    const archivoPath = req.file ? req.file.path : null;

    let listaFirmantesStr = "";
    try {
        const firmantesArr = JSON.parse(dni_firmantes_json || '[]');
        listaFirmantesStr = firmantesArr.map(f => f.dni).join(',');
    } catch (e) { console.error(e); }

    // En vez de guardar un string plano de DNIs, la base de datos ahora guardará el JSON estructurado [ {dni, nombre, mensaje}, ... ]
    // Si no viene nada, enviamos un array vacío stringificado "[]"
    const query = `INSERT INTO documentos (nombre, archivo_original, firmantes, firmados_por, estado, tipo_flujo, destinatarios_internos, destinatarios_externos, mensaje_final) VALUES (?, ?, ?, ?, 'pendiente', ?, ?, ?, ?)`;
    db.run(query, [nombreDoc, archivoPath, listaFirmantesStr, "", tipo_flujo, internos_seleccionados || "[]", destinatariosExternos || "[]", mensajeFinal || ""], (err) => {
        if (err) console.error(err);
        res.redirect(`/admin/${adminDni}`);
    });
});

module.exports = router;