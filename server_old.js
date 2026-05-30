const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./database.js');
const cors = require('cors');
const { PDFDocument, rgb } = require('pdf-lib');
const nodemailer = require('nodemailer');

// --- 0. CONFIGURACIÓN INICIAL ---
const carpetas = ['documentos_originales', 'documentos_preparados', 'documentos_firmados', 'temp'];
carpetas.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        console.log(`✅ Carpeta lista: ${dir}`);
    }
});

// Aseguramos que la columna 'cargo' exista en la base de datos
db.run("ALTER TABLE usuarios ADD COLUMN cargo TEXT", (err) => {
    if (!err) console.log("✅ Columna 'cargo' añadida correctamente.");
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'tu-email@gmail.com', 
        pass: 'tu-app-password'      
    }
});

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ dest: 'temp/' });

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/originales', express.static(path.join(__dirname, 'documentos_originales')));
app.use('/preparados', express.static(path.join(__dirname, 'documentos_preparados')));
app.use('/firmados', express.static(path.join(__dirname, 'documentos_firmados')));

async function enviarAvisoFirma(dni, nombreDoc) {
    db.get("SELECT email, nombre FROM usuarios WHERE dni = ?", [dni], (err, user) => {
        if (user && user.email) {
            const mailOptions = {
                from: '"Consabfirma" <tu-email@gmail.com>',
                to: user.email,
                subject: `Pendiente de firma: ${nombreDoc}`,
                html: `<h3>Hola ${user.nombre},</h3>
                       <p>Tienes un nuevo documento pendiente de firma en Consabfirma: <b>${nombreDoc}</b>.</p>
                       <p>Accede a tu portal para firmar: <a href="http://localhost:${port}/login">Ir al Portal</a></p>`
            };
            transporter.sendMail(mailOptions, (error) => {
                if (error) console.log("❌ Error enviando email:", error);
                else console.log(`📧 Aviso enviado a ${user.email}`);
            });
        }
    });
}

// --- 1. PANEL DE ADMINISTRACIÓN Y SUPERADMIN ---
app.get('/admin/:dni', (req, res) => {
    const adminDni = req.params.dni;

    db.get("SELECT * FROM usuarios WHERE dni = ?", [adminDni], (err, adminUser) => {
        if (!adminUser || (adminUser.rol !== 'admin' && adminUser.rol !== 'superadmin')) {
            return res.send("Acceso denegado. No tienes permisos de administración.");
        }

        db.all("SELECT * FROM usuarios", [], (err, todosLosUsuarios) => {
            const sqlSeguimiento = `
                SELECT d.id, d.nombre, d.estado, d.ruta_trabajo,
                group_concat(u.nombre || ' ' || u.apellidos || ' (' || f.estado_firma || ')', ' | ') as detalle_firmantes
                FROM documentos d
                LEFT JOIN firmantes f ON d.id = f.documento_id
                LEFT JOIN usuarios u ON f.dni_firmante = u.dni
                GROUP BY d.id 
                ORDER BY d.id DESC`;

            db.all(sqlSeguimiento, [], (err, procesos) => {
                const listaProcesos = procesos || [];
                res.send(`
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <title>Panel - Consabfirma</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
                    <style>
                        :root { --corp-color: #d4ea6b; --dark-bg: #1a1d23; }
                        body { font-family: sans-serif; background-color: #f4f7f6; }
                        .sidebar { background: var(--dark-bg); min-height: 100vh; color: white; position: fixed; width: 260px; border-right: 4px solid var(--corp-color); }
                        .main-content { margin-left: 260px; padding: 40px; }
                        .nav-link { color: #94a3b8; border-radius: 10px; margin-bottom: 8px; cursor: pointer; padding: 12px; }
                        .nav-link:hover { background: rgba(255,255,255,0.05); }
                        .nav-link.active { background: var(--corp-color); color: var(--dark-bg); font-weight: bold; }
                        .card { border: none; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                        .hidden-section { display: none; }
                    </style>
                </head>
                <body>
                    <div class="sidebar p-4">
                        <div class="text-center mb-4">
                            <div style="background:var(--corp-color); width:50px; height:50px; border-radius:12px; margin:0 auto;" class="d-flex align-items-center justify-content-center text-dark fw-bold fs-4">C</div>
                            <h5 class="mt-2">Consabfirma</h5>
                            <span class="badge bg-light text-dark text-uppercase" style="font-size:0.6rem">${adminUser.rol}</span>
                        </div>
                        <nav class="nav flex-column mt-4">
                            <a class="nav-link active" id="btn-envios" onclick="showSection('envios')"><i class="bi bi-send me-2"></i> Enviar Documentos</a>
                            <a class="nav-link" id="btn-seguimiento" onclick="showSection('seguimiento')"><i class="bi bi-list-check me-2"></i> Seguimiento</a>
                            ${adminUser.rol === 'superadmin' ? `<a class="nav-link" id="btn-usuarios" onclick="showSection('usuarios')"><i class="bi bi-people-fill me-2"></i> Gestión Usuarios</a>` : ''}
                            <hr style="border-color: #333">
                            <a class="nav-link" href="/bandeja/${adminUser.dni}"><i class="bi bi-mailbox me-2"></i> Mi Bandeja Personal</a>
                            <a class="nav-link text-danger mt-5" href="/login"><i class="bi bi-box-arrow-left me-2"></i> Cerrar Sesión</a>
                        </nav>
                    </div>

                    <div class="main-content">
                        <div id="section-envios">
                            <h2 class="fw-bold mb-4">Nuevo Proceso de Firma</h2>
                            <div class="card p-4">
                                <form action="/admin/subir" method="POST" enctype="multipart/form-data">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <label class="fw-bold small mb-2">NOMBRE DEL PROCESO</label>
                                            <input type="text" name="nombre" class="form-control mb-3" placeholder="Ej: Contrato de Arras" required>
                                            <label class="fw-bold small mb-2">ARCHIVO PDF</label>
                                            <input type="file" name="pdf" class="form-control" accept=".pdf" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="fw-bold small mb-2">FIRMANTES (EN ORDEN)</label>
                                            <div id="listaFirmantesUI" class="mb-2"></div>
                                            <input type="hidden" name="firmantes" id="inputFirmantes">
                                            <input type="hidden" name="adminDni" value="${adminUser.dni}">
                                            <button type="button" class="btn btn-dark w-100 btn-sm" data-bs-toggle="modal" data-bs-target="#modalUsuarios">
                                                <i class="bi bi-plus-circle me-2"></i>Seleccionar Personas
                                            </button>
                                        </div>
                                    </div>
                                    <button type="submit" class="btn btn-lg w-100 mt-4" style="background:var(--corp-color); font-weight:bold;">LANZAR A LA FIRMA</button>
                                </form>
                            </div>
                        </div>

                        <div id="section-seguimiento" class="hidden-section">
                            <h2 class="fw-bold mb-4">Estado de los Documentos</h2>
                            <div class="card p-4">
                                <table class="table align-middle">
                                    <thead><tr><th>Documento</th><th>Estado</th><th>Firmantes</th><th>Acción</th></tr></thead>
                                    <tbody>
                                        ${listaProcesos.map(p => `
                                            <tr>
                                                <td><b>${p.nombre}</b></td>
                                                <td><span class="badge ${p.estado === 'firmado' ? 'bg-success' : 'bg-warning text-dark'}">${p.estado.toUpperCase()}</span></td>
                                                <td class="small text-muted">${p.detalle_firmantes}</td>
                                                <td><button onclick="eliminarProceso(${p.id})" class="btn btn-sm btn-outline-danger"><i class="bi bi-trash"></i></button></td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div id="section-usuarios" class="hidden-section">
                            <h2 class="fw-bold mb-4">Administración de Personal</h2>
                            <div class="row">
                                <div class="col-md-4">
                                    <div class="card p-4 mb-4">
                                        <h5 class="fw-bold mb-3">Nuevo Usuario</h5>
                                        <form action="/admin/crear-usuario" method="POST">
                                            <input type="hidden" name="adminDni" value="${adminUser.dni}">
                                            <input type="text" name="dni" class="form-control mb-2" placeholder="DNI" required>
                                            <input type="text" name="nombre" class="form-control mb-2" placeholder="Nombre" required>
                                            <input type="text" name="apellidos" class="form-control mb-2" placeholder="Apellidos" required>
                                            <input type="text" name="cargo" class="form-control mb-2" placeholder="Cargo (Ej: Gerente)">
                                            <input type="email" name="email" class="form-control mb-2" placeholder="Email" required>
                                            <select name="rol" class="form-select mb-2">
                                                <option value="usuario">Rol: Usuario (Firma)</option>
                                                <option value="admin">Rol: Administrador (Envía)</option>
                                                <option value="superadmin">Rol: Superadmin (Todo)</option>
                                            </select>
                                            <input type="password" name="password" class="form-control mb-3" placeholder="Contraseña" required>
                                            <button type="submit" class="btn btn-dark w-100">Crear Acceso</button>
                                        </form>
                                    </div>
                                </div>
                                <div class="col-md-8">
                                    <div class="card p-4">
                                        <table class="table">
                                            <thead><tr><th>Nombre / Cargo</th><th>Rol</th><th>Acciones</th></tr></thead>
                                            <tbody>
                                                ${todosLosUsuarios.map(u => `
                                                    <tr>
                                                        <td>
                                                            <b>${u.nombre} ${u.apellidos}</b><br>
                                                            <small class="text-primary">${u.cargo || 'Sin cargo'}</small><br>
                                                            <small class="text-muted">${u.dni}</small>
                                                        </td>
                                                        <td><span class="badge bg-secondary">${u.rol}</span></td>
                                                        <td>
                                                            <a href="/admin/editar-usuario/${u.dni}/${adminUser.dni}" class="btn btn-sm btn-outline-primary me-1">
                                                                <i class="bi bi-pencil"></i>
                                                            </a>
                                                            <button onclick="eliminarUsuario('${u.dni}')" class="btn btn-sm btn-outline-danger">
                                                                <i class="bi bi-person-x"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Modal Selección Firmantes -->
                    <div class="modal fade" id="modalUsuarios" tabindex="-1">
                        <div class="modal-dialog modal-dialog-scrollable">
                            <div class="modal-content">
                                <div class="modal-header"><h5 class="fw-bold">Añadir Firmantes</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                                <div class="modal-body">
                                    ${todosLosUsuarios.map(u => `
                                        <div class="d-flex justify-content-between p-2 border-bottom align-items-center">
                                            <span>${u.nombre} ${u.apellidos}</span>
                                            <button 
                                                type="button"
                                                id="btn-add-${u.dni}"
                                                onclick="addFirmante('${u.dni}', '${u.nombre} ${u.apellidos}')" 
                                                class="btn btn-sm btn-outline-success btn-modal-add">Añadir</button>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
                    <script>
                        let seleccionados = [];
                        function showSection(name) {
                            ['envios', 'seguimiento', 'usuarios'].forEach(s => {
                                const el = document.getElementById('section-' + s);
                                if(el) el.classList.toggle('hidden-section', s !== name);
                                const btn = document.getElementById('btn-' + s);
                                if(btn) btn.classList.toggle('active', s === name);
                            });
                        }
                        function addFirmante(dni, nombre) {
                            if(!seleccionados.find(s => s.dni === dni)) {
                                seleccionados.push({dni, nombre});
                                renderFirmantes();
                            }
                        }
                        function quitarFirmante(index) {
                            seleccionados.splice(index, 1);
                            renderFirmantes();
                        }
                        function renderFirmantes() {
                            const listaUI = document.getElementById('listaFirmantesUI');
                            listaUI.innerHTML = seleccionados.map((s, i) => \`
                                <div class="alert alert-light border p-2 mb-1 d-flex justify-content-between align-items-center">
                                    <span><small class="badge bg-dark me-2">\${i+1}</small> \${s.nombre}</span>
                                    <i class="bi bi-x-circle text-danger" style="cursor:pointer" onclick="quitarFirmante(\${i})"></i>
                                </div>\`).join('');
                            document.getElementById('inputFirmantes').value = seleccionados.map(s => s.dni).join(',');
                            actualizarBotonesModal();
                        }
                        function actualizarBotonesModal() {
                            document.querySelectorAll('.btn-modal-add').forEach(btn => {
                                btn.disabled = false;
                                btn.classList.replace('btn-secondary', 'btn-outline-success');
                                btn.innerText = 'Añadir';
                            });
                            seleccionados.forEach(s => {
                                const btn = document.getElementById('btn-add-' + s.dni);
                                if(btn) {
                                    btn.disabled = true;
                                    btn.classList.replace('btn-outline-success', 'btn-secondary');
                                    btn.innerText = 'Añadido';
                                }
                            });
                        }
                        function eliminarProceso(id) {
                            if(confirm('¿Borrar proceso?')) fetch('/admin/eliminar/' + id, {method:'POST'}).then(()=>location.reload());
                        }
                        function eliminarUsuario(dni) {
                            if(confirm('¿Eliminar usuario?')) fetch('/admin/eliminar-usuario/' + dni, {method:'POST'}).then(()=>location.reload());
                        }
                    </script>
                </body>
                </html>`);
            });
        });
    });
});

// --- RUTAS DE GESTIÓN (USUARIOS) ---

app.get('/admin/editar-usuario/:dni/:adminDni', (req, res) => {
    const { dni, adminDni } = req.params;
    db.get("SELECT * FROM usuarios WHERE dni = ?", [dni], (err, user) => {
        if (!user) return res.send("Usuario no encontrado");
        res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Editar Usuario - Consabfirma</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { background: #f8f9fa; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
                .card { border: none; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 100%; max-width: 450px; }
            </style>
        </head>
        <body>
            <div class="card p-4">
                <h4 class="fw-bold mb-1">Editar Perfil</h4>
                <p class="text-muted small mb-4">${user.nombre} ${user.apellidos} (${user.dni})</p>
                <form action="/admin/actualizar-usuario-simple" method="POST">
                    <input type="hidden" name="dni" value="${user.dni}">
                    <input type="hidden" name="adminDni" value="${adminDni}">
                    <div class="mb-3">
                        <label class="form-label small fw-bold">Correo Electrónico</label>
                        <input type="email" name="email" class="form-control" value="${user.email}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">Cargo</label>
                        <input type="text" name="cargo" class="form-control" value="${user.cargo || ''}" placeholder="Ej: Responsable de Compras">
                    </div>
                    <div class="mb-4">
                        <label class="form-label small fw-bold">Rol del Sistema</label>
                        <select name="rol" class="form-select">
                            <option value="usuario" ${user.rol === 'usuario' ? 'selected' : ''}>Usuario (Firma)</option>
                            <option value="admin" ${user.rol === 'admin' ? 'selected' : ''}>Administrador</option>
                            <option value="superadmin" ${user.rol === 'superadmin' ? 'selected' : ''}>Superadmin</option>
                        </select>
                    </div>
                    <div class="d-grid gap-2">
                        <button type="submit" class="btn btn-dark">Guardar Cambios</button>
                        <a href="/admin/${adminDni}" class="btn btn-light">Cancelar</a>
                    </div>
                </form>
            </div>
        </body>
        </html>`);
    });
});

app.post('/admin/actualizar-usuario-simple', (req, res) => {
    const { dni, email, cargo, rol, adminDni } = req.body;
    db.run("UPDATE usuarios SET email = ?, cargo = ?, rol = ? WHERE dni = ?", 
        [email, cargo, rol, dni], () => res.redirect('/admin/' + adminDni));
});

app.post('/admin/crear-usuario', (req, res) => {
    const { dni, nombre, apellidos, cargo, email, rol, password, adminDni } = req.body;
    db.run("INSERT INTO usuarios (dni, nombre, apellidos, cargo, email, rol, password) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [dni, nombre, apellidos, cargo, email, rol, password], () => res.redirect('/admin/' + adminDni));
});

app.post('/admin/eliminar-usuario/:dni', (req, res) => {
    db.run("DELETE FROM usuarios WHERE dni = ?", [req.params.dni], () => res.sendStatus(200));
});

// --- RUTAS DE DOCUMENTOS ---
app.post('/admin/subir', upload.single('pdf'), (req, res) => {
    const { nombre, firmantes, adminDni } = req.body;
    if (!firmantes) return res.send("Error: Debes seleccionar al menos un firmante.");
    
    const listaDnis = firmantes.split(',');
    const nombreArchivo = `${Date.now()}.pdf`;
    const rutaOriginal = path.join(__dirname, 'documentos_originales', nombreArchivo);
    const rutaTrabajo = path.join(__dirname, 'documentos_preparados', nombreArchivo);

    fs.renameSync(req.file.path, rutaOriginal);
    fs.copyFileSync(rutaOriginal, rutaTrabajo);

    db.run(`INSERT INTO documentos (nombre, ruta_original, ruta_trabajo, estado) VALUES (?, ?, ?, 'pendiente')`,
        [nombre, rutaOriginal, rutaTrabajo], function(err) {
            const docId = this.lastID;
            const stmt = db.prepare(`INSERT INTO firmantes (documento_id, dni_firmante, orden, estado_firma) VALUES (?, ?, ?, 'pendiente')`);
            listaDnis.forEach((dni, i) => {
                stmt.run(docId, dni, i + 1);
                if (i === 0) enviarAvisoFirma(dni, nombre);
            });
            stmt.finalize(() => res.redirect('/admin/' + adminDni));
        });
});

app.post('/admin/eliminar/:id', (req, res) => {
    db.run("DELETE FROM firmantes WHERE documento_id = ?", [req.params.id], () => {
        db.run("DELETE FROM documentos WHERE id = ?", [req.params.id], () => res.sendStatus(200));
    });
});

// --- LOGIN Y BANDEJA ---
app.get('/login', (req, res) => {
    res.send(`
    <body style="font-family:sans-serif; background:#f4f7f6; display:flex; justify-content:center; align-items:center; height:100vh;">
        <form action="/auth" method="POST" style="background:white; padding:40px; border-radius:16px; box-shadow:0 10px 25px rgba(0,0,0,0.05); width:320px; text-align:center;">
            <div style="background:#d4ea6b; width:50px; height:50px; border-radius:12px; margin:0 auto 20px; display:flex; align-items:center; justify-content:center; font-weight:bold;">C</div>
            <h3 style="margin-bottom:20px;">Consabfirma</h3>
            <input type="text" name="dni" placeholder="DNI" required style="width:100%; padding:12px; margin-bottom:10px; border:1px solid #ddd; border-radius:8px;">
            <input type="password" name="password" placeholder="Contraseña" required style="width:100%; padding:12px; margin-bottom:20px; border:1px solid #ddd; border-radius:8px;">
            <button type="submit" style="width:100%; padding:12px; background:#d4ea6b; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">ACCEDER</button>
        </form>
    </body>`);
});

app.post('/auth', (req, res) => {
    const { dni, password } = req.body;
    db.get("SELECT * FROM usuarios WHERE dni = ? AND password = ?", [dni, password], (err, user) => {
        if (user) {
            if (user.rol === 'admin' || user.rol === 'superadmin') {
                res.redirect(`/admin/${user.dni}`);
            } else {
                res.redirect(`/bandeja/${user.dni}`);
            }
        } else {
            res.send('<script>alert("Error: Usuario o contraseña incorrectos"); window.location.href="/login";</script>');
        }
    });
});

app.get('/bandeja/:dni', (req, res) => {
    const dni = req.params.dni;
    const sql = `
        SELECT d.* FROM documentos d 
        JOIN firmantes f ON d.id = f.documento_id 
        WHERE f.dni_firmante = ? AND f.estado_firma = 'pendiente'
        AND (f.orden = 1 OR NOT EXISTS (SELECT 1 FROM firmantes f2 WHERE f2.documento_id = d.id AND f2.orden < f.orden AND f2.estado_firma = 'pendiente'))`;
    
    db.all(sql, [dni], (err, docs) => {
        res.send(`
            <body style="font-family:sans-serif; margin:0; display:flex; height:100vh; background:#f8fafc;">
                <div style="width:300px; border-right:1px solid #e2e8f0; padding:25px; background:white;">
                    <h4 style="color:#1a1d23; font-weight:bold;">Consabfirma</h4>
                    <p style="font-size:0.8rem; color:#64748b;">Hola, <b>${dni}</b></p>
                    <hr>
                    <nav style="margin-bottom:20px;">
                         <a href="/login" style="text-decoration:none; color:#ef4444; font-size:0.85rem; font-weight:bold;"><i class="bi bi-box-arrow-left"></i> Salir</a>
                    </nav>
                    <h6 style="font-size:0.7rem; color:#94a3b8; text-uppercase; letter-spacing:1px;">Pendientes de firma</h6>
                    ${(docs || []).map(d => `<div onclick="cargarVisor('/preparados/${path.basename(d.ruta_trabajo)}', '${d.id}')" style="padding:12px; border-radius:8px; cursor:pointer; margin-bottom:8px; background:#f1f5f9; font-size:0.9rem;">${d.nombre}</div>`).join('')}
                    ${(docs && docs.length === 0) ? '<p class="small text-muted">No tienes firmas pendientes.</p>' : ''}
                </div>
                <div style="flex:1; position:relative; background:#cbd5e1;">
                    <iframe id="v" style="width:100%; height:100%; border:none;"></iframe>
                    <a id="f" style="position:absolute; bottom:30px; right:30px; background:#d4ea6b; padding:15px 40px; border-radius:50px; font-weight:bold; text-decoration:none; color:black; display:none; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">FIRMAR DOCUMENTO</a>
                </div>
                <script>
                    function cargarVisor(ruta, id) {
                        document.getElementById('v').src = ruta;
                        const btn = document.getElementById('f');
                        btn.style.display = 'block';
                        btn.href = '/firmar/' + id + '?dni=${dni}';
                    }
                </script>
            </body>`);
    });
});

app.get('/firmar/:id', (req, res) => {
    res.send(`<body style="text-align:center; padding:100px; font-family:sans-serif; background:#f4f7f6;">
        <div style="background:white; display:inline-block; padding:40px; border-radius:16px;">
            <h3>¿Confirmas la firma del documento?</h3>
            <p style="color:gray">Esta acción aplicará tu sello digital legal en el PDF.</p>
            <button onclick="location.href='/simular-firma/${req.params.id}?dni=${req.query.dni}'" style="padding:15px 40px; background:#d4ea6b; border:none; border-radius:8px; font-weight:bold; cursor:pointer; font-size:1.1rem;">SÍ, FIRMAR AHORA</button>
            <br><br><a href="javascript:history.back()" style="color:gray; text-decoration:none;">Cancelar</a>
        </div>
    </body>`);
});

app.get('/simular-firma/:id', async (req, res) => {
    const docId = req.params.id;
    const dni = req.query.dni;

    db.get("SELECT u.nombre, u.apellidos, u.cargo, d.ruta_trabajo, d.nombre as docNombre FROM usuarios u, documentos d WHERE u.dni = ? AND d.id = ?", [dni, docId], async (err, data) => {
        if (!data) return res.send("Error");

        try {
            const pdfBytes = fs.readFileSync(data.ruta_trabajo);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const firstPage = pdfDoc.getPages()[0];
            const { height } = firstPage.getSize();

            db.get("SELECT COUNT(*) as total FROM firmantes WHERE documento_id = ? AND estado_firma = 'firmado'", [docId], async (err, row) => {
                const yBase = height - 50 - ((row ? row.total : 0) * 110); 

                firstPage.drawRectangle({ x: 15, y: yBase - 90, width: 220, height: 95, color: rgb(0.97, 0.98, 0.95), borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.5 });
                firstPage.drawText(`DOCUMENTO FIRMADO ELECTRÓNICAMENTE`, { x: 20, y: yBase - 15, size: 7 });
                firstPage.drawText(`${data.nombre} ${data.apellidos}`, { x: 20, y: yBase - 35, size: 10 });
                firstPage.drawText(`Cargo: ${data.cargo || 'Interviniente'}`, { x: 20, y: yBase - 50, size: 8 });
                firstPage.drawText(`ID: ${dni}`, { x: 20, y: yBase - 65, size: 7 });
                firstPage.drawText(`Fecha: ${new Date().toLocaleString()}`, { x: 20, y: yBase - 80, size: 7 });

                const pdfModificado = await pdfDoc.save();
                fs.writeFileSync(data.ruta_trabajo, pdfModificado);

                db.run("UPDATE firmantes SET estado_firma = 'firmado', fecha_firma = CURRENT_TIMESTAMP WHERE documento_id = ? AND dni_firmante = ?", [docId, dni], () => {
                    db.get("SELECT dni_firmante FROM firmantes WHERE documento_id = ? AND estado_firma = 'pendiente' ORDER BY orden ASC LIMIT 1", [docId], (err, next) => {
                        if (next) {
                            enviarAvisoFirma(next.dni_firmante, data.docNombre);
                        } else {
                            db.run("UPDATE documentos SET estado = 'firmado' WHERE id = ?", [docId]);
                        }
                        res.redirect(`/bandeja/${dni}`);
                    });
                });
            });
        } catch (e) {
            console.error(e);
            res.send("Error al procesar el PDF.");
        }
    });
});

app.listen(port, () => console.log(`🚀 Servidor en http://localhost:${port}`));