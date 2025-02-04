const contentJsonUrl = "content.json";
let contentList = [];
let currentIndex = 0;
let recordIndex = 0;
let pdfDoc = null;
let currentPage = 1;

function scheduleMidnightRefresh() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);

    const timeUntilMidnight = midnight.getTime() - now.getTime();
    console.log("Page will refresh in:", timeUntilMidnight / 1000, "seconds");

    setTimeout(() => {
        location.reload();
    }, timeUntilMidnight);
}

async function fetchContent() {
    try {
        const response = await fetch(contentJsonUrl + "?nocache=" + new Date().getTime());
        const data = await response.json();
        console.log(data);
        contentList = data.contentList;
        console.log(contentList);
        loadNextContent();
    } catch (error) {
        console.error("Error fetching content:", error);
    }
}

function loadNextContent() {
    if (contentList.length === 0) return;
    const currentContent = contentList[currentIndex];

    document.getElementById("videoContainer").style.display = "none";
    document.getElementById("contentContainer").style.display = "none";
    document.getElementById("pdfContainer").style.display = "none";

    if (currentContent.type === "video") {
        document.getElementById("videoContainer").style.display = "block";
        document.getElementById("videoSource").src = currentContent.src;
        const videoPlayer = document.getElementById("videoPlayer");
        videoPlayer.load();
        videoPlayer.play();
        videoPlayer.onended = () => setTimeout(() => {
            currentIndex = (currentIndex + 1) % contentList.length;
            loadNextContent();
        }, 3000);
    } else if (currentContent.type === "pdf") {
        document.getElementById("pdfContainer").style.display = "block";
        loadPdf(currentContent.src);
        setTimeout(() => {
            currentIndex = (currentIndex + 1) % contentList.length;
            loadNextContent();
        }, 20000);
    } else if (currentContent.type === "content") {
        document.getElementById("contentContainer").style.display = "block";
        let htmlContent = "";
        
        currentContent.data.forEach((item) => {
            htmlContent += `
                <div class="cards">
                    <h2>${item.title}</h2>
                    <p><strong>Type:</strong> ${item.type}</p>
                    <p><strong>Location:</strong> ${item.location}</p>
                    <p><strong>Instructor:</strong> ${item.instructors}</p>
                    <p><strong>Timings:</strong></p>
                    <ul>${(Array.isArray(item.timings) ? item.timings : []).map(time => `<li>${time}</li>`).join('')}</ul>
                    <div id="qrcode-${item.title.replace(/\s+/g, '')}"></div>
                </div>
            `;
        });

        document.getElementById("contentContainer").innerHTML = htmlContent;

        // Generate QR codes for each content item
        currentContent.data.forEach((item) => {
            generateQRCode(item.details_link, `qrcode-${item.title.replace(/\s+/g, '')}`);
        });

        setTimeout(() => {
            currentIndex = (currentIndex + 1) % contentList.length;
            loadNextContent();
        }, 20000);
    } else {
        console.warn("Unknown content type:", currentContent.type);
    }
}

function generateQRCode(link, elementId) {
    if (link) {
        document.getElementById(elementId).innerHTML = "";
        new QRCode(document.getElementById(elementId), {
            text: link,
            width: 150,
            height: 150
        });
    } else {
        document.getElementById(elementId).innerHTML = "<p> </p>";
    }
}

async function loadPdf(pdfUrl) {
    try {
        pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
        currentPage = 1;
        renderPage();
    } catch (error) {
        console.error("Error loading PDF:", error);
    }
}

async function renderPage() {
    if (!pdfDoc) return;
    const canvas = document.getElementById("pdfCanvas");
    const ctx = canvas.getContext("2d");
    const page = await pdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale: 2 });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

    setTimeout(() => {
        currentPage = currentPage < pdfDoc.numPages ? currentPage + 1 : 1;
        renderPage();
    }, 10000);
}

window.onload = function() {
    scheduleMidnightRefresh();
    fetchContent();
};
