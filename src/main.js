const charsetSelect = document.getElementById('charset');
const plainTextArea = document.getElementById('plainText');
const base64TextArea = document.getElementById('base64Text');
const encodeBtn = document.getElementById('encodeBtn');
const decodeBtn = document.getElementById('decodeBtn');

// NEW: image elements
const imageFileInput = document.getElementById('imageFile');
const imgToB64Btn = document.getElementById('imgToB64Btn');
const b64ToImgBtn = document.getElementById('b64ToImgBtn');
const imageBase64TextArea = document.getElementById('imageBase64Text');
const imagePreview = document.getElementById('imagePreview');
const downloadImageLink = document.getElementById('downloadImageLink');

/* NEW: tabs */
const tabTextBtn = document.getElementById('tabTextBtn');
const tabImageBtn = document.getElementById('tabImageBtn');
const tabTextPanel = document.getElementById('tabTextPanel');
const tabImagePanel = document.getElementById('tabImagePanel');

function setActiveTab(which) {
    const isText = which === 'text';

    tabTextBtn.setAttribute('aria-selected', String(isText));
    tabImageBtn.setAttribute('aria-selected', String(!isText));

    tabTextBtn.tabIndex = isText ? 0 : -1;
    tabImageBtn.tabIndex = !isText ? 0 : -1;

    tabTextPanel.hidden = !isText;
    tabImagePanel.hidden = isText;
}

tabTextBtn.addEventListener('click', () => setActiveTab('text'));
tabImageBtn.addEventListener('click', () => setActiveTab('image'));

// Optional: keyboard support (Left/Right)
[tabTextBtn, tabImageBtn].forEach(btn => {
    btn.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const next = (document.activeElement === tabTextBtn) ? tabImageBtn : tabTextBtn;
        next.focus();
        setActiveTab(next === tabTextBtn ? 'text' : 'image');
    });
});

encodeBtn.addEventListener('click', () => {
    try {
        const bytes = encodeString(plainTextArea.value, charsetSelect.value);
        base64TextArea.value = bytesToBase64(bytes);
    } catch (err) {
        alert(err.message);
    }
});

decodeBtn.addEventListener('click', () => {
    try {
        const bytes = base64ToBytes(base64TextArea.value.trim());
        plainTextArea.value = decodeBytes(bytes, charsetSelect.value);
    } catch (err) {
        alert(err.message);
    }
});

// NEW: Image → Base64
imgToB64Btn.addEventListener('click', async () => {
    try {
        const file = imageFileInput.files?.[0];
        if (!file) throw new Error('Please choose an image file first.');

        const dataUrl = await fileToDataUrl(file);
        imageBase64TextArea.value = dataUrl;

        setPreviewFromDataUrl(dataUrl, file.name || 'image');
    } catch (err) {
        alert(err.message);
    }
});

// NEW: Base64 → Image
b64ToImgBtn.addEventListener('click', () => {
    try {
        const input = imageBase64TextArea.value.trim();
        if (!input) throw new Error('Please paste image Base64 (or data URL) first.');

        const dataUrl = normalizeImageBase64ToDataUrl(input);
        setPreviewFromDataUrl(dataUrl, 'image');
    } catch (err) {
        alert(err.message);
    }
});

function setPreviewFromDataUrl(dataUrl, filenameBase) {
    // Validate data URL quickly
    if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(dataUrl)) {
        throw new Error('Invalid image data URL.');
    }

    imagePreview.src = dataUrl;
    imagePreview.style.display = 'block';

    const mime = dataUrl.slice('data:'.length, dataUrl.indexOf(';'));
    const ext = mimeToExt(mime) || 'png';

    downloadImageLink.href = dataUrl;
    downloadImageLink.download = `${filenameBase.replace(/\.[^/.]+$/, '') || 'image'}.${ext}`;
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
    });
}

function normalizeImageBase64ToDataUrl(input) {
    // If already a data URL, just validate and return
    if (input.startsWith('data:')) {
        // minimal validation
        if (!input.includes(';base64,')) throw new Error('Data URL is not base64-encoded.');
        return input;
    }

    // Otherwise treat as raw base64; remove whitespace/newlines
    const raw = input.replace(/\s+/g, '');

    // Validate base64 by decoding (will throw on invalid)
    try {
        atob(raw);
    } catch {
        throw new Error('Invalid Base64 string.');
    }

    const mime = detectImageMimeFromBase64(raw) || 'image/png';
    return `data:${mime};base64,${raw}`;
}

function detectImageMimeFromBase64(rawBase64) {
    // Use magic headers (base64 prefixes) for common formats
    // PNG: 89 50 4E 47 0D 0A 1A 0A => iVBORw0KGgo=
    if (rawBase64.startsWith('iVBORw0KGgo')) return 'image/png';
    // JPEG: FF D8 FF => /9j/
    if (rawBase64.startsWith('/9j/')) return 'image/jpeg';
    // GIF: GIF87a/GIF89a => R0lGODdh / R0lGODlh
    if (rawBase64.startsWith('R0lGODdh') || rawBase64.startsWith('R0lGODlh')) return 'image/gif';
    // WEBP: RIFF....WEBP => UklGR
    if (rawBase64.startsWith('UklGR')) return 'image/webp';
    // BMP: BM => Qk
    if (rawBase64.startsWith('Qk')) return 'image/bmp';
    // SVG often comes as text; base64 may start with PHN2Zy ( "<svg" )
    if (rawBase64.startsWith('PHN2Zy')) return 'image/svg+xml';
    return null;
}

function mimeToExt(mime) {
    switch (mime) {
        case 'image/png': return 'png';
        case 'image/jpeg': return 'jpg';
        case 'image/gif': return 'gif';
        case 'image/webp': return 'webp';
        case 'image/bmp': return 'bmp';
        case 'image/svg+xml': return 'svg';
        default: return '';
    }
}

function encodeString(text, charset) {
    switch (charset) {
        case 'utf-8':
            return new TextEncoder().encode(text);
        case 'utf-16le':
            return stringToUtf16(text, true);
        case 'utf-16be':
            return stringToUtf16(text, false);
        case 'iso-8859-1':
            return stringToIso88591(text);
        default:
            throw new Error('Unsupported charset');
    }
}

function decodeBytes(bytes, charset) {
    switch (charset) {
        case 'utf-8':
            return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        case 'utf-16le':
            return utf16ToString(bytes, true);
        case 'utf-16be':
            return utf16ToString(bytes, false);
        case 'iso-8859-1':
            return iso88591ToString(bytes);
        default:
            throw new Error('Unsupported charset');
    }
}

function bytesToBase64(bytes) {
    let binary = '';
    bytes.forEach(byte => binary += String.fromCharCode(byte));
    return btoa(binary);
}

function base64ToBytes(base64) {
    if (!base64) return new Uint8Array();
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function stringToUtf16(text, littleEndian) {
    const buffer = new ArrayBuffer(text.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (littleEndian) {
            view.setUint16(i * 2, code, true);
        } else {
            view.setUint16(i * 2, code, false);
        }
    }
    return new Uint8Array(buffer);
}

function utf16ToString(bytes, littleEndian) {
    if (bytes.length % 2 !== 0) {
        throw new Error('Invalid UTF-16 byte length');
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let result = '';
    for (let i = 0; i < bytes.length; i += 2) {
        result += String.fromCharCode(view.getUint16(i, littleEndian));
    }
    return result;
}

function stringToIso88591(text) {
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code > 255) {
            throw new Error('Character outside ISO-8859-1 range');
        }
        bytes[i] = code;
    }
    return bytes;
}

function iso88591ToString(bytes) {
    let result = '';
    bytes.forEach(byte => result += String.fromCharCode(byte));
    return result;
}