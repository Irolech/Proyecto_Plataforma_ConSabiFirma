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
                                <p>Se ha generado un nuevo documento en el sistema que requiere tu firma electrónica:</p>
                                
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

                // 3. Enviar el correo real a través del transporte
                transporter.sendMail(mailOptions, (errorMail, info) => {
                    if (errorMail) {
                        console.error(`❌ Error en el envío del email (Notificación #${notificacionId}):`, errorMail.message);
                        const sqlUpdateError = `
                            UPDATE notificaciones 
                            SET estado = 'FALLIDO', intentos = intentos + 1, error_log = ? 
                            WHERE id = ?
                        `;
                        db.run(sqlUpdateError, [errorMail.message, notificacionId]);
                        return;
                    }

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

/**
 * Envía la copia auténtica (documento finalizado) a un destinatario (interno o externo).
 * @param {string} emailDestinatario - Correo del destinatario.
 * @param {string} nombreDoc - Título del documento.
 * @param {string} mensajePersonalizado - Mensaje específico o null/vacío para usar el estándar.
 * @param {string} archivoPath - Ruta del archivo PDF en el servidor para adjuntarlo.
 * @param {number} documentoId - ID del documento para registrarlo en la tabla notificaciones.
 */
const enviarCopiaFinal = (emailDestinatario, nombreDoc, mensajePersonalizado, archivoPath, documentoId) => {
    if (!emailDestinatario || !documentoId || !archivoPath) {
        console.error(`❌ ERROR CRÍTICO EN MAILER: Faltan datos para enviar la copia final de "${nombreDoc}". ID o email nulos.`);
        return;
    }

    const asunto = `El Conservatorio de Sabiñánigo envía el documento: ${nombreDoc}`;
    const tipo = 'DOCUMENTO_FINALIZADO';
    const remitente = '"ConSabiFirma (No Responder)" <noreply-consabifirma@conservatorio.es>';

    // Lógica del mensaje: Si hay personalizado se usa, si no, se usa el estándar de la institución
    const textoCuerpo = mensajePersonalizado && mensajePersonalizado.trim() !== ''
        ? mensajePersonalizado
        : `El Conservatorio Profesional de Música de Sabiñánigo le envía copia auténtica del documento: ${nombreDoc}.`;

    // 1. Registrar notificación en BD (dejamos usuario_dni en null porque podría ser un contacto externo)
    const sqlInsert = `
        INSERT INTO notificaciones (documento_id, email_destinatario, tipo, asunto)
        VALUES (?, ?, ?, ?)
    `;

    db.run(sqlInsert, [documentoId, emailDestinatario, tipo, asunto], function (errInsert) {
        if (errInsert) {
            console.error("❌ Error al registrar traza de copia final en BD:", errInsert.message);
            return;
        }

        const notificacionId = this.lastID;
        console.log(`✉️ Notificación Copia Auténtica #${notificacionId} registrada (PENDIENTE). Enviando a ${emailDestinatario}...`);

        // 2. Configuración estética y documento adjunto
        const mailOptions = {
            from: remitente,
            to: emailDestinatario,
            subject: asunto,
            html: `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px; overflow: hidden;">
                    <div style="background-color: #1a5276; padding: 20px; text-align: center; color: white;">
                        <h2 style="margin: 0; font-size: 20px;">Plataforma ConSabiFirma</h2>
                    </div>
                    <div style="padding: 25px; background-color: #ffffff;">
                        <h3 style="color: #1a5276; margin-top: 0;">Notificación de archivo: ${nombreDoc}</h3>
                        <p style="font-size: 16px; line-height: 1.6;">${textoCuerpo}</p>
                        <p style="font-size: 16px;">Un saludo,</p>
                        
                        <div style="background-color: #f4f6f7; border-left: 4px solid #1a5276; padding: 15px; margin: 20px 0; font-style: italic;">
                            <strong>📄 Documento adjunto:</strong> ${nombreDoc}.pdf
                        </div>
                        
                        <p style="font-size: 14px; color: #555;">Puede descargar la copia auténtica del documento en los archivos adjuntos de este correo.</p>
                    </div>
                    <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 11px; color: #7f8c8d; border-top: 1px solid #eeeeee;">
                        <p style="margin: 0;">Conservatorio Profesional de Música de Sabiñánigo</p>
                        <p style="margin: 5px 0 0 0;">Este es un mensaje automático del sistema de firmas. Por favor, no responda a esta dirección.</p>
                    </div>
                </div>
            `,
            attachments: [
                {
                    filename: `${nombreDoc}.pdf`,
                    path: archivoPath
                }
            ]
        };

        // 3. Envío y actualización de estado
        transporter.sendMail(mailOptions, (errorMail, info) => {
            if (errorMail) {
                console.error(`❌ Error enviando copia final (Notificación #${notificacionId}):`, errorMail.message);
                const sqlUpdateError = `UPDATE notificaciones SET estado = 'FALLIDO', intentos = intentos + 1, error_log = ? WHERE id = ?`;
                db.run(sqlUpdateError, [errorMail.message, notificacionId]);
                return;
            }

            console.log(`✅ Copia auténtica enviada con éxito a ${emailDestinatario} (Notificación #${notificacionId})`);
            const sqlUpdateExito = `UPDATE notificaciones SET estado = 'ENVIADO', intentos = intentos + 1, fecha_envio = (DATETIME('now', 'localtime')) WHERE id = ?`;
            db.run(sqlUpdateExito, [notificacionId]);
        });
    });
};

/**
 * 🚀 NUEVO: Envía una alerta ligera al creador del documento informando que el circuito ha finalizado.
 * @param {string} emailDestinatario - Correo del administrador/creador.
 * @param {string} nombreDoc - Título del documento.
 * @param {number} documentoId - ID del documento para registrarlo en la tabla notificaciones.
 */
const enviarAlertaFinalizacion = (emailDestinatario, nombreDoc, documentoId) => {
    if (!emailDestinatario || !documentoId) {
        console.error(`❌ ERROR CRÍTICO EN MAILER: Faltan datos para enviar la alerta de finalización de "${nombreDoc}".`);
        return;
    }

    const asunto = `[ConSabiFirma] Circuito Completado: ${nombreDoc}`;
    const tipo = 'ALERTA_CREADOR';
    const remitente = '"ConSabiFirma (No Responder)" <noreply-consabifirma@conservatorio.es>';

    // 1. Registrar notificación en BD
    const sqlInsert = `
        INSERT INTO notificaciones (documento_id, email_destinatario, tipo, asunto)
        VALUES (?, ?, ?, ?)
    `;

    db.run(sqlInsert, [documentoId, emailDestinatario, tipo, asunto], function (errInsert) {
        if (errInsert) {
            console.error("❌ Error al registrar traza de alerta creador en BD:", errInsert.message);
            return;
        }

        const notificacionId = this.lastID;
        console.log(`✉️ Alerta de Finalización #${notificacionId} registrada (PENDIENTE). Enviando a ${emailDestinatario}...`);

        // 2. Configuración estética (Sin adjuntos y con botón de acceso)
        const mailOptions = {
            from: remitente,
            to: emailDestinatario,
            subject: asunto,
            html: `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px; overflow: hidden;">
                    <div style="background-color: #1a5276; padding: 20px; text-align: center; color: white;">
                        <h2 style="margin: 0; font-size: 20px;">Plataforma ConSabiFirma</h2>
                    </div>
                    <div style="padding: 25px; background-color: #ffffff;">
                        <h3 style="color: #1a5276; margin-top: 0;">Circuito de firmas completado</h3>
                        <p style="font-size: 16px; line-height: 1.6;">El circuito de firmas para el documento <strong>${nombreDoc}</strong> se ha completado con éxito.</p>
                        <p style="font-size: 16px; line-height: 1.6;">Ya puedes acceder a la plataforma para revisar el estado y descargar la copia auténtica si lo necesitas.</p>
                        <p style="font-size: 16px;">Un saludo,</p>
                        
                        <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
                            <a href="http://localhost:3000" style="background-color: #1a5276; color: white; padding: 12px 25px; text-align: center; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">Acceder a ConSabiFirma</a>
                        </div>
                    </div>
                    <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 11px; color: #7f8c8d; border-top: 1px solid #eeeeee;">
                        <p style="margin: 0;">Conservatorio Profesional de Música de Sabiñánigo</p>
                        <p style="margin: 5px 0 0 0;">Este es un aviso automático de la plataforma. Por favor, no responda a esta dirección.</p>
                    </div>
                </div>
            `
        };

        // 3. Envío y actualización de estado
        transporter.sendMail(mailOptions, (errorMail, info) => {
            if (errorMail) {
                console.error(`❌ Error enviando alerta creador (Notificación #${notificacionId}):`, errorMail.message);
                const sqlUpdateError = `UPDATE notificaciones SET estado = 'FALLIDO', intentos = intentos + 1, error_log = ? WHERE id = ?`;
                db.run(sqlUpdateError, [errorMail.message, notificacionId]);
                return;
            }

            console.log(`✅ Alerta de finalización enviada con éxito a ${emailDestinatario} (Notificación #${notificacionId})`);
            const sqlUpdateExito = `UPDATE notificaciones SET estado = 'ENVIADO', intentos = intentos + 1, fecha_envio = (DATETIME('now', 'localtime')) WHERE id = ?`;
            db.run(sqlUpdateExito, [notificacionId]);
        });
    });
};

// 📦 Exportamos las tres funciones para poder usarlas desde otras rutas
module.exports = { enviarAvisoFirma, enviarCopiaFinal, enviarAlertaFinalizacion };