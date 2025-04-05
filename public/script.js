document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const urlInput = document.getElementById('urlInput');
    const privacyToggle = document.getElementById('privacyToggle');
    const generateBtn = document.getElementById('generateBtn');
    const qrContainer = document.getElementById('qrContainer');
    const qrCode = document.getElementById('qrCode');
    const downloadBtn = document.getElementById('downloadBtn');
    const accessInfo = document.getElementById('accessInfo');

    // File Drag and Drop Handlers
    dropZone.addEventListener('click', () => fileInput.click());
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropZone.classList.add('bg-blue-50');
    }

    function unhighlight() {
        dropZone.classList.remove('bg-blue-50');
    }

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length) {
            fileInput.files = files;
            urlInput.value = '';
        }
    }

    // Generate QR Code Button Handler
    generateBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        const url = urlInput.value.trim();
        
        if (!file && !url) {
            showAlert('Please upload a file or enter a URL', 'error');
            return;
        }

        const isPrivate = privacyToggle.checked;
        
        try {
            // Show loading state
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generating...';

            // Prepare form data
            const formData = new FormData();
            if (file) formData.append('file', file);
            if (url) formData.append('url', url);
            formData.append('isPrivate', isPrivate);

            // Call backend API
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to generate QR code');
            }

            // Display QR code
            const qrImg = document.createElement('img');
            qrImg.src = result.qrUrl;
            qrImg.alt = 'Generated QR Code';
            qrImg.className = 'w-full max-w-xs';
            qrCode.innerHTML = '';
            qrCode.appendChild(qrImg);

            // Show access information
            if (isPrivate) {
                accessInfo.textContent = `Private Key: ${result.privateKey} (Save this key to access the file)`;
                accessInfo.className = 'text-sm text-red-500 font-medium';
            } else {
                accessInfo.textContent = 'This QR can be scanned by anyone';
                accessInfo.className = 'text-sm text-green-500 font-medium';
            }

            // Show QR container
            qrContainer.classList.add('show');
            showAlert('QR code generated successfully!', 'success');
            
        } catch (error) {
            console.error('Error generating QR:', error);
            showAlert(error.message, 'error');
        } finally {
            // Reset button state
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-qrcode mr-2"></i> Generate QR Code';
        }
    });

    // Download QR Code Button Handler
    downloadBtn.addEventListener('click', () => {
        const qrImg = qrCode.querySelector('img');
        if (qrImg) {
            const link = document.createElement('a');
            link.href = qrImg.src;
            link.download = 'secure-qr-code.png';
            link.click();
        }
    });

    // Helper Functions
    function showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
            type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`;
        alertDiv.textContent = message;
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    function generateRandomKey() {
        return Math.random().toString(36).substring(2, 10).toUpperCase();
    }
});