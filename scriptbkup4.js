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

    /*console.log(currentContent);
    console.log(currentContent.headTitle);
    console.log(currentContent.headDesc);*/
    const header = document.getElementById("headTitle");
    const headDesc = document.getElementById("headDesc");

    document.getElementById("videoContainer").style.display = "none";
    document.getElementById("pdfContainer").style.display = "none";
    document.getElementById("courseContainer").style.display = "none";
    document.getElementById("courseContainer").innerHTML = ""; // Clear content
    
    header.textContent = currentContent.headTitle || ""; 
    headDesc.textContent = currentContent.headDesc || ""; 
    
    if (currentContent.type === "video") {
        document.getElementById("videoContainer").style.display = "flex";
        document.getElementById("videoSource").src = currentContent.src;
        const videoPlayer = document.getElementById("videoPlayer");
        videoPlayer.load();
        videoPlayer.play();
        adjustVideoSize(); // Ensure video resizes properly

        videoPlayer.onended = () => setTimeout(() => {
            currentIndex = (currentIndex + 1) % contentList.length;
            loadNextContent();
        }, 3000);
    } else if (currentContent.type === "pdf") {
        document.getElementById("pdfContainer").style.display = "flex";
        loadPdf(currentContent.src);
    } else if (currentContent.type === "content") {
        document.getElementById("courseContainer").style.display = "flex";
        displayContentAsCards(currentContent.data);
            setTimeout(() => {
            currentIndex = (currentIndex + 1) % contentList.length;
            loadNextContent();
        }, 5000);  // Increased to 10 seconds
    } else {
        console.warn("Unknown content type:", currentContent.type);
    }

    /*setTimeout(() => {
        currentIndex = (currentIndex + 1) % contentList.length;
        loadNextContent();
    }, 10000);*/
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
                    <div class="col-md-4 d-flex justify-content-center align-items-center">
                        <div class="card">
                            <!--<img src="https://via.placeholder.com/150" class="card-img-top" alt="Image">-->
                            <h5 class="card-title">${content.title}</h5>
                            <div class="card-body">
                                <p class="card-text"><strong>Type:</strong> ${content.type}</p>
                                <p class="card-text"><strong>Location:</strong> ${content.location}</p>
                                <p class="card-text"><strong>Instructor:</strong> ${content.instructors}</p>
                                <p class="card-text"><strong>Timings:</strong></p>
                                <ul class="list-unstyled card-text">
                                    ${(Array.isArray(content.timings) ? content.timings : []).map(time => `<li>${time}</li>`).join('')}
                                </ul>
                                <div id="qrcode-${content.id}" class="card-img mt-3"></div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
        cardsHtml += '</div>';  // End row
    }

    document.getElementById("courseContainer").innerHTML = cardsHtml;
    // Generate QR codes for each content item
    dataList.forEach((item) => {
        generateQRCode(item.details_link, `qrcode-${item.id}`);
    });
}

async function loadPdf(pdfUrl) {
    try {
        pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
        //document.getElementById("pdfContainer").innerHTML = ""; // Clear old PDF
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            currentPage++;
            await renderPage(i);
            await new Promise(resolve => setTimeout(resolve, 10000)); // Display each page for 5 sec
        }
        setTimeout(() => {
            currentIndex = (currentIndex + 1) % contentList.length;
            loadNextContent();
        }, 3000); // Small delay before moving to next content
    } catch (error) {
        console.error("Error loading PDF:", error);
    }
}

async function renderPage() {
    if (!pdfDoc) return;
    
    console.log("Rendering page:", currentPage); // Debugging

    const canvas = document.getElementById("pdfCanvas");
    const ctx = canvas.getContext("2d");
    const page = await pdfDoc.getPage(currentPage);
    const container = document.getElementById("pdfContainer");
    const scale = container.clientWidth / page.getViewport({ scale: 1 }).width;
    //const viewport = page.getViewport({ scale: 0.8 }); // Adjust scale for better fit
    const viewport = page.getViewport({ scale });

    // Set canvas dimensions dynamically
    /*canvas.width = viewport.width;
    canvas.height = viewport.height; */

    canvas.width = container.clientWidth * 1; // Fit within 90% width
    canvas.height = container.clientHeight * 1; // Fit within 90% height

    const renderTask = page.render({ canvasContext: ctx, viewport: viewport });

    await renderTask.promise; // Ensure rendering completes

    //console.log("Page Rendered:", currentPage);

    // Show next page after delay
   /* setTimeout(() => {
        if (currentPage < pdfDoc.numPages) {
            currentPage++;
            renderPage();
        } else {
            console.log("PDF Complete, Switching Content");
            currentPage = 1;
            currentIndex = (currentIndex + 1) % contentList.length;
            loadNextContent();
        }
    }, 10000); */// Each page stays for 7 seconds
}

function adjustVideoSize() {
    const video = document.getElementById("videoPlayer");
    const container = document.getElementById("videoContainer");

    video.width = container.clientWidth * 1; // Fit within 90% width
    video.height = container.clientHeight * 1; // Fit within 90% height
}

window.addEventListener("resize", adjustVideoSize); 

window.onload = function() {
    scheduleMidnightRefresh();
    fetchContent();
};
