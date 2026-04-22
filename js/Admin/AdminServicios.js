document.addEventListener("DOMContentLoaded", () => {
    const MensajeAdminServicios = document.getElementById("MensajeAdminServicios");

    const FormularioServicio = document.getElementById("FormularioServicio");
    const TituloFormularioServicio = document.getElementById("TituloFormularioServicio");
    const InputIdServicio = document.getElementById("InputIdServicio");
    const SelectHotelServicio = document.getElementById("SelectHotelServicio");
    const InputNombreServicio = document.getElementById("InputNombreServicio");
    const TextAreaDescripcionServicio = document.getElementById("TextAreaDescripcionServicio");
    const InputPrecioServicio = document.getElementById("InputPrecioServicio");
    const SelectEstadoServicio = document.getElementById("SelectEstadoServicio");
    const BotonGuardarServicio = document.getElementById("BotonGuardarServicio");
    const BotonCancelarEdicionServicio = document.getElementById("BotonCancelarEdicionServicio");

    const InputBuscarServicioAdmin = document.getElementById("InputBuscarServicioAdmin");
    const SelectFiltroHotelServicioAdmin = document.getElementById("SelectFiltroHotelServicioAdmin");
    const SelectFiltroEstadoServicioAdmin = document.getElementById("SelectFiltroEstadoServicioAdmin");
    const CuerpoTablaServicios = document.getElementById("CuerpoTablaServicios");

    let ListaHoteles = [];
    let ListaServicios = [];

    InicializarModulo();

    async function InicializarModulo() {
        AsignarEventos();
        await CargarHoteles();
        await CargarServicios();
        ReiniciarFormulario();
    }

    function AsignarEventos() {
        if (FormularioServicio) {
            FormularioServicio.addEventListener("submit", GuardarServicio);
        }

        if (BotonCancelarEdicionServicio) {
            BotonCancelarEdicionServicio.addEventListener("click", ReiniciarFormulario);
        }

        if (InputBuscarServicioAdmin) {
            InputBuscarServicioAdmin.addEventListener("input", AplicarFiltros);
        }

        if (SelectFiltroHotelServicioAdmin) {
            SelectFiltroHotelServicioAdmin.addEventListener("change", AplicarFiltros);
        }

        if (SelectFiltroEstadoServicioAdmin) {
            SelectFiltroEstadoServicioAdmin.addEventListener("change", AplicarFiltros);
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
                throw new Error(Resultado.message || "No fue posible cargar los hoteles.");
            }

            ListaHoteles = Array.isArray(Resultado.data?.Hoteles) ? Resultado.data.Hoteles : [];
            RenderizarSelectHoteles();
        } catch (Error) {
            console.error("Error al cargar hoteles:", Error);
            MostrarMensaje(MensajeAdminServicios, "No fue posible cargar los hoteles.", "error");
        }
    }

    async function CargarServicios() {
        LimpiarMensaje(MensajeAdminServicios);
        MostrarFilaCarga("Cargando servicios.");

        try {
            const Respuesta = await fetch("php/Admin/AdminServicios.php", {
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
                throw new Error(Resultado.message || "No fue posible cargar los servicios.");
            }

            ListaServicios = Array.isArray(Resultado.data?.Servicios) ? Resultado.data.Servicios : [];
            AplicarFiltros();
        } catch (Error) {
            console.error("Error al cargar servicios:", Error);
            MostrarMensaje(MensajeAdminServicios, Error.message || "No fue posible cargar los servicios.", "error");
            MostrarFilaCarga("No fue posible cargar los servicios.");
        }
    }

    function RenderizarSelectHoteles() {
        if (SelectHotelServicio) {
            SelectHotelServicio.innerHTML = `<option value="">Selecciona un hotel</option>`;
        }

        if (SelectFiltroHotelServicioAdmin) {
            SelectFiltroHotelServicioAdmin.innerHTML = `<option value="">Todos los hoteles</option>`;
        }

        ListaHoteles.forEach((Hotel) => {
            if (SelectHotelServicio) {
                const OpcionFormulario = document.createElement("option");
                OpcionFormulario.value = String(Hotel.ID_HOTEL);
                OpcionFormulario.textContent = Hotel.NOMBRE_HOTEL;
                SelectHotelServicio.appendChild(OpcionFormulario);
            }

            if (SelectFiltroHotelServicioAdmin) {
                const OpcionFiltro = document.createElement("option");
                OpcionFiltro.value = String(Hotel.ID_HOTEL);
                OpcionFiltro.textContent = Hotel.NOMBRE_HOTEL;
                SelectFiltroHotelServicioAdmin.appendChild(OpcionFiltro);
            }
        });
    }

    function AplicarFiltros() {
        const TextoBusqueda = String(InputBuscarServicioAdmin?.value || "").trim().toLowerCase();
        const IdHotel = String(SelectFiltroHotelServicioAdmin?.value || "").trim();
        const Estado = String(SelectFiltroEstadoServicioAdmin?.value || "").trim().toUpperCase();

        let ServiciosFiltrados = [...ListaServicios];

        if (TextoBusqueda !== "") {
            ServiciosFiltrados = ServiciosFiltrados.filter((Servicio) => {
                const Nombre = String(Servicio.NOMBRE_SERVICIO ?? "").toLowerCase();
                const Hotel = String(Servicio.NOMBRE_HOTEL ?? "").toLowerCase();
                const Descripcion = String(Servicio.DESCRIPCION ?? "").toLowerCase();

                return (
                    Nombre.includes(TextoBusqueda) ||
                    Hotel.includes(TextoBusqueda) ||
                    Descripcion.includes(TextoBusqueda)
                );
            });
        }

        if (IdHotel !== "") {
            ServiciosFiltrados = ServiciosFiltrados.filter((Servicio) => {
                return String(Servicio.ID_HOTEL) === IdHotel;
            });
        }

        if (Estado !== "") {
            ServiciosFiltrados = ServiciosFiltrados.filter((Servicio) => {
                return String(Servicio.ESTADO_SERVICIO ?? "").toUpperCase() === Estado;
            });
        }

        RenderizarTabla(ServiciosFiltrados);
    }

    function RenderizarTabla(Servicios) {
        if (!CuerpoTablaServicios) {
            return;
        }

        CuerpoTablaServicios.innerHTML = "";

        if (!Array.isArray(Servicios) || Servicios.length === 0) {
            CuerpoTablaServicios.innerHTML = `
                <tr>
                    <td colspan="7">No se encontraron servicios.</td>
                </tr>
            `;
            return;
        }

        Servicios.forEach((Servicio) => {
            const Fila = document.createElement("tr");
            const EstadoActual = String(Servicio.ESTADO_SERVICIO ?? "").toUpperCase();
            const DescripcionCorta = String(Servicio.DESCRIPCION ?? "");

            Fila.innerHTML = `
                <td>#${EscapeHtml(Servicio.ID_SERVICIO ?? "—")}</td>
                <td>${EscapeHtml(Servicio.NOMBRE_SERVICIO ?? "No disponible")}</td>
                <td>${EscapeHtml(Servicio.NOMBRE_HOTEL ?? "No disponible")}</td>
                <td>${EscapeHtml(DescripcionCorta.length > 80 ? `${DescripcionCorta.slice(0, 80)}...` : DescripcionCorta || "Sin descripción")}</td>
                <td>${EscapeHtml(FormatearMoneda(Servicio.PRECIO))}</td>
                <td>
                    <span class="EtiquetaRol ${ObtenerClaseEstado(EstadoActual)}">
                        ${EscapeHtml(EstadoActual)}
                    </span>
                </td>
                <td>
                    <div class="FilaAcciones">
                        <button type="button" class="BotonEditar" data-editar="${Servicio.ID_SERVICIO}">
                            Editar
                        </button>
                        <button type="button" class="BotonEstado" data-estado="${Servicio.ID_SERVICIO}">
                            ${EstadoActual === "ACTIVO" ? "Inactivar" : "Activar"}
                        </button>
                    </div>
                </td>
            `;

            const BotonEditarFila = Fila.querySelector('button[data-editar]');
            const BotonEstadoFila = Fila.querySelector('button[data-estado]');

            if (BotonEditarFila) {
                BotonEditarFila.addEventListener("click", () => {
                    CargarServicioParaEdicion(Number(Servicio.ID_SERVICIO));
                });
            }

            if (BotonEstadoFila) {
                BotonEstadoFila.addEventListener("click", () => {
                    CambiarEstadoServicio(Number(Servicio.ID_SERVICIO), EstadoActual);
                });
            }

            CuerpoTablaServicios.appendChild(Fila);
        });
    }

    async function CargarServicioParaEdicion(IdServicio) {
        try {
            const Respuesta = await fetch(`php/Admin/AdminServicios.php?id=${encodeURIComponent(IdServicio)}`, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });

            const Resultado = await Respuesta.json();

            if (!Respuesta.ok || !Resultado.success || !Resultado.data?.Servicio) {
                throw new Error(Resultado.message || "No fue posible cargar el servicio.");
            }

            const Servicio = Resultado.data.Servicio;

            InputIdServicio.value = String(Servicio.ID_SERVICIO ?? "");
            SelectHotelServicio.value = String(Servicio.ID_HOTEL ?? "");
            InputNombreServicio.value = String(Servicio.NOMBRE_SERVICIO ?? "");
            TextAreaDescripcionServicio.value = String(Servicio.DESCRIPCION ?? "");
            InputPrecioServicio.value = String(Servicio.PRECIO ?? "");
            SelectEstadoServicio.value = String(Servicio.ESTADO_SERVICIO ?? "ACTIVO");

            if (TituloFormularioServicio) {
                TituloFormularioServicio.textContent = "Editar servicio";
            }

            if (BotonGuardarServicio) {
                BotonGuardarServicio.textContent = "Actualizar servicio";
            }

            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (Error) {
            console.error("Error al cargar servicio:", Error);
            MostrarMensaje(MensajeAdminServicios, Error.message || "No fue posible cargar el servicio.", "error");
        }
    }

    async function GuardarServicio(Evento) {
        Evento.preventDefault();
        LimpiarMensaje(MensajeAdminServicios);

        const IdServicio = Number(InputIdServicio?.value || 0);
        const IdHotel = Number(SelectHotelServicio?.value || 0);
        const NombreServicio = String(InputNombreServicio?.value || "").trim();
        const Descripcion = String(TextAreaDescripcionServicio?.value || "").trim();
        const Precio = Number(InputPrecioServicio?.value || 0);
        const EstadoServicio = String(SelectEstadoServicio?.value || "").trim().toUpperCase();

        if (IdHotel <= 0) {
            MostrarMensaje(MensajeAdminServicios, "Debes seleccionar un hotel.", "error");
            return;
        }

        if (NombreServicio === "") {
            MostrarMensaje(MensajeAdminServicios, "Debes indicar el nombre del servicio.", "error");
            return;
        }

        if (Number.isNaN(Precio) || Precio < 0) {
            MostrarMensaje(MensajeAdminServicios, "Debes indicar un precio válido.", "error");
            return;
        }

        if (!["ACTIVO", "INACTIVO"].includes(EstadoServicio)) {
            MostrarMensaje(MensajeAdminServicios, "El estado del servicio no es válido.", "error");
            return;
        }

        const EsEdicion = IdServicio > 0;
        const Metodo = EsEdicion ? "PUT" : "POST";

        try {
            if (BotonGuardarServicio) {
                BotonGuardarServicio.disabled = true;
                BotonGuardarServicio.textContent = EsEdicion ? "Actualizando..." : "Guardando...";
            }

            const Respuesta = await fetch("php/Admin/AdminServicios.php", {
                method: Metodo,
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    IdServicio,
                    IdHotel,
                    NombreServicio,
                    Descripcion,
                    Precio,
                    EstadoServicio
                })
            });

            const Resultado = await Respuesta.json();

            if (!Respuesta.ok || !Resultado.success) {
                throw new Error(Resultado.message || "No fue posible guardar el servicio.");
            }

            MostrarMensaje(MensajeAdminServicios, Resultado.message || "Servicio guardado correctamente.", "exito");
            ReiniciarFormulario();
            await CargarServicios();
        } catch (Error) {
            console.error("Error al guardar servicio:", Error);
            MostrarMensaje(MensajeAdminServicios, Error.message || "No fue posible guardar el servicio.", "error");
        } finally {
            if (BotonGuardarServicio) {
                BotonGuardarServicio.disabled = false;
                BotonGuardarServicio.textContent = InputIdServicio?.value ? "Actualizar servicio" : "Guardar servicio";
            }
        }
    }

    async function CambiarEstadoServicio(IdServicio, EstadoActual) {
        const NuevoEstado = EstadoActual === "ACTIVO" ? "INACTIVO" : "ACTIVO";

        if (!confirm(`¿Deseas cambiar el estado del servicio a ${NuevoEstado}?`)) {
            return;
        }

        try {
            const Respuesta = await fetch("php/Admin/AdminServicios.php", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    IdServicio,
                    EstadoServicio: NuevoEstado
                })
            });

            const Resultado = await Respuesta.json();

            if (!Respuesta.ok || !Resultado.success) {
                throw new Error(Resultado.message || "No fue posible actualizar el estado del servicio.");
            }

            MostrarMensaje(MensajeAdminServicios, Resultado.message || "Estado actualizado correctamente.", "exito");
            await CargarServicios();
        } catch (Error) {
            console.error("Error al cambiar estado:", Error);
            MostrarMensaje(MensajeAdminServicios, Error.message || "No fue posible actualizar el estado del servicio.", "error");
        }
    }

    function ReiniciarFormulario() {
        if (FormularioServicio) {
            FormularioServicio.reset();
        }

        if (InputIdServicio) {
            InputIdServicio.value = "";
        }

        if (TituloFormularioServicio) {
            TituloFormularioServicio.textContent = "Nuevo servicio";
        }

        if (BotonGuardarServicio) {
            BotonGuardarServicio.textContent = "Guardar servicio";
            BotonGuardarServicio.disabled = false;
        }

        if (SelectEstadoServicio) {
            SelectEstadoServicio.value = "ACTIVO";
        }
    }

    function MostrarFilaCarga(Texto) {
        if (!CuerpoTablaServicios) {
            return;
        }

        CuerpoTablaServicios.innerHTML = `
            <tr>
                <td colspan="7">${EscapeHtml(Texto)}</td>
            </tr>
        `;
    }

    function ObtenerClaseEstado(Estado) {
        switch (String(Estado).toUpperCase()) {
            case "ACTIVO":
                return "RolAdmin";
            case "INACTIVO":
                return "RolCliente";
            default:
                return "";
        }
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