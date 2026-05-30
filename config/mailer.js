const nodemailer = require('nodemailer');
const db = require('../database'); // Importamos la conexión a la DB

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'tu-email@gmail.com', 
        pass: 'tu-app-password'      
    }
});

const enviarAvisoFirma = (dni, nombreDoc) => {
    db.get("SELECT email, nombre FROM usuarios WHERE dni = ?", [dni], (err, user) => {
        if (user && user.email) {
            const mailOptions = {
                from: '"Consabfirma" <tu-email@gmail.com>',
                to: user.email,
                subject: `Pendiente de firma: ${nombreDoc}`,
                html: `<h3>Hola ${user.nombre},</h3>
                       <p>Tienes un nuevo documento pendiente de firma en Consabfirma: <b>${nombreDoc}</b>.</p>
                       <p>Accede a tu portal para firmar.</p>`
            };
            transporter.sendMail(mailOptions, (error) => {
                if (error) console.log("❌ Error enviando email:", error);
                else console.log(`📧 Aviso enviado a ${user.email}`);
            });
        }
    });
};

module.exports = { enviarAvisoFirma };