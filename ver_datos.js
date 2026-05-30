const db = require('./database.js');

db.all("SELECT * FROM documentos", [], (err, filas) => {
    console.log("--- DOCUMENTOS REGISTRADOS ---");
    console.table(filas); 
});