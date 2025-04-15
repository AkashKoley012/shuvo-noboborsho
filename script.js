const canvas = document.getElementById("mosaicCanvas");
const ctx = canvas.getContext("2d");

let tileSize = 10;
let gridCols = 100;
let gridRows = 100;
let tiles = [];
let tileImages = [];
let scale = 1;
let originX = 0;
let originY = 0;
let isDragging = false;
let lastX, lastY;
let bgImage;

const randomInt = Math.floor(Math.random() * 26) + 1;

Promise.all([
    fetch(`updateImg/data/img${randomInt}.txt`)
        .then((res) => res.text())
        .then((data) => {
            const lines = data.trim().split("\n");
            [gridCols, gridRows] = lines[0].split(" ").map(Number);
            tiles = lines.slice(1);
            return Promise.all(tiles.map((src) => loadImage("updateImg/images/" + src)));
        }),
    loadImage(`img/img${randomInt}.jpg`), // background image
]).then(([images, bg]) => {
    tileImages = images;
    bgImage = bg;
    draw();
});

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = reject;
    });
}

function draw() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx.setTransform(scale, 0, 0, scale, originX, originY);
    ctx.clearRect(-originX / scale, -originY / scale, canvas.width / scale, canvas.height / scale);

    // ✅ Draw full canvas background
    if (bgImage) {
        ctx.globalAlpha = 1.0;
        ctx.drawImage(bgImage, -originX / scale, -originY / scale, canvas.width / scale, canvas.height / scale);
    }

    // 🧊 Transparent tile images
    ctx.globalAlpha = 0.7;
    const tileWidth = canvas.width / gridCols;
    const tileHeight = canvas.height / gridRows;

    for (let i = 0; i < tileImages.length; i++) {
        let col = i % gridCols;
        let row = Math.floor(i / gridCols);
        let x = col * tileWidth;
        let y = row * tileHeight;
        ctx.drawImage(tileImages[i], x, y, tileWidth, tileHeight);
    }

    ctx.globalAlpha = 1.0;
}

// Interactivity
canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.style.cursor = "grabbing";
});

canvas.addEventListener("mousemove", (e) => {
    if (isDragging) {
        originX += e.clientX - lastX;
        originY += e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        draw();
    }
});

canvas.addEventListener("mouseup", () => {
    isDragging = false;
    canvas.style.cursor = "grab";
});

canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const scaleAmount = -e.deltaY * 0.001;
    const mouseX = e.clientX - canvas.offsetLeft - originX;
    const mouseY = e.clientY - canvas.offsetTop - originY;

    const newScale = scale * (1 + scaleAmount);
    originX -= mouseX * (newScale / scale - 1);
    originY -= mouseY * (newScale / scale - 1);
    scale = newScale;
    draw();
});

window.addEventListener("resize", draw);
