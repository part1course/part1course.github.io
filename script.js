const contentJsonUrl = "content.json"; //Change it after testing the application to content.json
let contentList = [];
let allContentIndex = 0;
let recordIndex = 0;
let pdfDoc = null;
let pdfCurrentPage = 1;
let userInteracted = false; // Track if user interacted to mute and unmute the video

let courseDisplayIntervalTime = 25000; // Display Interval for courses. 
let pdfDisplayIntervalTime    = 25000; // Display Interval for pdfs.

//Variables for tracking course displays per contentDefinition in Content.json file.
let courseDisplayCurrentIndex = 0;
let allCoursesDisplayed = null;

document.body.addEventListener("click", function () {
    userInteracted = true;
}, { once: true });


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
    const currentContent = contentList[allContentIndex];

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

        // Wait for metadata to load before playing
        videoPlayer.onloadedmetadata = () => {
            if (userInteracted) {
              videoPlayer.muted = false; // Unmute
            }     
            videoPlayer.play();
        };
        
        adjustVideoSize(); // Ensure video resizes properly

        videoPlayer.onended = () => setTimeout(() => {
            allContentIndex = (allContentIndex + 1) % contentList.length;
            loadNextContent();
        }, 2000);
    } else if (currentContent.type === "pdf") {
        document.getElementById("pdfContainer").style.display = "flex";
        loadPdf(currentContent.src);
    } else if (currentContent.type === "content") {
        document.getElementById("courseContainer").style.display = "flex";
        courseDisplayCurrentIndex = 0;
        allCoursesDisplayed = null;
        displayContentAsCards(currentContent.data);
    } else {
        console.warn("Unknown content type:", currentContent.type);
    }

    /*setTimeout(() => {
        allContentIndex = (allContentIndex + 1) % contentList.length;
        loadNextContent();
    }, 10000);*/
}

function displayContentAsCards(dataList) {
    if (dataList.length === 0) return;

    const totalCourses = dataList.length;
    const coursesToShow = 3;

    function updateDisplay() {
        let cardsHtml = '';

        for (let i = 0; i < coursesToShow; i++) {
            const index = courseDisplayCurrentIndex + i;
            if (index >= totalCourses) break; // Stop if out of bounds
            const content = dataList[index];

            cardsHtml += `
                <div class="col-md-4 d-flex justify-content-center align-items-center">
                    <div class="card course-card" style="background-image: url('${content.backgroundimg}');">
                        <h4 class="card-title">${content.title}</h4>
                        <div class="card-body">
                            <p class="card-text"><strong>Type:</strong> ${content.type}</p>
                            <p class="card-text"><strong>Location:</strong> ${content.location}</p>
                            <p class="card-text"><strong>Instructors:</strong> ${content.instructors}</p>
                            <p class="card-text"><strong>Timings:</strong></p>
                            <ul class="list-unstyled card-text">
                                ${(Array.isArray(content.timings) ? content.timings : []).map(time => `<li>${time}</li>`).join('')}
                            </ul>     
                            <div class="qrcode-container d-flex justify-content-center">
                                <div id="qrcode-${content.id}" class="card-img mt-3  d-flex justify-content-center"></div>
                            </div>
                        </div>                            
                    </div>
                </div>
            `;
        }

        //document.getElementById("courseContainer").innerHTML = `<div class="row mb-4 d-flex justify-content-center">${cardsHtml}</div>`;
        document.getElementById("courseContainer").innerHTML = cardsHtml;

        // Generate QR codes
        for (let i = 0; i < coursesToShow; i++) {
            const index = courseDisplayCurrentIndex + i;
            if (index >= totalCourses) break;
            generateQRCode(dataList[index].details_link, `qrcode-${dataList[index].id}`);
        }

        // Stop the loop when all courses have been displayed
        if (courseDisplayCurrentIndex >= totalCourses) {
            clearInterval(allCoursesDisplayed);

            //Move to next mainContent
            setTimeout(() => {
                allContentIndex = (allContentIndex + 1) % contentList.length;
                loadNextContent();
            }, 1000); // Small delay before moving to next content
        }

        // Move to next set of courses
        courseDisplayCurrentIndex += coursesToShow;
    }

    updateDisplay(); // Initial display
    allCoursesDisplayed = setInterval(updateDisplay, courseDisplayIntervalTime); // Update every interval
}


async function loadPdf(pdfUrl) {
    try {

        // Clear the canvas before loading a new PDF
        const canvas = document.getElementById("pdfCanvas");
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        //Load pdf from url.
        pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
        //document.getElementById("pdfContainer").innerHTML = ""; // Clear old PDF
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            pdfCurrentPage = i;
            await renderPage(i);
            await new Promise(resolve => setTimeout(resolve, pdfDisplayIntervalTime)); // Display each page for 15 sec            
        }
        setTimeout(() => {
            allContentIndex = (allContentIndex + 1) % contentList.length;
            loadNextContent();
        }, 2000); // Small delay before moving to next content
    } catch (error) {
        console.error("Error loading PDF:", error);
    }
}

async function renderPage() {
    if (!pdfDoc) return;

    console.log("Rendering page:", pdfCurrentPage);

    const canvas = document.getElementById("pdfCanvas");
    const ctx = canvas.getContext("2d");
    const page = await pdfDoc.getPage(pdfCurrentPage);

    const container = document.getElementById("pdfContainer");
    const containerWidth = container.clientWidth * 1; // Set max width to 90% of the container
    const containerHeight = container.clientHeight * 1; // Set max height to 90% of the container

    // Get PDF viewport and calculate scale based on width & height
    const initialViewport = page.getViewport({ scale: 1 });
    const scaleX = containerWidth / initialViewport.width;
    const scaleY = containerHeight / initialViewport.height;
    const scale = Math.min(scaleX, scaleY); // Use the smaller scale to fit within the container

    const viewport = page.getViewport({ scale });

    // Set canvas dimensions dynamically
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderTask = page.render({ canvasContext: ctx, viewport });

    await renderTask.promise; // Ensure rendering completes
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
