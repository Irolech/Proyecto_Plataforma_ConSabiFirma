const express = require('express');
const router = express.Router();
const db = require('../database');
const path = require('path');
const fs = require('fs');

// 🔍 ENDPOINT 1: Consultar los metadatos públicos del documento usando el CSV
router.get('/consultar/:csv', (req, res) => {
    // Limpiamos el input para evitar discrepancias de formato
    const csvLimpio = req.params.csv.trim().toUpperCase();

    // 1️⃣ Recuperamos los metadatos esenciales del documento
    db.get("SELECT id, nombre, estado, firmantes, firmados_por, fecha_creacion FROM documentos WHERE csv = ?", [csvLimpio], (err, doc) => {
        if (err) {
            console.error("❌ Error al consultar CSV en base de datos:", err);
            return res.status(500).json({ success: false, error: "Error interno del servidor al verificar el código." });
        }
        if (!doc) {
            return res.status(404).json({ success: false, error: "No se ha encontrado ningún documento asociado a este Código Seguro de Verificación (CSV)." });
        }

        // 2️⃣ CAPA A: Intentamos recuperar firmantes desde la tabla explícita 'firmas_documentos'
        const sqlFirmantesTabla = `
            SELECT nombre, cargo 
            FROM firmas_documentos 
            WHERE documento_id = ?
        `;

        db.all(sqlFirmantesTabla, [doc.id], (errFirmas, firmantesTabla) => {
            if (!errFirmas && firmantesTabla && firmantesTabla.length > 0) {
                // Si la tabla secundaria contiene los registros, los usamos directamente
                doc.firmantes = firmantesTabla;
                return res.json({ success: true, documento: doc });
            }

            // 3️⃣ CAPA B (FALLBACK): Si la tabla secundaria está vacía, procesamos los strings de DNIs de la tabla 'documentos'
            // Priorizamos los que ya han firmado efectivos ('firmados_por'). Si está vacío, mostramos el circuito planeado ('firmantes').
            const dnisEfectivos = doc.firmados_por ? doc.firmados_por.split(',').filter(s => s.trim() !== '') : [];
            const dnisPlaneados = doc.firmantes ? doc.firmantes.split(',').filter(s => s.trim() !== '') : [];
            const dnisAMirar = dnisEfectivos.length > 0 ? dnisEfectivos : dnisPlaneados;

            if (dnisAMirar.length === 0) {
                doc.firmantes = [];
                return res.json({ success: true, documento: doc });
            }

            // Construimos una consulta dinámica segura con marcadores (?) para la cláusula IN
            const placeholders = dnisAMirar.map(() => '?').join(',');
            const sqlUsuariosFallback = `
                SELECT (nombre || ' ' || apellidos) AS nombre, cargo 
                FROM usuarios 
                WHERE dni IN (${placeholders})
            `;

            db.all(sqlUsuariosFallback, dnisAMirar, (errUsers, usuariosFirmantes) => {
                if (errUsers) {
                    console.error("❌ Error en el fallback de extracción de firmantes:", errUsers);
                    doc.firmantes = [];
                } else {
                    doc.firmantes = usuariosFirmantes || [];
                }

                // Enviamos la respuesta estructurada de vuelta al frontend
                res.json({ success: true, documento: doc });
            });
        });
    });
});

// 📥 ENDPOINT 2: Descargar la Copia Auténtica visual con pie de firma e indicadores CSV
router.get('/descargar/:csv', (req, res) => {
    const csvLimpio = req.params.csv.trim().toUpperCase();

    // Solicitamos el ID y el estado para validar las restricciones de integridad
    db.get("SELECT id, estado FROM documentos WHERE csv = ?", [csvLimpio], (err, doc) => {
        if (err) {
            console.error("❌ Error en la pre-consulta de descarga de CSV:", err);
            return res.status(500).send("Error interno en el servidor.");
        }

        if (!doc) {
            return res.status(404).send("Código CSV no reconocido en el sistema.");
        }

        // 🛡️ CONTROL DE SEGURIDAD SEMÁNTICO: No se puede descargar si no está completamente firmado ('finalizado')
        if (doc.estado !== 'finalizado') {
            return res.status(403).send("El documento asociado a este CSV se encuentra en tramitación (pendiente de firmas). La Copia Auténtica solo estará disponible una vez finalizado el proceso.");
        }

        // Apuntamos a la carpeta centralizada de almacenamiento (subiendo un nivel desde /routes)
        const rutaArchivo = path.join(__dirname, '../uploads', `copia_autentica_${doc.id}.pdf`);

        if (fs.existsSync(rutaArchivo)) {
            // Forzamos la descarga del flujo binario asignando un nombre limpio y formalizado
            res.download(rutaArchivo, `Copia_Autentica_${csvLimpio}.pdf`, (errDownload) => {
                if (errDownload) {
                    console.error("❌ Error durante la transferencia del PDF al cliente:", errDownload);
                }
            });
        } else {
            console.error(`⚠️ Alerta de integridad: El registro CSV ${csvLimpio} existe en DB pero falta el archivo físico: copia_autentica_${doc.id}.pdf`);
            res.status(404).send("El archivo físico de la copia auténtica no está disponible en el almacenamiento del servidor. Contacte con secretaría.");
        }
    });
});

module.exports = router;