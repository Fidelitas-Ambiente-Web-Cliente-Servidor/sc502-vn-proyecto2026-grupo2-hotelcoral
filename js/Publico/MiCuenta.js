document.addEventListener("DOMContentLoaded", () => {
    const MensajeMiCuenta = document.getElementById("MensajeMiCuenta");
    const BotonCerrarSesion = document.getElementById("BotonCerrarSesion");

    const TextoNombreCompleto = document.getElementById("TextoNombreCompleto");
    const TextoCorreoUsuario = document.getElementById("TextoCorreoUsuario");
    const TextoTelefonoUsuario = document.getElementById("TextoTelefonoUsuario");
    const TextoFechaRegistro = document.getElementById("TextoFechaRegistro");
    const TextoEstadoUsuario = document.getElementById("TextoEstadoUsuario");

    const ContenedorReservas = document.getElementById("ContenedorReservas");
    const ContenedorServicios = document.getElementById("ContenedorServicios");
    const ContenedorComentarios = document.getElementById("ContenedorComentarios");

    InicializarModulo();

    async function InicializarModulo() {
        if (BotonCerrarSesion) {
            BotonCerrarSesion.addEventListener("click", CerrarSesionActual);
        }

        await CargarMiCuenta();
    }

    async function CargarMiCuenta() {
        LimpiarMensaje(MensajeMiCuenta);

        try {
            const Respuesta = await fetch("php/Publico/MiCuenta.php", {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });

            const Resultado = await Respuesta.json();

            if (Respuesta.status === 401) {
                window.location.href = "AccesoCuenta.html";
                return;
            }

            if (!Respuesta.ok || !Resultado.success) {
                MostrarMensaje(
                    MensajeMiCuenta,
                    Resultado.message || "No fue posible cargar tu cuenta.",
                    "error"
                );

                MostrarTextoVacio(
                    ContenedorReservas,
                    "No fue posible cargar tus reservas."
                );

                MostrarTextoVacio(
                    ContenedorServicios,
                    "No fue posible cargar tus servicios."
                );

                MostrarTextoVacio(
                    ContenedorComentarios,
                    "No fue posible cargar tus comentarios."
                );

                return;
            }

            const Usuario = Resultado.data?.Usuario ?? null;
            const Reservas = Resultado.data?.Reservas ?? [];
            const Servicios = Resultado.data?.Servicios ?? [];
            const Comentarios = Resultado.data?.Comentarios ?? [];

            if (!Usuario) {
                MostrarMensaje(
                    MensajeMiCuenta,
                    "No se encontró información del usuario autenticado.",
                    "error"
                );
                return;
            }

            if (Usuario.ROL === "ADMIN") {
                window.location.href = "Admin.html";
                return;
            }

            RenderizarUsuario(Usuario);
            RenderizarReservas(Reservas);
            RenderizarServicios(Servicios);
            RenderizarComentarios(Comentarios);
        } catch (Error) {
            console.error("Error al cargar MiCuenta:", Error);

            MostrarMensaje(
                MensajeMiCuenta,
                "Ocurrió un error inesperado al cargar tu cuenta.",
                "error"
            );

            MostrarTextoVacio(
                ContenedorReservas,
                "No fue posible cargar tus reservas."
            );

            MostrarTextoVacio(
                ContenedorServicios,
                "No fue posible cargar tus servicios."
            );

            MostrarTextoVacio(
                ContenedorComentarios,
                "No fue posible cargar tus comentarios."
            );
        }
    }

    function RenderizarUsuario(Usuario) {
        const Nombre = Usuario.NOMBRE ?? "";
        const Apellido = Usuario.APELLIDO ?? "";
        const Correo = Usuario.CORREO ?? "No disponible";
        const Telefono = Usuario.TELEFONO ?? "No registrado";
        const Estado = Usuario.ESTADO_USUARIO ?? "No disponible";
        const FechaRegistro = Usuario.FECHA_REGISTRO ?? "";

        if (TextoNombreCompleto) {
            TextoNombreCompleto.textContent = `${Nombre} ${Apellido}`.trim() || "No disponible";
        }

        if (TextoCorreoUsuario) {
            TextoCorreoUsuario.textContent = Correo;
        }

        if (TextoTelefonoUsuario) {
            TextoTelefonoUsuario.textContent = Telefono || "No registrado";
        }

        if (TextoFechaRegistro) {
            TextoFechaRegistro.textContent = FormatearFechaHora(FechaRegistro);
        }

        if (TextoEstadoUsuario) {
            TextoEstadoUsuario.textContent = Estado;
        }
    }

    function RenderizarReservas(Reservas) {
        if (!ContenedorReservas) {
            return;
        }

        ContenedorReservas.innerHTML = "";

        if (!Array.isArray(Reservas) || Reservas.length === 0) {
            MostrarTextoVacio(
                ContenedorReservas,
                "Todavía no tienes reservas registradas."
            );
            return;
        }

        Reservas.forEach((Reserva) => {
            const TarjetaReserva = document.createElement("article");
            TarjetaReserva.className = "TarjetaListadoCuenta";

            TarjetaReserva.innerHTML = `
                <div class="EncabezadoListadoCuenta">
                    <h3 class="TituloListadoCuenta">Reserva #${EscapeHtml(Reserva.ID_RESERVA ?? "—")}</h3>
                    <span class="EtiquetaEstadoCuenta">${EscapeHtml(Reserva.ESTADO_RESERVA ?? "No disponible")}</span>
                </div>

                <div class="CuerpoListadoCuenta">
                    <p><strong>Hotel:</strong> ${EscapeHtml(Reserva.HOTEL ?? "No disponible")}</p>
                    <p><strong>Tipo de habitación:</strong> ${EscapeHtml(Reserva.TIPO_HABITACION ?? "No disponible")}</p>
                    <p><strong>Entrada:</strong> ${EscapeHtml(FormatearFecha(Reserva.FECHA_CHECK_IN))}</p>
                    <p><strong>Salida:</strong> ${EscapeHtml(FormatearFecha(Reserva.FECHA_CHECK_OUT))}</p>
                    <p><strong>Huéspedes:</strong> ${EscapeHtml(Reserva.CANTIDAD_HUESPEDES ?? "No disponible")}</p>
                    <p><strong>Total:</strong> ${EscapeHtml(FormatearMoneda(Reserva.TOTAL_RESERVA))}</p>
                </div>
            `;

            ContenedorReservas.appendChild(TarjetaReserva);
        });
    }

    function RenderizarServicios(Servicios) {
        if (!ContenedorServicios) {
            return;
        }

        ContenedorServicios.innerHTML = "";

        if (!Array.isArray(Servicios) || Servicios.length === 0) {
            MostrarTextoVacio(
                ContenedorServicios,
                "Todavía no tienes servicios registrados."
            );
            return;
        }

        Servicios.forEach((Servicio) => {
            const TarjetaServicio = document.createElement("article");
            TarjetaServicio.className = "TarjetaListadoCuenta";

            TarjetaServicio.innerHTML = `
                <div class="EncabezadoListadoCuenta">
                    <h3 class="TituloListadoCuenta">${EscapeHtml(Servicio.NOMBRE_SERVICIO ?? "Servicio no disponible")}</h3>
                    <span class="EtiquetaEstadoCuenta">Reserva #${EscapeHtml(Servicio.ID_RESERVA ?? "—")}</span>
                </div>

                <div class="CuerpoListadoCuenta">
                    <p><strong>Hotel:</strong> ${EscapeHtml(Servicio.HOTEL ?? "No disponible")}</p>
                    <p><strong>Fecha del servicio:</strong> ${EscapeHtml(FormatearFechaHora(Servicio.FECHA_SERVICIO))}</p>
                    <p><strong>Cantidad:</strong> ${EscapeHtml(Servicio.CANTIDAD ?? "No disponible")}</p>
                    <p><strong>Precio unitario:</strong> ${EscapeHtml(FormatearMoneda(Servicio.PRECIO_UNITARIO))}</p>
                    <p><strong>Subtotal:</strong> ${EscapeHtml(FormatearMoneda(Servicio.SUBTOTAL))}</p>
                </div>
            `;

            ContenedorServicios.appendChild(TarjetaServicio);
        });
    }

    function RenderizarComentarios(Comentarios) {
        if (!ContenedorComentarios) {
            return;
        }

        ContenedorComentarios.innerHTML = "";

        if (!Array.isArray(Comentarios) || Comentarios.length === 0) {
            MostrarTextoVacio(
                ContenedorComentarios,
                "Todavía no tienes comentarios registrados."
            );
            return;
        }

        Comentarios.forEach((Comentario) => {
            const TarjetaComentario = document.createElement("article");
            TarjetaComentario.className = "TarjetaListadoCuenta";

            const RespuestaAdmin = Comentario.RESPUESTA_ADMIN
                ? `
                    <div class="BloqueRespuestaCuenta">
                        <p><strong>Respuesta del hotel:</strong></p>
                        <p>${EscapeHtml(Comentario.RESPUESTA_ADMIN)}</p>
                    </div>
                `
                : "";

            TarjetaComentario.innerHTML = `
                <div class="EncabezadoListadoCuenta">
                    <h3 class="TituloListadoCuenta">${EscapeHtml(Comentario.HOTEL ?? "Hotel no disponible")}</h3>
                    <span class="EtiquetaEstadoCuenta">${EscapeHtml(Comentario.ESTADO_COMENTARIO ?? "No disponible")}</span>
                </div>

                <div class="CuerpoListadoCuenta">
                    <p><strong>Fecha:</strong> ${EscapeHtml(FormatearFechaHora(Comentario.FECHA_COMENTARIO))}</p>
                    <p><strong>Calificación:</strong> ${EscapeHtml(Comentario.CALIFICACION ?? "No disponible")} / 5</p>
                    <p><strong>Comentario:</strong> ${EscapeHtml(Comentario.COMENTARIO ?? "Sin comentario")}</p>
                    ${RespuestaAdmin}
                </div>
            `;

            ContenedorComentarios.appendChild(TarjetaComentario);
        });
    }

    async function CerrarSesionActual() {
        try {
            if (BotonCerrarSesion) {
                BotonCerrarSesion.disabled = true;
                BotonCerrarSesion.textContent = "Cerrando...";
            }

            const Respuesta = await fetch("php/Auth/CerrarSesion.php", {
                method: "POST",
                headers: {
                    "Accept": "application/json"
                }
            });

            const Resultado = await Respuesta.json();

            if (!Respuesta.ok || !Resultado.success) {
                throw new Error(Resultado.message || "No fue posible cerrar sesión.");
            }

            window.location.href = "AccesoCuenta.html";
        } catch (Error) {
            console.error("Error al cerrar sesión:", Error);
            MostrarMensaje(
                MensajeMiCuenta,
                Error.message || "No fue posible cerrar la sesión.",
                "error"
            );
        } finally {
            if (BotonCerrarSesion) {
                BotonCerrarSesion.disabled = false;
                BotonCerrarSesion.textContent = "Cerrar sesión";
            }
        }
    }

    function MostrarTextoVacio(Contenedor, Texto) {
        if (!Contenedor) {
            return;
        }

        Contenedor.innerHTML = `<p class="TextoVacio">${EscapeHtml(Texto)}</p>`;
    }

    function MostrarMensaje(Contenedor, Texto, Tipo = "info") {
        if (!Contenedor) {
            return;
        }

        Contenedor.textContent = Texto;
        Contenedor.style.display = "block";

        if (Tipo === "error") {
            Contenedor.style.color = "#8B1E1E";
            Contenedor.style.backgroundColor = "#FCE8E6";
            Contenedor.style.border = "1px solid #F4C7C3";
        } else if (Tipo === "exito") {
            Contenedor.style.color = "#1E5E3A";
            Contenedor.style.backgroundColor = "#E6F4EA";
            Contenedor.style.border = "1px solid #B7DFBE";
        } else {
            Contenedor.style.color = "#243238";
            Contenedor.style.backgroundColor = "#F5EFE6";
            Contenedor.style.border = "1px solid #D9C3A3";
        }

        Contenedor.style.padding = "0.85rem 1rem";
        Contenedor.style.borderRadius = "12px";
        Contenedor.style.marginBottom = "1rem";
    }

    function LimpiarMensaje(Contenedor) {
        if (!Contenedor) {
            return;
        }

        Contenedor.textContent = "";
        Contenedor.style.display = "none";
        Contenedor.style.color = "";
        Contenedor.style.backgroundColor = "";
        Contenedor.style.border = "";
        Contenedor.style.padding = "";
        Contenedor.style.borderRadius = "";
        Contenedor.style.marginBottom = "";
    }

    function FormatearFecha(FechaTexto) {
        if (!FechaTexto) {
            return "No disponible";
        }

        const Fecha = new Date(`${FechaTexto}T00:00:00`);

        if (Number.isNaN(Fecha.getTime())) {
            return FechaTexto;
        }

        return Fecha.toLocaleDateString("es-CR", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }

    function FormatearFechaHora(FechaTexto) {
        if (!FechaTexto) {
            return "No disponible";
        }

        const Fecha = new Date(String(FechaTexto).replace(" ", "T"));

        if (Number.isNaN(Fecha.getTime())) {
            return FechaTexto;
        }

        return Fecha.toLocaleString("es-CR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function FormatearMoneda(Valor) {
        const Numero = Number(Valor);

        if (Number.isNaN(Numero)) {
            return "No disponible";
        }

        return Numero.toLocaleString("es-CR", {
            style: "currency",
            currency: "CRC"
        });
    }

    function EscapeHtml(Valor) {
        const Texto = String(Valor ?? "");

        return Texto
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
});