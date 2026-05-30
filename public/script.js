const canvas = document.getElementById('signature-pad');
const ctx = canvas.getContext('2d');
let drawing = false;

// Ajustar el tamaño del lienzo a su contenedor
function resizeCanvas() {
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = 200;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Lógica de dibujo
function startDrawing(e) {
    drawing = true;
    draw(e);
}

function stopDrawing() {
    drawing = false;
    ctx.beginPath();
}

function draw(e) {
    if (!drawing) return;
    
    // Detectar si es ratón o pantalla táctil
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

// Eventos de ratón
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);

// Eventos de pantalla táctil (Móviles)
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e.touches[0]); });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e.touches[0]); });
canvas.addEventListener('touchend', stopDrawing);

// Botón de limpiar
document.getElementById('clear').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});