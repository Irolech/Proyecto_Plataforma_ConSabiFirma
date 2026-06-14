const nodemailer = require('nodemailer');
const db = require('../database'); // 🔄 Apuntamos al archivo database.js

// 🛠️ CONFIGURACIÓN DE TRANSPORTE
// En desarrollo usamos Maildev (localhost). En producción cambiaremos a Gmail.
const transporter = nodemailer.createTransport({
    host: 'localhost',
    port: 1025,
    ignoreTLS: true
    /* // 🚀 DESCOMENTA ESTE BLOQUE CUANDO PASES A PRODUCCIÓN CON GMAIL:
    service: 'gmail',
    auth: {
        user: 'tu-email-dedicado@gmail.com', 
        pass: 'tu-app-password-de-16-caracteres'      
    }
    */
});

/**
 * Envía un correo de aviso de firma, aplicando un diseño limpio y registrando la traza en la BD.
 * @param {string} dni - DNI del usuario firmante.
 * @param {string} nombreDoc - Nombre o título del documento.
 * @param {number} documentoId - ID único del documento (necesario para la tabla notificaciones).
 */
const enviarAvisoFirma = (dni, nombreDoc, documentoId) => {
    // 🛡️ BARRERA DE SEGURIDAD: Comprobamos qué datos están entrando realmente
    if (!documentoId) {
        console.error(`❌ ERROR CRÍTICO EN MAILER: Se intentó enviar aviso a ${dni} para "${nombreDoc}", pero documentoId es nulo o indefinido.`);
        return; // Cortamos la ejecución aquí para evitar el error SQLITE_CONSTRAINT
    }

    // Buscamos el email y el nombre del firmante en la base de datos
    db.get("SELECT email, nombre FROM usuarios WHERE dni = ?", [dni], (err, user) => {
        if (err) {
            console.error("❌ Error al buscar datos de usuario para notificación:", err.message);
            return;
        }

        if (user && user.email) {
            const asunto = `[ConSabiFirma] Pendiente de firma: ${nombreDoc}`;
            const tipo = 'AVISO_FIRMA';
            const remitente = '"ConSabiFirma (No Responder)" <noreply-consabifirma@conservatorio.es>';

            // 1. Registrar la notificación en la base de datos en estado PENDIENTE
            const sqlInsert = `
                INSERT INTO notificaciones (documento_id, usuario_dni, email_destinatario, tipo, asunto)
                VALUES (?, ?, ?, ?, ?)
            `;

            db.run(sqlInsert, [documentoId, dni, user.email, tipo, asunto], function (errInsert) {
                if (errInsert) {
                    console.error("❌ Error al registrar la traza de notificación en la BD:", errInsert.message);
                    return;
                }

                const notificacionId = this.lastID; // Capturamos la ID del registro de correo
                console.log(`✉️ Notificación #${notificacionId} registrada (PENDIENTE). Enviando...`);

                // 2. Configuración estética y contenido del correo
                const mailOptions = {
                    from: remitente,
                    to: user.email,
                    subject: asunto,
                    html: `
                        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px; overflow: hidden;">
                            <div style="background-color: #1a5276; padding: 20px; text-align: center; color: white;">
                                <h2 style="margin: 0; font-size: 20px;">Plataforma ConSabiFirma</h2>
                            </div>
                            <div style="padding: 25px; background-color: #ffffff;">
                                <p style="font-size: 16px; margin-top: 0;">Hola <strong>${user.nombre}</strong>,</p>
                                <p>Se ha generado un nuevo documento en el sistema que requiere tu **firma electrónica**:</p>
                                
                                <div style="background-color: #f4f6f7; border-left: 4px solid #1a5276; padding: 15px; margin: 20px 0; font-style: italic;">
                                    <strong>Documento:</strong> ${nombreDoc}
                                </div>
                                
                                <p>Por favor, accede a tu panel de usuario de la plataforma para proceder a su revisión y firma.</p>
                                
                                <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
                                    <a href="http://localhost:3000" style="background-color: #1a5276; color: white; padding: 12px 25px; text-align: center; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">Acceder a ConSabiFirma</a>
                                </div>
                            </div>
                            <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 11px; color: #7f8c8d; border-top: 1px solid #eeeeee;">
                                <p style="margin: 0;">Conservatorio Profesional de Música de Sabiñánigo</p>
                                <p style="margin: 5px 0 0 0;">Este es un aviso automático desatendido. Por favor, no respondas a esta dirección de correo.</p>
                            </div>
                        </div>
                    `
                };

                // 3. Enviar el correo real a través del transporte (Maildev interceptará esto)
                transporter.sendMail(mailOptions, (errorMail, info) => {
                    if (errorMail) {
                        console.error(`❌ Error en el envío del email (Notificación #${notificacionId}):`, errorMail.message);

                        // Si falla, guardamos el log del error y marcamos como FALLIDO
                        const sqlUpdateError = `
                            UPDATE notificaciones 
                            SET estado = 'FALLIDO', intentos = intentos + 1, error_log = ? 
                            WHERE id = ?
                        `;
                        db.run(sqlUpdateError, [errorMail.message, notificacionId]);
                        return;
                    }

                    // Si todo va bien, actualizamos el estado en la base de datos a ENVIADO
                    console.log(`📧 Aviso de firma enviado con éxito a ${user.email} (Notificación #${notificacionId})`);

                    const sqlUpdateExito = `
                        UPDATE notificaciones 
                        SET estado = 'ENVIADO', intentos = intentos + 1, fecha_envio = (DATETIME('now', 'localtime'))
                        WHERE id = ?
                    `;
                    db.run(sqlUpdateExito, [notificacionId]);
                });
            });
        } else {
            console.log(`⚠️ No se pudo enviar el correo: El usuario con DNI ${dni} no existe o no tiene un email configurado.`);
        }
    });
};

module.exports = { enviarAvisoFirma };