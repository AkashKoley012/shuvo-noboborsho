const canvas = document.getElementById("mosaicCanvas");
const ctx = canvas.getContext("2d");

let tileSize = 10;
let gridCols = 100;
let gridRows = 100;
let tiles = [];
let tileImages = [];
let scale = 2;
let originX = 0;
let originY = 0;
let isDragging = false;
let lastX, lastY;
let bgImage;

const randomInt = Math.floor(Math.random() * 26);

const imageCache = {}; // To store already loaded images

let tilesToDraw = []; // Queue of [image, x, y, w, h]
let currentTileIndex = 0;

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = reject;
    });
}

Promise.all([
    loadImage(`img/img${randomInt}.jpg`), // background image
]).then(([bg]) => {
    bgImage = bg;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.setTransform(scale, 0, 0, scale, originX, originY);

    // Step 1: Clear the canvas
    ctx.clearRect(-originX / scale, -originY / scale, canvas.width / scale, canvas.height / scale);

    ctx.globalAlpha = 1.0;
    ctx.drawImage(bgImage, 0, 0, canvas.width / scale, canvas.height / scale);
});

function draw() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Apply pan and zoom transform
    // ctx.setTransform(scale, 0, 0, scale, originX, originY);

    // Clear the visible area (considering pan/zoom)
    ctx.clearRect(-originX / scale, -originY / scale, canvas.width / scale, canvas.height / scale);

    // ✅ Draw background WITHIN transformed context so it zooms/pans
    if (bgImage) {
        ctx.globalAlpha = 1.0;
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    }

    ctx.globalAlpha = 1.0;
}

canvas.addEventListener("wheel", (e) => {
    e.preventDefault();

    const scaleAmount = -e.deltaY * 0.001;
    const newScale = scale * (1 + scaleAmount);

    // Calculate current visible size of the tile area
    const mosaicWidth = gridCols * (canvas.width / gridCols) * newScale;
    const mosaicHeight = gridRows * (canvas.height / gridRows) * newScale;

    // Only zoom out if mosaic is still larger than canvas
    if ((mosaicWidth >= canvas.width && mosaicHeight >= canvas.height) || newScale > scale) {
        const mouseX = e.clientX - canvas.offsetLeft - originX;
        const mouseY = e.clientY - canvas.offsetTop - originY;

        originX -= mouseX * (newScale / scale - 1);
        originY -= mouseY * (newScale / scale - 1);
        scale = newScale;

        console.log(originX, originY, scale);
        draw();
    }
});
