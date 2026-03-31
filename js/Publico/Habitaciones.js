document.addEventListener("DOMContentLoaded", () => {
    const Parametros = new URLSearchParams(window.location.search);
    const IdHotelDesdeUrl = String(Parametros.get("IdHotel") || "").trim();

    const MensajeHabitaciones = document.getElementById("MensajeHabitaciones");
    const SelectFiltroHotelPublico = document.getElementById("SelectFiltroHotelPublico");
    const InputBuscarHabitacionPublica = document.getElementById("InputBuscarHabitacionPublica");
    const ContenedorTiposHabitacion = document.getElementById("ContenedorTiposHabitacion");

    let ListaHoteles = [];
    let ListaTiposHabitacion = [];

    InicializarModulo();

    async function InicializarModulo() {
        if (SelectFiltroHotelPublico) {
            SelectFiltroHotelPublico.addEventListener("change", AplicarFiltros);
        }

        if (InputBuscarHabitacionPublica) {
            InputBuscarHabitacionPublica.addEventListener("input", AplicarFiltros);
        }

        await CargarHoteles();
        await CargarTiposHabitacion();

        if (IdHotelDesdeUrl !== "" && SelectFiltroHotelPublico) {
            SelectFiltroHotelPublico.value = IdHotelDesdeUrl;
            AplicarFiltros();
        }
    }

    async function CargarHoteles() {
        try {
            const Respuesta = await fetch("php/Publico/Hoteles.php", {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });

            const Resultado = await Respuesta.json();

            if (!Respuesta.ok || !Resultado.success) {
                throw new Error(Resultado.message || "No fue posible cargar hoteles.");
            }

            ListaHoteles = Array.isArray(Resultado.data?.Hoteles)
                ? Resultado.data.Hoteles
                : [];

            RenderizarSelectHoteles();
        } catch (Error) {
            console.error("Error al cargar hoteles:", Error);
            MostrarMensaje(MensajeHabitaciones, "No fue posible cargar los hoteles.", "error");
        }
    }

    async function CargarTiposHabitacion() {
        MostrarCargando();
        LimpiarMensaje(MensajeHabitaciones);

        try {
            const Respuesta = await fetch("php/Publico/TiposHabitacion.php", {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });

            const Resultado = await Respuesta.json();

            if (!Respuesta.ok || !Resultado.success) {
                MostrarMensaje(
                    MensajeHabitaciones,
                    Resultado.message || "No fue posible cargar las habitaciones.",
                    "error"
                );
                MostrarSinResultados("No fue posible cargar las habitaciones.");
                return;
            }

            ListaTiposHabitacion = Array.isArray(Resultado.data?.TiposHabitacion)
                ? Resultado.data.TiposHabitacion
                : [];

            AplicarFiltros();
        } catch (Error) {
            console.error("Error al cargar tipos de habitación:", Error);
            MostrarMensaje(
                MensajeHabitaciones,
                "Ocurrió un error inesperado al cargar las habitaciones.",
                "error"
            );
            MostrarSinResultados("No fue posible cargar las habitaciones.");
        }
    }

    function RenderizarSelectHoteles() {
        if (!SelectFiltroHotelPublico) {
            return;
        }

        SelectFiltroHotelPublico.innerHTML = `
            <option value="">Todos los hoteles</option>
        `;

        ListaHoteles.forEach((Hotel) => {
            const Opcion = document.createElement("option");
            Opcion.value = Hotel.ID_HOTEL;
            Opcion.textContent = Hotel.NOMBRE_HOTEL;
            SelectFiltroHotelPublico.appendChild(Opcion);
        });
    }

    function AplicarFiltros() {
        const TextoBusqueda = (InputBuscarHabitacionPublica?.value || "").trim().toLowerCase();
        const IdHotel = String(SelectFiltroHotelPublico?.value || "").trim();

        let TiposFiltrados = [...ListaTiposHabitacion];

        if (TextoBusqueda !== "") {
            TiposFiltrados = TiposFiltrados.filter((TipoHabitacion) => {
                const NombreTipo = String(TipoHabitacion.NOMBRE_TIPO ?? "").toLowerCase();
                const NombreHotel = String(TipoHabitacion.NOMBRE_HOTEL ?? "").toLowerCase();
                const Descripcion = String(TipoHabitacion.DESCRIPCION ?? "").toLowerCase();

                return (
                    NombreTipo.includes(TextoBusqueda) ||
                    NombreHotel.includes(TextoBusqueda) ||
                    Descripcion.includes(TextoBusqueda)
                );
            });
        }

        if (IdHotel !== "") {
            TiposFiltrados = TiposFiltrados.filter((TipoHabitacion) => {
                return String(TipoHabitacion.ID_HOTEL) === IdHotel;
            });
        }

        RenderizarTiposHabitacion(TiposFiltrados);
    }

    function RenderizarTiposHabitacion(TiposHabitacion) {
        if (!ContenedorTiposHabitacion) {
            return;
        }

        ContenedorTiposHabitacion.innerHTML = "";

        if (!Array.isArray(TiposHabitacion) || TiposHabitacion.length === 0) {
            MostrarSinResultados("No se encontraron tipos de habitación para el filtro seleccionado.");
            return;
        }

        TiposHabitacion.forEach((TipoHabitacion) => {
            const Tarjeta = document.createElement("article");
            Tarjeta.className = "TarjetaHabitacion";

            const UrlImagen = String(TipoHabitacion.URL_IMAGEN ?? "").trim();
            const UrlReserva = `Reservas.html?IdHotel=${encodeURIComponent(TipoHabitacion.ID_HOTEL)}&IdTipoHabitacion=${encodeURIComponent(TipoHabitacion.ID_TIPO_HABITACION)}`;

          Tarjeta.innerHTML = `
    <div class="ImagenTarjetaHabitacion">
        <img
            src="${UrlImagen !== "" ? EscapeHtmlAtributo(UrlImagen) : "Recursos/Imagenes/HeroFondo.png"}"
            alt="${EscapeHtml(TipoHabitacion.NOMBRE_TIPO ?? "Habitación Hotel Coral")}"
            class="ImagenRealTarjetaHabitacion"
        >
    </div>

    <div class="ContenidoTarjetaHabitacion">
        <div class="EncabezadoTarjetaHabitacion">
            <div>
                <h3 class="TituloTarjetaHabitacion">${EscapeHtml(TipoHabitacion.NOMBRE_TIPO ?? "No disponible")}</h3>
                <p class="TextoHotelTarjeta">${EscapeHtml(TipoHabitacion.NOMBRE_HOTEL ?? "Hotel no disponible")}</p>
            </div>

            <p class="PrecioTarjetaHabitacion">
                ${EscapeHtml(FormatearMoneda(TipoHabitacion.PRECIO_BASE))}
                <span>/noche</span>
            </p>
        </div>

        <p class="DescripcionTarjetaHabitacion">
            ${EscapeHtml(TipoHabitacion.DESCRIPCION ?? "Sin descripción disponible.")}
        </p>

        <ul class="ListaDetallesTarjeta">
            <li>Capacidad: ${EscapeHtml(TipoHabitacion.CAPACIDAD ?? "—")} huésped(es)</li>
            <li>Camas: ${EscapeHtml(TipoHabitacion.CANTIDAD_CAMAS ?? "—")}</li>
            <li>${EscapeHtml(TipoHabitacion.CIUDAD ?? "")}${TipoHabitacion.CIUDAD ? ", " : ""}${EscapeHtml(TipoHabitacion.PROVINCIA ?? "")}</li>
        </ul>

        <a class="BotonTarjetaHabitacion" href="${UrlReserva}">
            Reservar este tipo
        </a>
    </div>
`;

            ContenedorTiposHabitacion.appendChild(Tarjeta);
        });
    }

    function MostrarCargando() {
        if (!ContenedorTiposHabitacion) {
            return;
        }

        ContenedorTiposHabitacion.innerHTML = `
            <article class="TarjetaHabitacion">
                <div class="ContenidoTarjetaHabitacion">
                    <p class="DescripcionTarjetaHabitacion">Cargando habitaciones...</p>
                </div>
            </article>
        `;
    }

  function MostrarSinResultados(Texto) {
    if (!ContenedorTiposHabitacion) {
        return;
    }

    ContenedorTiposHabitacion.innerHTML = `
        <article class="TarjetaVaciaHabitaciones">
            <p class="TextoVacioHabitaciones">${EscapeHtml(Texto)}</p>
        </article>
    `;
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

    function EscapeHtml(Valor) {
        const Texto = String(Valor ?? "");

        return Texto
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function EscapeHtmlAtributo(Valor) {
        return String(Valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("'", "\\'")
            .replaceAll('"', "&quot;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
    }
});