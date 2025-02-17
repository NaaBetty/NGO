const images = [
    "/images/1.jpg",
    "/images/2.jpg",
    "/images/3.jpg",
    "/images/15.jpg",
    "/images/20.jpg",
    "/images/53.jpg",
];

let currentIndex = 0;

function openLightbox(index) {
    currentIndex = index;
    document.getElementById('lightbox-img').src = images[currentIndex];
    document.getElementById('lightbox').style.display = "flex";
}

function closeLightbox() {
    document.getElementById('lightbox').style.display = "none";
}

function nextImage() {
    currentIndex = (currentIndex + 1) % images.length; // Loops back to first image
    document.getElementById('lightbox-img').src = images[currentIndex];
}

function prevImage() {
    currentIndex = (currentIndex - 1 + images.length) % images.length; // Loops to last image if at the first one
    document.getElementById('lightbox-img').src = images[currentIndex];
}
