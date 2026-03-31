document.addEventListener("DOMContentLoaded", () => {
    const MensajeHabitacionesFisicas = document.getElementById("MensajeHabitacionesFisicas");
    const InputBuscarHabitacionFisica = document.getElementById("InputBuscarHabitacionFisica");
    const SelectFiltroHotelHabitacionFisica = document.getElementById("SelectFiltroHotelHabitacionFisica");
    const CuerpoTablaHabitacionesFisicas = document.getElementById("CuerpoTablaHabitacionesFisicas");

    let ListaHoteles = [];
    let ListaHabitacionesFisicas = [];

    InicializarModulo();

    async function InicializarModulo() {
        if (InputBuscarHabitacionFisica) {
            InputBuscarHabitacionFisica.addEventListener("input", AplicarFiltros);
        }

        if (SelectFiltroHotelHabitacionFisica) {
            SelectFiltroHotelHabitacionFisica.addEventListener("change", AplicarFiltros);
        }

        await CargarHoteles();
        await CargarHabitacionesFisicas();
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
            MostrarMensaje(MensajeHabitacionesFisicas, "No fue posible cargar los hoteles.", "error");
        }
    }

    async function CargarHabitacionesFisicas() {
        MostrarFilaCarga("Cargando habitaciones físicas...");
        LimpiarMensaje(MensajeHabitacionesFisicas);

        try {
            const Respuesta = await fetch("php/Admin/HabitacionesFisicas.php", {
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

            if (Respuesta.status === 403) {
                window.location.href = "MiCuenta.html";
                return;
            }

            if (!Respuesta.ok || !Resultado.success) {
                MostrarMensaje(
                    MensajeHabitacionesFisicas,
                    Resultado.message || "No fue posible cargar las habitaciones físicas.",
                    "error"
                );
                MostrarFilaCarga("No fue posible cargar las habitaciones físicas.");
                return;
            }

            ListaHabitacionesFisicas = Array.isArray(Resultado.data?.HabitacionesFisicas)
                ? Resultado.data.HabitacionesFisicas
                : [];

            AplicarFiltros();
        } catch (Error) {
            console.error("Error al cargar habitaciones físicas:", Error);
            MostrarMensaje(
                MensajeHabitacionesFisicas,
                "Ocurrió un error inesperado al cargar las habitaciones físicas.",
                "error"
            );
            MostrarFilaCarga("No fue posible cargar las habitaciones físicas.");
        }
    }

    function RenderizarSelectHoteles() {
        if (!SelectFiltroHotelHabitacionFisica) {
            return;
        }

        SelectFiltroHotelHabitacionFisica.innerHTML = `
            <option value="">Todos los hoteles</option>
        `;

        ListaHoteles.forEach((Hotel) => {
            const Opcion = document.createElement("option");
            Opcion.value = Hotel.ID_HOTEL;
            Opcion.textContent = Hotel.NOMBRE_HOTEL;
            SelectFiltroHotelHabitacionFisica.appendChild(Opcion);
        });
    }

    function AplicarFiltros() {
        const TextoBusqueda = (InputBuscarHabitacionFisica?.value || "").trim().toLowerCase();
        const IdHotel = String(SelectFiltroHotelHabitacionFisica?.value || "").trim();

        let HabitacionesFiltradas = [...ListaHabitacionesFisicas];

        if (TextoBusqueda !== "") {
            HabitacionesFiltradas = HabitacionesFiltradas.filter((HabitacionFisica) => {
                const Numero = String(HabitacionFisica.NUMERO_HABITACION ?? "").toLowerCase();
                const Tipo = String(HabitacionFisica.NOMBRE_TIPO ?? "").toLowerCase();
                const Hotel = String(HabitacionFisica.NOMBRE_HOTEL ?? "").toLowerCase();
                const Amenidades = String(HabitacionFisica.AMENIDADES ?? "").toLowerCase();

                return (
                    Numero.includes(TextoBusqueda) ||
                    Tipo.includes(TextoBusqueda) ||
                    Hotel.includes(TextoBusqueda) ||
                    Amenidades.includes(TextoBusqueda)
                );
            });
        }

        if (IdHotel !== "") {
            HabitacionesFiltradas = HabitacionesFiltradas.filter((HabitacionFisica) => {
                return String(HabitacionFisica.ID_HOTEL) === IdHotel;
            });
        }

        RenderizarTabla(HabitacionesFiltradas);
    }

    function RenderizarTabla(HabitacionesFisicas) {
        if (!CuerpoTablaHabitacionesFisicas) {
            return;
        }

        CuerpoTablaHabitacionesFisicas.innerHTML = "";

        if (!Array.isArray(HabitacionesFisicas) || HabitacionesFisicas.length === 0) {
            CuerpoTablaHabitacionesFisicas.innerHTML = `
                <tr>
                    <td colspan="8">No se encontraron habitaciones físicas.</td>
                </tr>
            `;
            return;
        }

        HabitacionesFisicas.forEach((HabitacionFisica) => {
            const Fila = document.createElement("tr");

            const IdHabitacion = Number(HabitacionFisica.ID_HABITACION);
            const EstadoActual = String(HabitacionFisica.ESTADO_HABITACION ?? "").toUpperCase();
            const NuevoEstado = ObtenerSiguienteEstado(EstadoActual);
            const TextoBotonEstado = ObtenerTextoBotonEstado(EstadoActual);
            const Amenidades = String(HabitacionFisica.AMENIDADES ?? "").trim();

            Fila.innerHTML = `
                <td class="NombreUsuario">${EscapeHtml(HabitacionFisica.NUMERO_HABITACION ?? "No disponible")}</td>
                <td>${EscapeHtml(HabitacionFisica.NOMBRE_HOTEL ?? "No disponible")}</td>
                <td>${EscapeHtml(HabitacionFisica.NOMBRE_TIPO ?? "No disponible")}</td>
                <td>${EscapeHtml(HabitacionFisica.PISO ?? "—")}</td>
                <td>
                    <span class="EtiquetaRol ${ObtenerClaseEstado(EstadoActual)}">
                        ${EscapeHtml(EstadoActual)}
                    </span>
                </td>
                <td>
                    ${Amenidades !== ""
                        ? `<span class="TextoAmenidadesListado">${EscapeHtml(Amenidades)}</span>`
                        : `<span class="TextoAmenidadesVacio">Sin amenidades</span>`
                    }
                </td>
                <td>${EscapeHtml(HabitacionFisica.DESCRIPCION ?? "")}</td>
                <td>
                    <div class="FilaAcciones">
                        <a href="CrearHabitacionFisica.html?IdHabitacion=${encodeURIComponent(IdHabitacion)}" class="BotonEditar">
                            Editar
                        </a>
                        <button type="button" class="BotonSecundario" data-id="${IdHabitacion}" data-estado="${NuevoEstado}">
                            ${EscapeHtml(TextoBotonEstado)}
                        </button>
                    </div>
                </td>
            `;

            const BotonEstado = Fila.querySelector("button[data-id]");

            if (BotonEstado && NuevoEstado !== "") {
                BotonEstado.addEventListener("click", () => {
                    CambiarEstadoHabitacionFisica(IdHabitacion, NuevoEstado);
                });
            }

            CuerpoTablaHabitacionesFisicas.appendChild(Fila);
        });
    }

    async function CambiarEstadoHabitacionFisica(IdHabitacion, NuevoEstado) {
        const HabitacionFisica = ListaHabitacionesFisicas.find((Item) => Number(Item.ID_HABITACION) === Number(IdHabitacion));

        if (!HabitacionFisica) {
            MostrarMensaje(MensajeHabitacionesFisicas, "No se encontró la habitación seleccionada.", "error");
            return;
        }

        const Confirmado = window.confirm(
            `¿Deseas cambiar el estado de la habitación ${HabitacionFisica.NUMERO_HABITACION} a ${NuevoEstado}?`
        );

        if (!Confirmado) {
            return;
        }

        try {
            const RespuestaDetalle = await fetch(`php/Admin/HabitacionesFisicas.php?id=${encodeURIComponent(IdHabitacion)}`, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });

            const ResultadoDetalle = await RespuestaDetalle.json();

            if (!RespuestaDetalle.ok || !ResultadoDetalle.success || !ResultadoDetalle.data?.HabitacionFisica) {
                MostrarMensaje(
                    MensajeHabitacionesFisicas,
                    ResultadoDetalle.message || "No fue posible cargar la habitación.",
                    "error"
                );
                return;
            }

            const DatosActuales = ResultadoDetalle.data.HabitacionFisica;
            const AmenidadesActuales = Array.isArray(ResultadoDetalle.data?.Amenidades)
                ? ResultadoDetalle.data.Amenidades
                : [];

            const Respuesta = await fetch("php/Admin/HabitacionesFisicas.php", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    IdHabitacion: DatosActuales.ID_HABITACION,
                    IdHotel: DatosActuales.ID_HOTEL,
                    IdTipoHabitacion: DatosActuales.ID_TIPO_HABITACION,
                    NumeroHabitacion: DatosActuales.NUMERO_HABITACION,
                    Piso: DatosActuales.PISO ?? "",
                    EstadoHabitacion: NuevoEstado,
                    Descripcion: DatosActuales.DESCRIPCION ?? "",
                    Amenidades: AmenidadesActuales
                })
            });

            const Resultado = await Respuesta.json();

            if (!Respuesta.ok || !Resultado.success) {
                MostrarMensaje(
                    MensajeHabitacionesFisicas,
                    Resultado.message || "No fue posible cambiar el estado.",
                    "error"
                );
                return;
            }

            MostrarMensaje(MensajeHabitacionesFisicas, "Estado actualizado correctamente.", "exito");
            await CargarHabitacionesFisicas();
        } catch (Error) {
            console.error("Error al cambiar estado:", Error);
            MostrarMensaje(MensajeHabitacionesFisicas, "Ocurrió un error inesperado al cambiar el estado.", "error");
        }
    }

    function ObtenerSiguienteEstado(EstadoActual) {
        if (EstadoActual === "DISPONIBLE") {
            return "MANTENIMIENTO";
        }

        if (EstadoActual === "MANTENIMIENTO") {
            return "DISPONIBLE";
        }

        if (EstadoActual === "INACTIVA") {
            return "DISPONIBLE";
        }

        if (EstadoActual === "OCUPADA") {
            return "MANTENIMIENTO";
        }

        return "";
    }

    function ObtenerTextoBotonEstado(EstadoActual) {
        if (EstadoActual === "DISPONIBLE") {
            return "Mantenimiento";
        }

        if (EstadoActual === "MANTENIMIENTO") {
            return "Activar";
        }

        if (EstadoActual === "INACTIVA") {
            return "Activar";
        }

        if (EstadoActual === "OCUPADA") {
            return "Mantenimiento";
        }

        return "Cambiar estado";
    }

    function ObtenerClaseEstado(EstadoActual) {
        if (EstadoActual === "DISPONIBLE") {
            return "RolCliente";
        }

        if (EstadoActual === "OCUPADA") {
            return "RolAdmin";
        }

        if (EstadoActual === "MANTENIMIENTO") {
            return "RolAdmin";
        }

        if (EstadoActual === "INACTIVA") {
            return "RolAdmin";
        }

        return "";
    }

    function MostrarFilaCarga(Texto) {
        if (!CuerpoTablaHabitacionesFisicas) {
            return;
        }

        CuerpoTablaHabitacionesFisicas.innerHTML = `
            <tr>
                <td colspan="8">${EscapeHtml(Texto)}</td>
            </tr>
        `;
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
});