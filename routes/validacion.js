const express = require('express');
const router = express.Router();
const db = require('../database');
const path = require('path');
const fs = require('fs');

// 🔍 ENDPOINT 1: Consultar los metadatos públicos del documento usando el CSV
router.get('/consultar/:csv', (req, res) => {
    // Limpiamos el input para evitar discrepancias de formato
    const csvLimpio = req.params.csv.trim().toUpperCase();

    // Recuperamos los metadatos esenciales para la auditoría de validación pública
    db.get("SELECT id, nombre, estado, fecha_creacion FROM documentos WHERE csv = ?", [csvLimpio], (err, doc) => {
        if (err) {
            console.error("❌ Error al consultar CSV en base de datos:", err);
            return res.status(500).json({ success: false, error: "Error interno del servidor al verificar el código." });
        }
        if (!doc) {
            return res.status(404).json({ success: false, error: "No se ha encontrado ningún documento asociado a este Código Seguro de Verificación (CSV)." });
        }

        // Devolvemos los datos para que el portal público pinte la tarjeta de éxito
        res.json({ success: true, documento: doc });
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

        // 🛡️ CONTROL DE SEGURIDAD SEMÁNTICO: No se puede descargar una copia auténtica si no está completamente firmado
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