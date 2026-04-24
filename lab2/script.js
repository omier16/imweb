const video = document.getElementById('camera-stream');
const btnDetect = document.getElementById('btn-detect');
const btnCaptureTriple = document.getElementById('btn-capture-triple');
const btnDownload = document.getElementById('btn-download');
const countdownOverlay = document.getElementById('countdown-overlay');
const flashOverlay = document.getElementById('flash-overlay');
const gallery = document.getElementById('photo-gallery');
const filterBtns = document.querySelectorAll('.filter-btn');
const layoutBtns = document.querySelectorAll('.layout-btn');
const captureCanvas = document.getElementById('capture-canvas');
const combineCanvas = document.getElementById('combine-canvas');

let capturedPhotos = [];
let stream = null;
let currentFilter = 'none';

// 1. Detect Camera
btnDetect.addEventListener('click', async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 1280, height: 720 }, 
            audio: false 
        });
        video.srcObject = stream;
        btnDetect.disabled = true;
        btnDetect.innerHTML = '<span class="icon">✅</span> 鏡頭已啟動';
        btnCaptureTriple.disabled = false;
    } catch (err) {
        console.error("Camera error:", err);
        alert("無法啟動鏡頭，請確認權限設定。");
    }
});

// 1.1 Handle Filters
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Update active state
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update video preview
        currentFilter = btn.dataset.filter;
        video.style.filter = currentFilter === 'none' ? '' : currentFilter;
    });
});

// 1.2 Handle Layout Toggle
let currentLayout = 'portrait';
layoutBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        layoutBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentLayout = btn.dataset.layout;
    });
});

// 2. Triple Capture Logic
btnCaptureTriple.addEventListener('click', async () => {
    capturedPhotos = [];
    gallery.innerHTML = '';
    btnCaptureTriple.disabled = true;
    btnDownload.disabled = true;

    for (let i = 0; i < 3; i++) {
        await runCountdown(3);
        capturePhoto();
        await sleep(500); // Wait for flash effect to settle
    }

    btnCaptureTriple.disabled = false;
    btnDownload.disabled = false;
});

async function runCountdown(seconds) {
    countdownOverlay.classList.remove('hidden');
    for (let i = seconds; i > 0; i--) {
        countdownOverlay.textContent = i;
        await sleep(1000);
    }
    countdownOverlay.classList.add('hidden');
}

function capturePhoto() {
    const context = captureCanvas.getContext('2d');
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;
    
    // Apply current filter to canvas
    context.filter = currentFilter;
    
    // Mirror the capture to match preview
    context.translate(captureCanvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
    
    const dataUrl = captureCanvas.toDataURL('image/png');
    capturedPhotos.push(dataUrl);
    
    // Add to gallery
    const item = document.createElement('div');
    item.className = 'gallery-item';
    const img = document.createElement('img');
    img.src = dataUrl;
    item.appendChild(img);
    gallery.appendChild(item);

    // Flash effect
    flashOverlay.classList.remove('flash-active');
    void flashOverlay.offsetWidth; // Trigger reflow
    flashOverlay.classList.add('flash-active');
}

// 3. Combined Download
btnDownload.addEventListener('click', () => {
    if (capturedPhotos.length < 3) return;

    const ctx = combineCanvas.getContext('2d');
    const layout = currentLayout;
    
    const photoWidth = 800; // Reference width
    const photoHeight = (photoWidth * video.videoHeight) / video.videoWidth;
    const footerHeight = 120;
    
    if (layout === 'portrait') {
        combineCanvas.width = photoWidth;
        combineCanvas.height = (photoHeight * 3) + footerHeight;
    } else {
        combineCanvas.width = photoWidth * 3;
        combineCanvas.height = photoHeight + footerHeight;
    }

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, combineCanvas.width, combineCanvas.height);

    let loadedCount = 0;
    capturedPhotos.forEach((dataUrl, index) => {
        const img = new Image();
        img.onload = () => {
            if (layout === 'portrait') {
                ctx.drawImage(img, 0, index * photoHeight, photoWidth, photoHeight);
            } else {
                ctx.drawImage(img, index * photoWidth, 0, photoWidth, photoHeight);
            }
            
            loadedCount++;
            
            if (loadedCount === 3) {
                const yOffset = layout === 'portrait' ? photoHeight * 3 : photoHeight;
                renderMetadata(ctx, yOffset, combineCanvas.width, footerHeight);
                triggerDownload();
            }
        };
        img.src = dataUrl;
    });
});

function renderMetadata(ctx, yOffset, width, height) {
    ctx.fillStyle = '#000000';
    
    // Scale font size based on width
    const baseFontSize = width > 1000 ? 48 : 24;
    const subFontSize = width > 1000 ? 36 : 18;
    
    ctx.font = `bold ${baseFontSize}px "Noto Sans TC", sans-serif`;
    ctx.textAlign = 'center';
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });

    ctx.fillText('相片亭 - 三連拍紀錄', width / 2, yOffset + (height * 0.4));
    
    ctx.font = `300 ${subFontSize}px "Noto Sans TC", sans-serif`;
    ctx.fillStyle = '#666666';
    ctx.fillText(`${dateStr} ${timeStr} | Created with 相片亭 App`, width / 2, yOffset + (height * 0.7));
}

function triggerDownload() {
    const link = document.createElement('a');
    link.download = `PhotoBooth_${Date.now()}.png`;
    link.href = combineCanvas.toDataURL('image/png');
    link.click();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
