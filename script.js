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

function generateQRCode(link) {
    if (link) {
        document.getElementById("qrcode").innerHTML = "";
        new QRCode(document.getElementById("qrcode"), {
            text: link,
            width: 150,
            height: 150
        });
    } else {
        document.getElementById("qrcode").innerHTML = "<p> </p>";
    }
}

async function fetchContent() {
    try {
        const response = await fetch(contentJsonUrl + "?nocache=" + new Date().getTime());
        const data = await response.json();
        contentList = data.contentList;
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
    } else {
        document.getElementById("contentContainer").innerHTML = `
            <h2>${currentContent.title}</h2>
            <p><strong>Type:</strong> ${currentContent.type}</p>
            <p><strong>Location:</strong> ${currentContent.location}</p>
            <p><strong>Instructor:</strong> ${currentContent.instructors}</p>
            <p><strong>Timings:</strong></p>
            <ul>${currentContent.timings.map(time => `<li>${time}</li>`).join('')}</ul>
            <div id="qrcode"></div>
        `;
        generateQRCode(currentContent.details_link);
        setTimeout(() => {
            currentIndex = (currentIndex + 1) % contentList.length;
            loadNextContent();
        }, 20000);
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
