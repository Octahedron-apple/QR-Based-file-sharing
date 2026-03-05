const startBtn = document.getElementById("startScan");
const resultBox = document.getElementById("result");
const statusText = document.getElementById("status-text");
const fileDownloadArea = document.getElementById("file-download-area");
const radioButtons = document.getElementsByName('scanMode');
const fileInstruction = document.getElementById('file-instruction');

let qrCodeObj = null; // Store the Html5Qrcode instance
let currentMode = 'text'; // 'text' or 'file'
let fileStep = 0; // 0=idle, 1=waitingForName, 2=waitingForContent
let tempFilename = '';

// Toggle instructions based on mode
radioButtons.forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentMode = e.target.value;
        if(currentMode === 'file') {
            fileInstruction.style.display = 'list-item';
            startBtn.innerText = "Scan File (Part 1)";
        } else {
            fileInstruction.style.display = 'none';
            startBtn.innerText = "Scan Text";
        }
    });
});

startBtn.addEventListener("click", () => {
    // Reset previous results
    resultBox.innerText = "";
    fileDownloadArea.innerHTML = "";
    fileDownloadArea.style.display = 'none';
    
    // Determine state based on mode
    if (currentMode === 'file') {
        fileStep = 1; // Start looking for filename
        statusText.innerText = "Step 1: Scan the FILENAME QR code";
        statusText.style.color = "blue";
    } else {
        statusText.innerText = "Scanning for Text...";
        statusText.style.color = "black";
    }

    // Initialize scanner if not already done (or reuse logic)
    // We recreate it here to ensure clean state
    if (qrCodeObj) { 
        // If already running, stop it first (edge case)
        try { qrCodeObj.stop(); } catch(e){}
    }

    qrCodeObj = new Html5Qrcode("qr-reader");

    qrCodeObj.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: 250
        },
        (decodedText) => {
            handleScanSuccess(decodedText);
        },
        (error) => {
            // ignore errors
        }
    );
    
    // Hide button while scanning
    startBtn.style.display = "none";
});

function handleScanSuccess(text) {
    if (currentMode === 'text') {
        // --- TEXT MODE ---
        resultBox.innerText = "Scanned: " + text;
        statusText.innerText = "Scan Complete";
        stopScanner();
    } 
    else if (currentMode === 'file') {
        // --- FILE MODE ---
        
        if (fileStep === 1) {
            // Captured Filename
            tempFilename = text;
            fileStep = 2;
            
            // UX: Alert user to switch QRs. This also creates a natural pause 
            // so we don't accidentally scan the same QR twice instantly.
            alert(`Filename identified: "${tempFilename}"\n\nNow please scan the DATA QR code.`);
            
            statusText.innerText = `Step 2: Scan DATA for "${tempFilename}"`;
            statusText.style.color = "red";
            
            // Scanner continues running...
        } 
        else if (fileStep === 2) {
            // Captured Content
            // Prevent scanning the filename as content if user didn't move
            if (text === tempFilename) {
                console.log("Ignored duplicate scan of filename");
                return; 
            }

            createFileDownload(tempFilename, text);
            statusText.innerText = "File Reconstructed Successfully!";
            statusText.style.color = "green";
            stopScanner();
        }
    }
}

function stopScanner() {
    if (qrCodeObj) {
        qrCodeObj.stop().then(() => {
            qrCodeObj.clear();
            startBtn.style.display = "flex"; // Show start button again
            // Update button text for next run
            if(currentMode === 'file') startBtn.innerText = "Scan File (Part 1)";
        }).catch(err => {
            console.error("Failed to stop scanner", err);
        });
    }
}

function createFileDownload(filename, content) {
    resultBox.innerText = `File "${filename}" received.`;
    
    // Create a blob from the content
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.innerText = `Download ${filename}`;
    link.className = "download-btn";
    
    fileDownloadArea.innerHTML = "";
    fileDownloadArea.appendChild(link);
    fileDownloadArea.style.display = "block";
}