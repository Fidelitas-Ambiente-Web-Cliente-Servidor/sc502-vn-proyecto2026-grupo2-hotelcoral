window.onerror = function (msg, url, line, col, error) {
    console.error("ERROR GLOBAL:", msg, "en línea", line);
};

console.log("JS cargado correctamente");

async function CargarSesion() {

    try {

        console.log("Entrando a CargarSesion");

        const res = await fetch("/sc502-vn-proyecto2026-grupo2-hotelcoral/php/Auth/ValidarSesion.php", {
            credentials: "include"
        });

        const data = await res.json();

        console.log("Respuesta completa:", data);

        if (data.success) {
            const usuario = data.data.Usuario;

            console.log("Usuario:", usuario);

            document.getElementById("NombreUsuario").value =
                usuario.NOMBRE + " " + usuario.APELLIDO;

            document.getElementById("CorreoUsuario").value =
                usuario.CORREO;

            document.getElementById("UsuarioActivo").innerText =
                "Comentando como " + usuario.NOMBRE;

            document.getElementById("NombreUsuario").disabled = true;
            document.getElementById("CorreoUsuario").disabled = true;

        } else {
            document.getElementById("FormularioComentario").style.opacity = "0.5";
        }

    } catch (error) {
        console.error("Error sesión:", error);
    }
}


document.addEventListener("DOMContentLoaded", () => {

    console.log("DOM listo");

    CargarSesion();
    CargarComentarios();

    const Formulario = document.getElementById("FormularioComentario");

    if (Formulario) {
        Formulario.addEventListener("submit", async (e) => {
            e.preventDefault();

            const Calificacion = document.querySelector('input[name="rating"]:checked')?.value;
            const Comentario = document.getElementById("TextoComentario").value;
            const IdHotel = document.getElementById("UbicacionVisitada").value;

            if (!Calificacion || !Comentario) {
                Swal.fire({
                    title: "Campos incompletos",
                    text: "Por favor completa la calificación y el comentario",
                    icon: "warning",
                    confirmButtonColor: "#f39c12"
                });
                return;
            }

            const Datos = {
                ID_HOTEL: IdHotel,
                CALIFICACION: Calificacion,
                COMENTARIO: Comentario
            };

            console.log(Datos);

            try {
                const Respuesta = await fetch("/sc502-vn-proyecto2026-grupo2-hotelcoral/php/Publico/Comentarios.php", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify(Datos)
                });

                const Resultado = await Respuesta.json();

                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: Resultado.success ? "success" : "error",
                    title: Resultado.message,
                    showConfirmButton: false,
                    timer: 3000
                });

                Formulario.reset();
                document.getElementById("TextoComentario").value = "";

                CargarComentarios();

            } catch (error) {
                console.error(error);

                Swal.fire({
                    title: "Error",
                    text: "Ocurrió un problema al enviar el comentario",
                    icon: "error",
                    confirmButtonColor: "#e74c3c"
                });
            }
        });
    }
});


async function CargarComentarios() {

    try {
        const Respuesta = await fetch("/sc502-vn-proyecto2026-grupo2-hotelcoral/php/Publico/Comentarios.php", { credentials: "include" });
        const Datos = await Respuesta.json();

        if (Datos.success) {
            RenderComentarios(Datos.data);
        }

    } catch (error) {
        console.error(error);

        Swal.fire({
            title: "Error",
            text: "Ocurrió un problema al enviar el comentario",
            icon: "error",
            confirmButtonColor: "#e74c3c"
        });
    }
}

function RenderComentarios(Lista) {

    const Contenedor = document.getElementById("ListaComentarios");

    Contenedor.innerHTML = "";
    // comentario.NOMBRE.charAt(0)
    // (comentario.NOMBRE || "U").charAt(0)

    Lista.forEach(comentario => {

        const Estrellas = "★".repeat(Math.round(comentario.CALIFICACION));

        const Tarjeta = `
        <div class="TarjetaComentario">
            <div class="ComentarioHeaderTarjeta">
                <div class="UsuarioInfo">
                    <div class="Avatar">${comentario.NOMBRE.charAt(0)}</div>
                    <div>
                        <h3>${comentario.NOMBRE} ${comentario.APELLIDO}</h3>
                        <span class="Lugar">${comentario.NOMBRE_HOTEL}</span>
                    </div>
                </div>
                <div class="EstrellasComentario">
                    ${Estrellas}
                </div>
            </div>

            <p>${comentario.COMENTARIO}</p>

            ${comentario.RESPUESTA_ADMIN ? `
                <div class="RespuestaHotel">
                    <div class="AdminInfo">
                        <div class="AvatarAdmin">H</div>
                        <strong>Hotel Coral</strong>
                    </div>
                    <p>${comentario.RESPUESTA_ADMIN}</p>
                </div>
                ` : ""
            }
        </div>
        `;

        Contenedor.innerHTML += Tarjeta;
    });
}

