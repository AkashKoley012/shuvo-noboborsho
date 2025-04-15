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

    // function drawNextBatch() {
    //     let count = 0;
    //     while (i < tileImages.length && count < tilesPerFrame) {
    //         const col = i % gridCols;
    //         const row = Math.floor(i / gridCols);
    //         const x = col * tileWidth;
    //         const y = row * tileHeight;
    //         ctx.globalAlpha = 0.7;
    //         ctx.drawImage(tileImages[i], x, y, tileWidth, tileHeight);
    //         i++;
    //         count++;
    //     }

    //     if (i < tileImages.length) {
    //         requestAnimationFrame(drawNextBatch); // Keep drawing
    //     } else {
    onComplete(); // Done
    //     }
    // }

    // drawNextBatch();
}

// function drawTilesProgressively() {
//     const tilesPerFrame = 100; // Tune this for performance
//     let drawn = 0;

//     while (currentTileIndex < tilesToDraw.length && drawn < tilesPerFrame) {
//         const [img, x, y, w, h] = tilesToDraw[currentTileIndex];
//         ctx.drawImage(img, x, y, w, h);
//         currentTileIndex++;
//         drawn++;
//     }

//     if (currentTileIndex < tilesToDraw.length) {
//         requestAnimationFrame(drawTilesProgressively);
//     }
// }

const startTime = performance.now();

Promise.all([
    fetch(`updateImg/data/img${randomInt}.txt`)
        .then((res) => res.text())
        .then((data) => {
            const lines = data.trim().split("\n");
            [gridCols, gridRows] = lines[0].split(" ").map(Number);
            tiles = lines.slice(1);
            return Promise.all(
                tiles.map((src) => {
                    const path = "updateImg/images/" + src;
                    if (imageCache[src]) {
                        return Promise.resolve(imageCache[path]); // Use cached image
                    } else {
                        return loadImage(path).then((img) => {
                            imageCache[src] = img; // Cache it for future
                            return img;
                        });
                    }
                })
            );
        }),
    loadImage(`img/img${2}.jpg`), // background image
]).then(([images, bg]) => {
    bgImage = bg;
    tileImages = images;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.setTransform(scale, 0, 0, scale, originX, originY);

    // Step 1: Clear the canvas
    ctx.clearRect(-originX / scale, -originY / scale, canvas.width / scale, canvas.height / scale);

    // Step 2: Start drawing tiles progressively
    queueTilesForDrawing(() => {
        // ✅ Step 3: When tile drawing is done, draw background
        ctx.globalAlpha = 1.0;
        ctx.drawImage(bgImage, 0, 0, canvas.width / scale, canvas.height / scale);
    });
});

const endTime = performance.now();

console.log(`Call to doSomething took ${endTime - startTime} milliseconds`);

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

    // Apply pan and zoom transform
    ctx.setTransform(scale, 0, 0, scale, originX, originY);

    // Clear the visible area (considering pan/zoom)
    ctx.clearRect(-originX / scale, -originY / scale, canvas.width / scale, canvas.height / scale);

    // ✅ Draw background WITHIN transformed context so it zooms/pans
    if (bgImage) {
        ctx.globalAlpha = 1.0;
        ctx.drawImage(bgImage, -originX, -originY, canvas.width, canvas.height);
    }

    // 🧊 Draw tile images (semi-transparent)
    // ctx.globalAlpha = 0.7;
    // const tileWidth = gridCols > 0 ? canvas.width / gridCols : tileSize;
    // const tileHeight = gridRows > 0 ? canvas.height / gridRows : tileSize;

    // for (let i = 0; i < tileImages.length; i++) {
    //     const col = i % gridCols;
    //     const row = Math.floor(i / gridCols);
    //     const x = col * tileWidth;
    //     const y = row * tileHeight;
    //     ctx.drawImage(tileImages[i], x, y, tileWidth, tileHeight);
    // }

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
        // console.log(originX, originY, scale);
        draw();
    }
});

// window.addEventListener("resize", draw);
