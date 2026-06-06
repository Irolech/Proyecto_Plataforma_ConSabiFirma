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

    // 🔒 Control de acceso: Si no hay sesión válida, redirigir al login
    if (!req.session || !req.session.usuario) {
        return res.redirect('/login');
    }

    // 🚀 Extraemos el DNI de forma segura desde la sesión en el servidor
    const userDni = req.session.usuario.dni;

    db.get("SELECT nombre, apellidos, rol, cargo, dni, email, foto_url, notif_email FROM usuarios WHERE dni = ?", [userDni], (err, user) => {
        if (err || !user) return res.status(403).send("Acceso denegado o error de sesión interna");

        db.all("SELECT * FROM documentos WHERE firmantes LIKE ? ORDER BY id DESC", [`%${userDni}%`], (errDocs, todosLosDocs) => {
            if (errDocs) {
                console.error("Error al buscar documentos:", errDocs);
                return res.status(500).send("Error interno al cargar los documentos");
            }

            const docs = todosLosDocs || [];
            const pendientes = docs.filter(d => !d.firmados_por.includes(userDni));
            const finalizados = docs.filter(d => d.firmados_por.includes(userDni));

            // 🎛️ BOTONES CONDICIONALES SEGÚN EL ROL
            let botonAdmin = '';
            let botonEmergencia = '';

            if (user.rol === 'admin' || user.rol === 'superadmin') {
                botonAdmin = `<a href="/admin" class="nav-link">📤 Panel de envío</a>`;
            }

            // 🚨 RECOV DE EMERGENCIA: El botón del búnker AHORA es visible para los Administradores
            if (user.rol === 'admin' || user.rol === 'superadmin') {
                botonEmergencia = `
                    <a href="/admin/bunker" class="nav-link" style="color: #ff7675; border: 1px dashed rgba(255,118,117,0.3); margin-top: 15px; border-radius: var(--radius);">
                        🚨 Código de Emergencia
                    </a>`;
            }

            // Lógica de iniciales para el avatar
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
                    .user-profile { 
                        background: rgba(255,255,255,0.05); padding: 15px; border-radius: var(--radius); 
                        margin-bottom: 30px; border: 1px solid rgba(108, 92, 231, 0.2); 
                    }
                    .role-badge { color: var(--primary); font-size: 0.7rem; font-weight: bold; text-transform: uppercase; }
                    .nav-menu { flex-grow: 1; }
                    .logout-area { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; margin-top: auto; padding-bottom: 20px; }
                    
                    .overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 998; }
                    .modal-profile, .modal-users { 
                        display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                        background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                        z-index: 999; width: 90%;
                    }
                    .modal-profile { max-width: 550px; }
                    .modal-users { max-width: 700px; }

                    .search-container { display: flex; gap: 10px; margin-bottom: 20px; }
                    .search-input { flex: 1; padding: 10px; border: 1px solid var(--border); border-radius: 6px; }
                    .history-item { 
                        display: flex; justify-content: space-between; align-items: center; 
                        padding: 12px; border-bottom: 1px solid #eee; 
                    }
                </style>
            </head>
            <body>
                <div class="overlay" id="overlay" onclick="cerrarTodosLos Modales()"></div>

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
                                <span style="font-family: monospace;">${user.dni}</span> | <span>${user.cargo || 'Usuario'}</span>
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
                </div>

                <div class="modal-users" id="modalHistorial">
                    <h3>🔍 Buscador de Historial Personal</h3>
                    <div class="search-container">
                        <input type="text" id="filterNombre" class="search-input" placeholder="Nombre del documento..." onkeyup="filtrarHistorial()">
                        <input type="date" id="filterFecha" class="search-input" onchange="filtrarHistorial()">
                    </div>
                    <div id="listaHistorialCompleta" style="max-height: 400px; overflow-y: auto; background: #f8fafc; border-radius: 8px;">
                        ${finalizados.map(d => `
                            <div class="history-item" data-nombre="${d.nombre.toLowerCase()}" data-fecha="${d.fecha_creacion || ''}">
                                <div><div style="font-weight: bold;">${d.nombre}</div><div style="font-size: 0.75rem; color: var(--text-muted);">Firmado el: ${d.fecha_creacion || '---'}</div></div>
                                <a href="/uploads/${path.basename(d.archivo_firmado || d.archivo_original)}" target="_blank" class="btn btn-outline" style="font-size: 0.7rem;">Ver doc</a>
                            </div>
                        `).join('')}
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
                        <a href="/usuario" class="nav-link active">✍️ Mi panel de firma</a>
                        ${botonAdmin}
                        <a href="#" class="nav-link" onclick="abrirHistorial()">📜 Historial personal</a>
                        ${botonEmergencia} <div style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
                            <a href="#" class="nav-link" onclick="abrirPerfil()">⚙️ Mi Perfil</a>
                        </div>
                    </nav>

                    <div class="logout-area">
                        <a href="/" class="btn-logout" style="text-decoration:none; color:#ff7675; display:flex; align-items:center; justify-content:center; gap:10px; font-weight:bold;">🚪 Cerrar Sesión</a>
                    </div>
                </div>

                <div class="main-content">
                    <header style="margin-bottom: 30px;">
                        <h1>Mi panel de firma</h1>
                        <p style="color: var(--text-muted);">Gestiona tus documentos pendientes y revisa tus firmas realizadas.</p>
                    </header>

                    <div class="card" style="margin-bottom: 30px;">
                        <h3 class="section-title">✍️ Documentos a firmar</h3>
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="text-align: left; border-bottom: 2px solid var(--border);">
                                        <th style="padding: 12px;">Documento</th>
                                        <th style="padding: 12px; text-align: right;">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pendientes.length === 0 ? '<tr><td colspan="2" style="padding:30px; text-align:center; color:var(--text-muted);">Sin pendientes</td></tr>' : pendientes.map(d => `
                                        <tr style="border-bottom: 1px solid var(--border);">
                                            <td style="padding: 12px;"><strong>${d.nombre}</strong><div style="font-size:0.75rem; color:var(--text-muted)">ID: #${d.id}</div></td>
                                            <td style="padding: 12px; text-align: right;"><a href="/usuario/firma/${d.id}" class="btn btn-primary" style="font-size:0.8rem;">Revisar y Firmar</a></td>
                                        </tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="card" style="background: #fcfdfd;">
                        <h3 class="section-title">✅ Firmas recientes</h3>
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="text-align: left; border-bottom: 1px solid var(--border); color: var(--text-muted);">
                                        <th style="padding: 12px; font-weight: normal;">Documento</th>
                                        <th style="padding: 12px; text-align: right; font-weight: normal;">Descarga</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${finalizados.slice(0, 5).map(d => `
                                        <tr style="border-bottom: 1px solid #f1f5f9;">
                                            <td style="padding: 12px;">
                                                <div style="font-weight:600; font-size: 0.9rem;">${d.nombre}</div>
                                                <div style="font-size:0.75rem; color:var(--text-muted)">Finalizado</div>
                                            </td>
                                            <td style="padding: 12px; text-align: right;">
                                                <a href="/uploads/${path.basename(d.archivo_firmado || d.archivo_original)}" target="_blank" class="btn btn-outline" style="font-size:0.75rem;">Descargar</a>
                                            </td>
                                        </tr>
                                    `).join('')}
                                    ${finalizados.length === 0 ? '<tr><td colspan="2" style="padding:20px; text-align:center; color:var(--text-muted);">Sin historial reciente</td></tr>' : ''}
                                </tbody>
                            </table>
                        </div>
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
                    function abrirHistorial() {
                        document.getElementById('modalHistorial').style.display = 'block';
                        document.getElementById('overlay').style.display = 'block';
                    }
                    function cerrarTodosLosModales() {
                        document.getElementById('modalPerfil').style.display = 'none';
                        document.getElementById('modalHistorial').style.display = 'none';
                        document.getElementById('overlay').style.display = 'none';
                    }
                    function filtrarHistorial() {
                        const nombreBusqueda = document.getElementById('filterNombre').value.toLowerCase();
                        const fechaBusqueda = document.getElementById('filterFecha').value;
                        document.querySelectorAll('.history-item').forEach(item => {
                            const coincideNombre = item.getAttribute('data-nombre').includes(nombreBusqueda);
                            const coincideFecha = !fechaBusqueda || item.getAttribute('data-fecha').startsWith(fechaBusqueda);
                            item.style.display = (coincideNombre && coincideFecha) ? 'flex' : 'none';
                        });
                    }
                </script>
            </body>
            </html>
            `);
        });
    });
});

// =======================================================
// RUTA DINÁMICA DE FIRMA LTV (Evolución de firmar.html)
// =======================================================
router.get('/firma/:id', (req, res) => {
    if (!req.session || !req.session.usuario) {
        return res.redirect('/');
    }

    const docId = req.params.id;
    const userDni = req.session.usuario.dni;

    db.get("SELECT * FROM documentos WHERE id = ?", [docId], (err, doc) => {
        if (err || !doc) return res.status(404).send("Documento no encontrado en el sistema.");

        // Control de Seguridad 1: ¿Pertenece a este usuario?
        if (!doc.firmantes.includes(userDni)) {
            return res.status(403).send("🛑 Acceso denegado: No figuras como firmante en este expediente.");
        }

        // Control de Seguridad 2: ¿Ya lo ha firmado?
        if (doc.firmados_por && doc.firmados_por.includes(userDni)) {
            return res.send("<script>alert('✅ Ya has firmado este documento previamente.'); window.location.href='/usuario';</script>");
        }

        // Formateo de fecha limpia
        const fechaEmision = new Date(doc.fecha_creacion).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

        // Inyectamos el HTML de la pasarela de AutoFirma
        res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Firma Electrónica - Consabfirma</title>
            <link rel="stylesheet" href="/css/style.css">
            <style>
                body { font-family: 'Segoe UI', sans-serif; background: #f4f7f6; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
                .card { background: white; padding: 35px; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.05); max-width: 550px; width: 100%; text-align: center; }
                .status-badge { display: inline-block; padding: 6px 14px; background: #ffeaa7; color: #d63031; border-radius: 20px; font-weight: bold; font-size: 0.85rem; margin-bottom: 20px; }
                .doc-box { background: #f1f2f6; border-left: 5px solid #2ecc71; padding: 15px; border-radius: 4px; text-align: left; margin: 25px 0; font-size: 0.95rem; }
                .btn-autofirma { background: #2ecc71; color: white; border: none; padding: 15px 28px; font-size: 1.1rem; font-weight: bold; border-radius: 8px; cursor: pointer; width: 100%; transition: background 0.3s; }
                .btn-autofirma:hover { background: #27ae60; }
                .btn-volver { display: inline-block; margin-top: 20px; color: #636e72; text-decoration: none; font-size: 0.9rem; font-weight: bold; }
                .btn-volver:hover { color: #2d3436; text-decoration: underline; }
                #consolaLog { margin-top: 20px; padding: 12px; background: #2d3436; color: #00ff00; font-family: monospace; font-size: 0.85rem; border-radius: 6px; text-align: left; display: none; line-height: 1.4; word-break: break-all; }
            </style>
            <script src="/js/autoscript.js"></script>
        </head>
        <body>
            <div class="card">
                <span class="status-badge">⏳ Acción Requerida</span>
                <h2 style="margin-top: 0; color: #2d3436;">Firma Electrónica</h2>
                <p style="color: #636e72; font-size: 0.95rem;">Asegúrate de tener AutoFirma abierto o instalado en tu equipo antes de proceder.</p>
                
                <div class="doc-box">
                    <strong>📄 Trámite:</strong> ${doc.nombre}<br>
                    <strong>🔖 Referencia:</strong> EXP-${doc.id}<br>
                    <strong>📅 Fecha de Alta:</strong> ${fechaEmision}
                </div>

                <button class="btn-autofirma" id="btnFirmar">🖊️ Firmar con Certificado Oficial</button>
                <a href="/usuario" class="btn-volver">⬅️ Cancelar y volver al panel</a>

                <div id="consolaLog"></div>
            </div>

            <script>
                let pdfDinamicoBase64 = "";

                // Descarga automática del archivo al servidor en Base64
                window.addEventListener('DOMContentLoaded', () => {
                    const consola = document.getElementById('consolaLog');
                    consola.style.display = "block";
                    consola.innerText = "⏳ Conectando con el servidor seguro...";

                    fetch('/api/firmas/obtener-documento?id=${doc.id}')
                        .then(res => res.json())
                        .then(data => {
                            if (data.success) {
                                pdfDinamicoBase64 = data.base64;
                                consola.style.color = "#2ecc71";
                                consola.innerText = "✅ Documento cargado en memoria. Listo para AutoFirma.";
                            } else {
                                consola.style.color = "#e74c3c";
                                consola.innerText = "❌ Error del servidor: " + data.error;
                            }
                        })
                        .catch(err => {
                            consola.style.color = "#e74c3c";
                            consola.innerText = "❌ Error de conexión de red.";
                        });
                });

                // Disparador de la firma
                document.getElementById('btnFirmar').addEventListener('click', () => {
                    const consola = document.getElementById('consolaLog');
                    
                    if (!pdfDinamicoBase64) {
                        consola.style.color = "#e74c3c";
                        consola.innerText = "⚠️ El documento aún no ha terminado de cargar.";
                        return;
                    }

                    consola.style.color = "#f1c40f";
                    consola.innerText = "⏳ Abriendo pasarela con AutoFirma LTV...";

                    try {
                        AutoScript.cargarAppAfirma();

                        // Activación de validación a largo plazo
                        const parametrosExtra = "signatureProfile=PAdES-B-LTV\\\\ntsType=RFC3161\\\\ntsaURL=https://freetsa.org/tsr";

                        AutoScript.sign(
                            pdfDinamicoBase64,
                            "SHA256withRSA",
                            "PAdES",
                            parametrosExtra,
                            function (firmaBase64) {
                                consola.style.color = "#2ecc71";
                                consola.innerText = "✅ ¡Túnel criptográfico exitoso! Subiendo al archivo central...";

                                // Enviar resultado adjuntando ID del Documento y DNI del Usuario
                                fetch('/api/firmas/recibir?documentoId=${doc.id}&dni=${userDni}', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ archivoBase64: firmaBase64 })
                                })
                                .then(res => res.json())
                                .then(data => {
                                    if (data.success) {
                                        consola.innerText += "\\\\n🚀 ¡Trámite completado! Redirigiendo a tu bandeja...";
                                        setTimeout(() => window.location.href = '/usuario', 2000);
                                    } else {
                                        consola.style.color = "#e74c3c";
                                        consola.innerText += "\\\\n❌ Error al guardar en base de datos: " + data.error;
                                    }
                                });
                            },
                            function (errorType, errorMessage) {
                                consola.style.color = "#e74c3c";
                                consola.innerText = \`💥 Proceso cancelado o fallido: \${errorType} - \${errorMessage}\`;
                            }
                        );
                    } catch (error) {
                        consola.style.color = "#e74c3c";
                        consola.innerText = "💥 Fallo al ejecutar el script del Ministerio.";
                    }
                });
            </script>
        </body>
        </html>
        `);
    });
});

module.exports = router;