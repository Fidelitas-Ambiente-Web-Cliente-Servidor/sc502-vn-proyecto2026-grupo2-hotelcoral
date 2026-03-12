
function CargarFragmento(idElemento, rutaArchivo) {
    return fetch(rutaArchivo)
        .then(response => {
            if (!response.ok) throw new Error("No se pudo cargar: " + rutaArchivo);
            return response.text();
        })
        .then(data => {
            document.getElementById(idElemento).innerHTML = data;
        })
        .catch(error => console.error(error));
}

document.addEventListener("DOMContentLoaded", async () => {
    await CargarFragmento("FragmentoHeader", "Header.html");
    await CargarFragmento("FragmentoFooter", "Footer.html");

    if (typeof InicializarHeader === "function") {
        InicializarHeader();
    }
});