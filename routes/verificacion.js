const express = require('express');
const router = express.Router();
const db = require('../database');
const path = require('path');
const fs = require('fs');

// 🛡️ Helper: Enmascara el DNI para la vista pública (Ej: 12****78X)
function enmascararDNI(dni) {
    if (!dni || dni.length < 5) return '***';
    return dni.substring(0, 2) + '****' + dni.substring(dni.length - 2);
}

// RUTA PÚBLICA: Verificación individual de firma por UUID
router.get('/firma/:uuid', (req, res) => {
    const { uuid } = req.params;

    const sql = `
        SELECT fe.*, d.estado, d.csv
        FROM firmas_evidencias fe
        JOIN documentos d ON fe.documento_id = d.id
        WHERE fe.uuid = ?
    `;

    db.get(sql, [uuid], (err, evidencia) => {
        if (err || !evidencia) {
            return res.status(404).send(`
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <title>Evidencia no encontrada - Conservatorio Profesional de Sabiñánigo</title>
                    <link rel="stylesheet" href="/css/style.css">
                </head>
                <body style="display:flex; justify-content:center; align-items:center; height:100vh; background:#f8fafc; font-family: system-ui, -apple-system, sans-serif; margin:0;">
                    <div style="text-align:center; background:white; padding:40px; border-radius:12px; box-shadow:0 10px 25px -5px rgba(0,0,0,0.08); max-width:500px; width:90%; border:1px solid #e2e8f0;">
                        <div style="font-size: 1.15rem; font-weight: 800; color: #1e293b; margin-bottom: 2px;">Conservatorio Profesional de Sabiñánigo</div>
                        <div style="font-size: 0.85rem; color: #64748b; font-weight: 500; margin-bottom: 24px;">Sistema de firma electrónica - Verificación de firmas</div>
                        <span style="font-size:3rem; display:block; margin-bottom:10px;">⚠️</span>
                        <h2 style="margin:0 0 8px 0; color:#0f172a; font-size:1.2rem;">Evidencia de Firma No Encontrada</h2>
                        <p style="color:#64748b; font-size:0.9rem; margin:0;">El identificador de firma especificado no existe o no se encuentra registrado en el sistema.</p>
                    </div>
                </body>
                </html>
            `);
        }

        const fechaFirmaObj = new Date(evidencia.fecha_firma);
        const fechaFormateada = fechaFirmaObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const horaFormateada = fechaFirmaObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dniProtegido = enmascararDNI(evidencia.usuario_dni);

        res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Cotejo de Firma Electrónica - Conservatorio Profesional de Sabiñánigo</title>
            <link rel="stylesheet" href="/css/style.css">
            <style>
                body { 
                    background: #f1f5f9; 
                    font-family: system-ui, -apple-system, sans-serif; 
                    margin: 0; 
                    min-height: 100vh; 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    padding: 20px;
                    box-sizing: border-box;
                }
                .card-verify { 
                    width: 100%; 
                    max-width: 780px; 
                    background: white; 
                    border-radius: 12px; 
                    padding: 30px 35px; 
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08); 
                    border: 1px solid #e2e8f0; 
                }
                .header-centered { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 18px; }
                .title-main { font-size: 1.3rem; font-weight: 800; color: #1e293b; margin: 0; line-height: 1.2; }
                .title-sub { font-size: 0.88rem; color: #64748b; font-weight: 500; margin-top: 4px; margin-bottom: 12px; }
                .badge-valid { background: #dcfce7; color: #166534; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px; }
                .data-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 0.95rem; }
                .data-label { color: #64748b; font-weight: 500; }
                .data-value { font-weight: 600; color: #0f172a; text-align: right; }
                .btn-actions-container {
                    display: flex;
                    gap: 12px;
                    margin-top: 24px;
                }
                @media (max-width: 520px) {
                    .btn-actions-container {
                        flex-direction: column;
                    }
                }
            </style>
        </head>
        <body>
            <div class="card-verify">
                <div class="header-centered">
                    <h1 class="title-main">Conservatorio Profesional de Sabiñánigo</h1>
                    <div class="title-sub">Sistema de firma electrónica - Verificación de firmas</div>
                    <div class="badge-valid">✓ Firma Válida y Registrada</div>
                </div>

                <h2 style="margin: 0 0 3px 0; font-size: 1.1rem; color: #334155;">Información de la Firma Electrónica</h2>
                <p style="color: #64748b; font-size: 0.83rem; margin-bottom: 14px;">Evidencia de sellado digital registrada en la plataforma institucional.</p>

                <div class="data-row">
                    <span class="data-label">Identificador (DNI):</span>
                    <span class="data-value" style="font-family: monospace;">${dniProtegido}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">Titular de la firma:</span>
                    <span class="data-value">${evidencia.nombre_firmante}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">Rol / Cargo:</span>
                    <span class="data-value">${evidencia.cargo || 'Firmante autorizado'}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">Fecha de firma:</span>
                    <span class="data-value">${fechaFormateada}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">Hora exacta (RFC 3161):</span>
                    <span class="data-value">${horaFormateada}</span>
                </div>
                <div class="data-row" style="border-bottom: none;">
                    <span class="data-label">ID Único de Evidencia:</span>
                    <span class="data-value" style="font-family: monospace; font-size: 0.8rem; color: #64748b;">${evidencia.uuid}</span>
                </div>

                <div class="btn-actions-container">
                    <a href="/verificar/firma/${evidencia.uuid}/descargar-xml" class="btn btn-primary" style="flex: 2; text-align: center; text-decoration: none; padding: 12px; border-radius: 6px; font-size: 0.9rem; font-weight: 600; background: #0284c7; color: white;">
                        🛡️ Descarga de la firma
                    </a>
                    <button type="button" onclick="cerrarOVolver()" class="btn btn-outline" style="flex: 1; text-align: center; padding: 12px; border-radius: 6px; font-size: 0.9rem; font-weight: 600; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; cursor: pointer;">
                        🚪 Salir
                    </button>
                </div>
            </div>

            <script>
                function cerrarOVolver() {
                    window.close();
                    // Respaldos en caso de que el navegador bloquee window.close()
                    setTimeout(() => {
                        if (window.history.length > 1) {
                            window.history.back();
                        } else {
                            window.location.href = '/';
                        }
                    }, 150);
                }
            </script>
        </body>
        </html>
        `);
    });
});

// RUTA DE DESCARGA: Obtiene el PDF firmado
router.get('/firma/:uuid/descargar-pades', (req, res) => {
    const { uuid } = req.params;

    db.get("SELECT d.archivo_firmado, d.nombre FROM firmas_evidencias fe JOIN documentos d ON fe.documento_id = d.id WHERE fe.uuid = ?", [uuid], (err, row) => {
        if (err || !row || !row.archivo_firmado) {
            return res.status(404).send("Documento de firma no disponible para descarga.");
        }

        const rutaAbsoluta = path.resolve(row.archivo_firmado);
        if (fs.existsSync(rutaAbsoluta)) {
            res.download(rutaAbsoluta, `Firma_${row.nombre}.pdf`);
        } else {
            res.status(404).send("El archivo físico no fue encontrado en el servidor.");
        }
    });
});

// RUTA DE DESCARGA (CON DEPURA): Obtiene la evidencia de firma en XML (XAdES)
router.get('/firma/:uuid/descargar-xml', (req, res) => {
    const { uuid } = req.params;

    const sql = `
        SELECT fe.xml_firma, fe.archivo_xml, d.nombre 
        FROM firmas_evidencias fe 
        JOIN documentos d ON fe.documento_id = d.id 
        WHERE fe.uuid = ?
    `;

    db.get(sql, [uuid], (err, row) => {
        if (err) {
            console.error('❌ Error SQL en /descargar-xml:', err.message);
            return res.status(500).send(`Error en la base de datos: ${err.message}`);
        }

        if (!row) {
            console.warn(`⚠️ No se encontró ningún registro para el UUID: ${uuid}`);
            return res.status(404).send("No se encontró ningún registro de firma para este UUID.");
        }

        // 1. Intentar servir el archivo físico si existe en disco
        if (row.archivo_xml) {
            const rutaAbsoluta = path.resolve(row.archivo_xml);
            if (fs.existsSync(rutaAbsoluta)) {
                return res.download(rutaAbsoluta, `Firma_${row.nombre}.xml`);
            }
            console.warn(`⚠️ Se especificó la ruta en archivo_xml (${row.archivo_xml}) pero el archivo no existe en el disco.`);
        }

        // 2. Intentar servir el string XML almacenado en la columna de la BD
        if (row.xml_firma) {
            res.setHeader('Content-Type', 'application/xml; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="Firma_${row.nombre}.xml"`);
            return res.status(200).send(row.xml_firma);
        }

        console.warn(`⚠️ Registro encontrado para UUID ${uuid}, pero ambos campos (xml_firma y archivo_xml) están vacíos o son NULL.`);
        return res.status(404).send("La firma existe pero no contiene datos XML (los campos xml_firma y archivo_xml están vacíos).");
    });
});

module.exports = router;