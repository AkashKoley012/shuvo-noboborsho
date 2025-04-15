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

const imageCache = {}; // To store already loaded images

let tilesToDraw = []; // Queue of [image, x, y, w, h]
let currentTileIndex = 0;

function queueTilesForDrawing(onComplete, tilesPerFrame = 100) {
    let i = 0;
    const tileWidth = canvas.width / gridCols;
    const tileHeight = canvas.height / gridRows;

    // ctx.globalAlpha = 1.0;
    // ctx.drawImage(bgImage, 0, 0, canvas.width / scale, canvas.height / scale);

    function drawNextBatch() {
        let count = 0;
        while (i < tileImages.length && count < tilesPerFrame) {
            const col = i % gridCols;
            const row = Math.floor(i / gridCols);
            const x = col * tileWidth;
            const y = row * tileHeight;
            ctx.globalAlpha = 1.0;
            ctx.drawImage(tileImages[i], x, y, tileWidth, tileHeight);
            i++;
            count++;
        }

        if (i < tileImages.length) {
            requestAnimationFrame(drawNextBatch); // Keep drawing
        } else {
            onComplete(); // Done
        }
    }

    drawNextBatch();
}

async function loadImage(src) {
    const fromDB = await getImageFromDB(src);
    if (fromDB) {
        const blob = new Blob([fromDB]);
        const imgURL = URL.createObjectURL(blob);
        const img = new Image();
        img.src = imgURL;
        await new Promise((resolve) => (img.onload = resolve));
        return img;
    }

    // Else, fetch from server and store
    const response = await fetch(src);
    const blob = await response.blob();
    await storeImageInDB(src, blob);

    const imgURL = URL.createObjectURL(blob);
    const img = new Image();
    img.src = imgURL;
    await new Promise((resolve) => (img.onload = resolve));
    return img;
}

async function initMosaic() {
    const startTime = performance.now();

    const textData = await fetch(`updateImg/data/img${randomInt}.txt`).then((res) => res.text());
    const lines = textData.trim().split("\n");
    [gridCols, gridRows] = lines[0].split(" ").map(Number);
    tiles = lines.slice(1);

    tileImages = [];
    for (const src of tiles) {
        const path = "updateImg/images/" + src;
        if (imageCache[src]) {
            tileImages.push(imageCache[src]);
        } else {
            const img = await loadImage(path);
            imageCache[src] = img;
            tileImages.push(img);
        }
    }

    // bgImage = await loadImage(`img/img${2}.jpg`);

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx.setTransform(scale, 0, 0, scale, originX, originY);
    ctx.clearRect(-originX / scale, -originY / scale, canvas.width / scale, canvas.height / scale);

    queueTilesForDrawing(() => {
        const endTime = performance.now();
        console.log(`Mosaic rendered in ${endTime - startTime}ms`);
    });
}

function draw() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx.setTransform(scale, 0, 0, scale, originX, originY);
    ctx.clearRect(-originX / scale, -originY / scale, canvas.width / scale, canvas.height / scale);

    // if (bgImage) {
    //     ctx.globalAlpha = 1.0;
    //     ctx.drawImage(bgImage, -originX, -originY, canvas.width, canvas.height);
    // }

    ctx.globalAlpha = 1.0;
    const tileWidth = gridCols > 0 ? canvas.width / gridCols : tileSize;
    const tileHeight = gridRows > 0 ? canvas.height / gridRows : tileSize;

    for (let i = 0; i < tileImages.length; i++) {
        const col = i % gridCols;
        const row = Math.floor(i / gridCols);
        const x = col * tileWidth;
        const y = row * tileHeight;
        ctx.drawImage(tileImages[i], x, y, tileWidth, tileHeight);
    }

    ctx.globalAlpha = 1.0;
}

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

    const zoomFactor = 1.05; // zoom step per scroll — smaller = smoother
    const direction = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;

    const mouseX = e.clientX - canvas.offsetLeft;
    const mouseY = e.clientY - canvas.offsetTop;

    // Get world coords before zoom
    const wx = (mouseX - originX) / scale;
    const wy = (mouseY - originY) / scale;

    // Apply zoom
    const newScale = scale * direction;

    // Optional: clamp scale between min and max
    const minScale = 1;
    const maxScale = 10;
    if (newScale < minScale || newScale > maxScale) return;

    scale = newScale;

    // Adjust origin to keep zoom centered at mouse
    originX = mouseX - wx * scale;
    originY = mouseY - wy * scale;

    draw();
});

// ---------mobile zooming------------
let lastTouchDistance = null;

canvas.addEventListener(
    "touchstart",
    (e) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastTouchDistance = Math.hypot(dx, dy);
        }
    },
    { passive: false }
);

canvas.addEventListener(
    "touchmove",
    (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();

            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const currentDistance = Math.hypot(dx, dy);

            if (lastTouchDistance !== null) {
                const zoomFactor = 1.02; // smoother pinch zoom
                const deltaScale = currentDistance / lastTouchDistance;
                const direction = deltaScale > 1 ? zoomFactor : 1 / zoomFactor;

                const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - canvas.offsetLeft;
                const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - canvas.offsetTop;

                const wx = (centerX - originX) / scale;
                const wy = (centerY - originY) / scale;

                const newScale = scale * direction;
                const minScale = 1;
                const maxScale = 10;

                if (newScale >= minScale && newScale <= maxScale) {
                    scale = newScale;
                    originX = centerX - wx * scale;
                    originY = centerY - wy * scale;
                    draw();
                }
            }

            lastTouchDistance = currentDistance;
        }
    },
    { passive: false }
);

canvas.addEventListener("touchend", () => {
    lastTouchDistance = null;
});

window.addEventListener("resize", draw);

initMosaic();
