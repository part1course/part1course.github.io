const contentJsonUrl = "content.json";
let contentList = [];
let currentIndex = 0;
let recordIndex = 0;
let pdfDoc = null;
let currentPage = 1;

function scheduleMidnightRefresh() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);

    const timeUntilMidnight = midnight - now;
    console.log("Page will refresh in:", timeUntilMidnight / 1000, "seconds");

    setTimeout(() => {
        location.reload();
    }, timeUntilMidnight);
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

function loadContent(contentData) {
    const cardsContainer = document.getElementById("contentCards");
    cardsContainer.innerHTML = "";

    const chunk = contentData.slice(recordIndex, recordIndex + 4);
    chunk.forEach(item => {
        const card = document.createElement("div");
        card.className = "card";

        const img = document.createElement("img");
        img.src = item.image;
        img.alt = item.title;
        card.appendChild(img);

        const h3 = document.createElement("h3");
        h3.textContent = item.title;
        card.appendChild(h3);

        const p = document.createElement("p");
        p.textContent = item.description;
        card.appendChild(p);

        cardsContainer.appendChild(card);
    });

    recordIndex += 4;

    if (recordIndex < contentData.length) {
        setTimeout(() => { loadContent(contentData); }, 20000);
    } else {
        recordIndex = 0;
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

function loadNextContent() {
    if (contentList.length === 0) return;
    const currentContent = contentList[currentIndex];

    document.getElementById("videoContainer").style.display = "none";
    document.getElementById("youtubeContainer").style.display = "none";
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

    } else if (currentContent.type === "youtube") {
        document.getElementById("youtubeContainer").style.display = "block";
        document.getElementById("youtubePlayer").src = currentContent.src;
        setTimeout(() => { 
            currentIndex = (currentIndex + 1) % contentList.length; 
            loadNextContent(); 
        }, 63000);

    } else if (currentContent.type === "content") {
        document.getElementById("contentContainer").style.display = "flex";
        recordIndex = 0;
        loadContent(currentContent.data);

    } else if (currentContent.type === "pdf") {
        document.getElementById("pdfContainer").style.display = "block";
        loadPdf(currentContent.src);
        setTimeout(() => { 
            currentIndex = (currentIndex + 1) % contentList.length; 
            loadNextContent(); 
        }, 10000 * pdfDoc.numPages + 3000);
    }
}

window.onload = function () {
    scheduleMidnightRefresh();
    fetchContent();
};
