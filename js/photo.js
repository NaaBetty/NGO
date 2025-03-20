const images = [
    "../images/image38.webp",
    "../images/image36.webp",
    "../images/image20.webp",
    "../images/image13.webp",
    "../images/image26.webp",
    "../images/image18.webp",
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
