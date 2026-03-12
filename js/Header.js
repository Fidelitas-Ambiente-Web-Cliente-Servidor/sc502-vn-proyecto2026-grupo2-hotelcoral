function InicializarHeader() {
    const BotonMenuMovil = document.getElementById("BotonMenuMovil");
    const NavegacionEncabezado = document.getElementById("NavegacionEncabezado");
    const ItemsConSubmenu = document.querySelectorAll(".ItemConSubmenu");

    if (BotonMenuMovil && NavegacionEncabezado) {
        BotonMenuMovil.addEventListener("click", () => {
            NavegacionEncabezado.classList.toggle("MenuAbierto");
        });
    }

    ItemsConSubmenu.forEach(Item => {
        const EnlacePrincipal = Item.querySelector(".EnlaceNavegacion");

        EnlacePrincipal.addEventListener("click", (Evento) => {
            if (window.innerWidth <= 900) {
                Evento.preventDefault();
                Item.classList.toggle("SubmenuAbierto");
            }
        });
    });
}