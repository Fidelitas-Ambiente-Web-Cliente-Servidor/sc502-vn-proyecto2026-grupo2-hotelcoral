document.addEventListener("DOMContentLoaded", () => {
    const MensajeTiposHabitacion = document.getElementById("MensajeTiposHabitacion");
    const InputBuscarTipoHabitacion = document.getElementById("InputBuscarTipoHabitacion");
    const SelectFiltroHotelTipoHabitacion = document.getElementById("SelectFiltroHotelTipoHabitacion");
    const CuerpoTablaTiposHabitacion = document.getElementById("CuerpoTablaTiposHabitacion");

    let ListaHoteles = [];
    let ListaTiposHabitacion = [];

    InicializarModulo();

    async function InicializarModulo() {
        if (InputBuscarTipoHabitacion) {
            InputBuscarTipoHabitacion.addEventListener("input", AplicarFiltros);
        }

        if (SelectFiltroHotelTipoHabitacion) {
            SelectFiltroHotelTipoHabitacion.addEventListener("change", AplicarFiltros);
        }

        await CargarHoteles();
        await CargarTiposHabitacion();
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
            MostrarMensaje(MensajeTiposHabitacion, "No fue posible cargar los hoteles.", "error");
        }
    }

    async function CargarTiposHabitacion() {
        MostrarFilaCarga("Cargando tipos de habitación...");
        LimpiarMensaje(MensajeTiposHabitacion);

        try {
            const Respuesta = await fetch("php/Admin/TiposHabitacion.php", {
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
                    MensajeTiposHabitacion,
                    Resultado.message || "No fue posible cargar los tipos de habitación.",
                    "error"
                );
                MostrarFilaCarga("No fue posible cargar los tipos de habitación.");
                return;
            }

            ListaTiposHabitacion = Array.isArray(Resultado.data?.TiposHabitacion)
                ? Resultado.data.TiposHabitacion
                : [];

            AplicarFiltros();
        } catch (Error) {
            console.error("Error al cargar tipos de habitación:", Error);
            MostrarMensaje(
                MensajeTiposHabitacion,
                "Ocurrió un error inesperado al cargar los tipos de habitación.",
                "error"
            );
            MostrarFilaCarga("No fue posible cargar los tipos de habitación.");
        }
    }

    function RenderizarSelectHoteles() {
        if (!SelectFiltroHotelTipoHabitacion) {
            return;
        }

        SelectFiltroHotelTipoHabitacion.innerHTML = `
            <option value="">Todos los hoteles</option>
        `;

        ListaHoteles.forEach((Hotel) => {
            const Opcion = document.createElement("option");
            Opcion.value = Hotel.ID_HOTEL;
            Opcion.textContent = Hotel.NOMBRE_HOTEL;
            SelectFiltroHotelTipoHabitacion.appendChild(Opcion);
        });
    }

    function AplicarFiltros() {
        const TextoBusqueda = (InputBuscarTipoHabitacion?.value || "").trim().toLowerCase();
        const IdHotel = String(SelectFiltroHotelTipoHabitacion?.value || "").trim();

        let TiposFiltrados = [...ListaTiposHabitacion];

        if (TextoBusqueda !== "") {
            TiposFiltrados = TiposFiltrados.filter((TipoHabitacion) => {
                const NombreTipo = String(TipoHabitacion.NOMBRE_TIPO ?? "").toLowerCase();
                const NombreHotel = String(TipoHabitacion.NOMBRE_HOTEL ?? "").toLowerCase();

                return NombreTipo.includes(TextoBusqueda) || NombreHotel.includes(TextoBusqueda);
            });
        }

        if (IdHotel !== "") {
            TiposFiltrados = TiposFiltrados.filter((TipoHabitacion) => {
                return String(TipoHabitacion.ID_HOTEL) === IdHotel;
            });
        }

        RenderizarTabla(TiposFiltrados);
    }

    function RenderizarTabla(TiposHabitacion) {
        if (!CuerpoTablaTiposHabitacion) {
            return;
        }

        CuerpoTablaTiposHabitacion.innerHTML = "";

        if (!Array.isArray(TiposHabitacion) || TiposHabitacion.length === 0) {
            CuerpoTablaTiposHabitacion.innerHTML = `
                <tr>
                    <td colspan="8">No se encontraron tipos de habitación.</td>
                </tr>
            `;
            return;
        }

        TiposHabitacion.forEach((TipoHabitacion) => {
            const Fila = document.createElement("tr");

            const IdTipoHabitacion = Number(TipoHabitacion.ID_TIPO_HABITACION);
            const EstadoActual = String(TipoHabitacion.ESTADO_TIPO_HABITACION ?? "").toUpperCase();
            const NuevoEstado = EstadoActual === "ACTIVO" ? "INACTIVO" : "ACTIVO";
            const TextoBotonEstado = EstadoActual === "ACTIVO" ? "Inactivar" : "Activar";
            const UrlImagen = String(TipoHabitacion.URL_IMAGEN ?? "").trim();

            Fila.innerHTML = `
                <td>
                    ${UrlImagen !== ""
                        ? `<img src="${EscapeHtml(UrlImagen)}" alt="${EscapeHtml(TipoHabitacion.NOMBRE_TIPO ?? "Tipo")}" style="width:72px;height:52px;object-fit:cover;border-radius:10px;">`
                        : `<span class="EtiquetaRol">Sin imagen</span>`
                    }
                </td>
                <td class="NombreUsuario">${EscapeHtml(TipoHabitacion.NOMBRE_TIPO ?? "No disponible")}</td>
                <td>${EscapeHtml(TipoHabitacion.NOMBRE_HOTEL ?? "No disponible")}</td>
                <td>${EscapeHtml(TipoHabitacion.CAPACIDAD ?? "—")}</td>
                <td>${EscapeHtml(TipoHabitacion.CANTIDAD_CAMAS ?? "—")}</td>
                <td>${EscapeHtml(FormatearMoneda(TipoHabitacion.PRECIO_BASE))}</td>
                <td>
                    <span class="EtiquetaRol ${EstadoActual === "ACTIVO" ? "RolCliente" : "RolAdmin"}">
                        ${EscapeHtml(EstadoActual)}
                    </span>
                </td>
                <td>
                    <div class="FilaAcciones">
                        <a href="CrearTipoHabitacion.html?IdTipoHabitacion=${encodeURIComponent(IdTipoHabitacion)}" class="BotonEditar">
                            Editar
                        </a>
                        <button type="button" class="BotonSecundario" data-id="${IdTipoHabitacion}" data-estado="${NuevoEstado}">
                            ${EscapeHtml(TextoBotonEstado)}
                        </button>
                    </div>
                </td>
            `;

            const BotonEstado = Fila.querySelector("button[data-id]");

            if (BotonEstado) {
                BotonEstado.addEventListener("click", () => {
                    CambiarEstadoTipoHabitacion(IdTipoHabitacion, NuevoEstado);
                });
            }

            CuerpoTablaTiposHabitacion.appendChild(Fila);
        });
    }

    async function CambiarEstadoTipoHabitacion(IdTipoHabitacion, NuevoEstado) {
        const TipoHabitacion = ListaTiposHabitacion.find((Item) => Number(Item.ID_TIPO_HABITACION) === Number(IdTipoHabitacion));

        if (!TipoHabitacion) {
            MostrarMensaje(MensajeTiposHabitacion, "No se encontró el tipo seleccionado.", "error");
            return;
        }

        const Confirmado = window.confirm(
            `¿Deseas cambiar el estado de "${TipoHabitacion.NOMBRE_TIPO}" a ${NuevoEstado}?`
        );

        if (!Confirmado) {
            return;
        }

        try {
            const RespuestaDetalle = await fetch(`php/Admin/TiposHabitacion.php?id=${encodeURIComponent(IdTipoHabitacion)}`, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });

            const ResultadoDetalle = await RespuestaDetalle.json();

            if (!RespuestaDetalle.ok || !ResultadoDetalle.success || !ResultadoDetalle.data?.TipoHabitacion) {
                MostrarMensaje(
                    MensajeTiposHabitacion,
                    ResultadoDetalle.message || "No fue posible cargar el tipo de habitación.",
                    "error"
                );
                return;
            }

            const DatosActuales = ResultadoDetalle.data.TipoHabitacion;

            const Respuesta = await fetch("php/Admin/TiposHabitacion.php", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    IdTipoHabitacion: DatosActuales.ID_TIPO_HABITACION,
                    IdHotel: DatosActuales.ID_HOTEL,
                    NombreTipo: DatosActuales.NOMBRE_TIPO,
                    Descripcion: DatosActuales.DESCRIPCION ?? "",
                    Capacidad: DatosActuales.CAPACIDAD,
                    CantidadCamas: DatosActuales.CANTIDAD_CAMAS,
                    PrecioBase: DatosActuales.PRECIO_BASE,
                    EstadoTipoHabitacion: NuevoEstado,
                    UrlImagen: DatosActuales.URL_IMAGEN ?? "",
                    DescripcionImagen: DatosActuales.DESCRIPCION_IMAGEN ?? ""
                })
            });

            const Resultado = await Respuesta.json();

            if (!Respuesta.ok || !Resultado.success) {
                MostrarMensaje(
                    MensajeTiposHabitacion,
                    Resultado.message || "No fue posible cambiar el estado.",
                    "error"
                );
                return;
            }

            MostrarMensaje(MensajeTiposHabitacion, "Estado actualizado correctamente.", "exito");
            await CargarTiposHabitacion();
        } catch (Error) {
            console.error("Error al cambiar estado:", Error);
            MostrarMensaje(MensajeTiposHabitacion, "Ocurrió un error inesperado al cambiar el estado.", "error");
        }
    }

    function MostrarFilaCarga(Texto) {
        if (!CuerpoTablaTiposHabitacion) {
            return;
        }

        CuerpoTablaTiposHabitacion.innerHTML = `
            <tr>
                <td colspan="8">${EscapeHtml(Texto)}</td>
            </tr>
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
});