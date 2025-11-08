const charsetSelect = document.getElementById('charset');
const plainTextArea = document.getElementById('plainText');
const base64TextArea = document.getElementById('base64Text');
const encodeBtn = document.getElementById('encodeBtn');
const decodeBtn = document.getElementById('decodeBtn');

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