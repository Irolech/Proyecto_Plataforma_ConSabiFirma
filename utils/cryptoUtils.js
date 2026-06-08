const crypto = require('crypto');

/**
 * Genera un Código Seguro de Verificación (CSV) único y seguro.
 * Formato resultante: SABI-XXXX-XXXX-XXXX
 */
function generarCSV(prefijo = 'SABI') {
    // Generamos 6 bytes de entropía criptográfica (muy seguro y difícil de adivinar)
    const bytesAleatorios = crypto.randomBytes(6).toString('hex').toUpperCase();

    // Dividimos la cadena generada en bloques legibles de 4 caracteres
    const bloques = bytesAleatorios.match(/.{1,4}/g).join('-');

    return `${prefijo}-${bloques}`;
}

module.exports = { generarCSV };