function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("MosaicDB", 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("images")) {
                db.createObjectStore("images");
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getImageFromDB(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("images", "readonly");
        const store = tx.objectStore("images");
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

async function storeImageInDB(key, blob) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("images", "readwrite");
        const store = tx.objectStore("images");
        const request = store.put(blob, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
