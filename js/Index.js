document.addEventListener("DOMContentLoaded", () => {
    InicializarAnimacionesIndex();
});

function InicializarAnimacionesIndex() {
    ConfigurarAnimacionHero();
}

function ConfigurarAnimacionHero() {
    const ContenedorHero = document.querySelector(".ContenedorHero");

    if (!ContenedorHero) {
        return;
    }

    ContenedorHero.style.opacity = "0";
    ContenedorHero.style.transform = "translateY(18px)";
    ContenedorHero.style.transition = "opacity 0.6s ease, transform 0.6s ease";

    requestAnimationFrame(() => {
        ContenedorHero.style.opacity = "1";
        ContenedorHero.style.transform = "translateY(0)";
    });
}