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
    document.getElementById("contentContainer").style.display = "block";
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
    } else if (currentContent.type === "content") {
        displayContentAsCards(currentContent.data);
    } else {
        console.warn("Unknown content type:", currentContent.type);
    }
}

function displayContentAsCards(dataList) {
    let cardsHtml = '';

    // Loop through contentList to generate up to 2 cards per row
    const rows = Math.ceil(dataList.length / 2);
    for (let i = 0; i < rows; i++) {
        cardsHtml += '<div class="row mb-6">';  // Row for cards
        for (let j = 0; j < 2; j++) {
            const content = dataList[i * 2 + j];
            if (content) {
                cardsHtml += `
                    <div class="col-md-6">
                        <div class="card">
                            <!--<img src="https://via.placeholder.com/150" class="card-img-top" alt="Image">-->
                            <div class="card-body">
                                <h5 class="card-title">${content.title}</h5>
                                <p class="card-text"><strong>Type:</strong> ${content.type}</p>
                                <p class="card-text"><strong>Location:</strong> ${content.location}</p>
                                <p class="card-text"><strong>Instructor:</strong> ${content.instructors}</p>
                                <p class="card-text"><strong>Timings:</strong></p>
                                <ul class="list-unstyled card-text">
                                    ${(Array.isArray(content.timings) ? content.timings : []).map(time => `<li>${time}</li>`).join('')}
                                </ul>
                                <div id="qrcode-${content.id}" class="mt-3"></div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
        cardsHtml += '</div>';  // End row
    }

    document.getElementById("contentCards").innerHTML = cardsHtml;
    // Generate QR codes for each content item
    currentContent.data.forEach((item) => {
        generateQRCode(item.details_link, `qrcode-${item.id}`);
    });

    setTimeout(() => {
        currentIndex = (currentIndex + 1) % dataList.length;
        loadNextContent();
    }, 3000);
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
    }, 1000);
}

window.onload = function() {
    scheduleMidnightRefresh();
    fetchContent();
};
