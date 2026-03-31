document.addEventListener("DOMContentLoaded", () => {
    const MensajeAmenidades = document.getElementById("MensajeAmenidades");
    const FormularioAmenidad = document.getElementById("FormularioAmenidad");
    const InputIdAmenidad = document.getElementById("InputIdAmenidad");
    const InputNombreAmenidad = document.getElementById("InputNombreAmenidad");
    const TextAreaDescripcionAmenidad = document.getElementById("TextAreaDescripcionAmenidad");
    const SelectEstadoAmenidad = document.getElementById("SelectEstadoAmenidad");
    const BotonGuardarAmenidad = document.getElementById("BotonGuardarAmenidad");
    const BotonLimpiarAmenidad = document.getElementById("BotonLimpiarAmenidad");
    const InputBuscarAmenidad = document.getElementById("InputBuscarAmenidad");
    const CuerpoTablaAmenidades = document.getElementById("CuerpoTablaAmenidades");

    let ListaAmenidades = [];

    InicializarModulo();

    async function InicializarModulo() {
        if (FormularioAmenidad) {
            FormularioAmenidad.addEventListener("submit", GuardarAmenidad);
        }

        if (BotonLimpiarAmenidad) {
            BotonLimpiarAmenidad.addEventListener("click", LimpiarFormulario);
        }

        if (InputBuscarAmenidad) {
            InputBuscarAmenidad.addEventListener("input", AplicarFiltros);
        }

        await CargarAmenidades();
    }

    async function CargarAmenidades() {
        MostrarFilaCarga("Cargando amenidades...");
        LimpiarMensaje(MensajeAmenidades);

        try {
            const Respuesta = await fetch("php/Admin/Amenidades.php", {
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
                    MensajeAmenidades,
                    Resultado.message || "No fue posible cargar las amenidades.",
                    "error"
                );
                MostrarFilaCarga("No fue posible cargar las amenidades.");
                return;
            }

            ListaAmenidades = Array.isArray(Resultado.data?.Amenidades)
                ? Resultado.data.Amenidades
                : [];

            AplicarFiltros();
        } catch (Error) {
            console.error("Error al cargar amenidades:", Error);
            MostrarMensaje(
                MensajeAmenidades,
                "Ocurrió un error inesperado al cargar las amenidades.",
                "error"
            );
            MostrarFilaCarga("No fue posible cargar las amenidades.");
        }
    }

    function AplicarFiltros() {
        const TextoBusqueda = (InputBuscarAmenidad?.value || "").trim().toLowerCase();

        let AmenidadesFiltradas = [...ListaAmenidades];

        if (TextoBusqueda !== "") {
            AmenidadesFiltradas = AmenidadesFiltradas.filter((Amenidad) => {
                const Nombre = String(Amenidad.NOMBRE_AMENIDAD ?? "").toLowerCase();
                const Descripcion = String(Amenidad.DESCRIPCION ?? "").toLowerCase();

                return Nombre.includes(TextoBusqueda) || Descripcion.includes(TextoBusqueda);
            });
        }

        RenderizarTabla(AmenidadesFiltradas);
    }

    function RenderizarTabla(Amenidades) {
        if (!CuerpoTablaAmenidades) {
            return;
        }

        CuerpoTablaAmenidades.innerHTML = "";

        if (!Array.isArray(Amenidades) || Amenidades.length === 0) {
            CuerpoTablaAmenidades.innerHTML = `
                <tr>
                    <td colspan="5">No se encontraron amenidades.</td>
                </tr>
            `;
            return;
        }

        Amenidades.forEach((Amenidad) => {
            const Fila = document.createElement("tr");
            const EstadoActual = String(Amenidad.ESTADO_AMENIDAD ?? "").toUpperCase();
            const NuevoEstado = EstadoActual === "ACTIVO" ? "INACTIVO" : "ACTIVO";
            const TextoBotonEstado = EstadoActual === "ACTIVO" ? "Inactivar" : "Activar";

            Fila.innerHTML = `
                <td class="NombreUsuario">${EscapeHtml(Amenidad.NOMBRE_AMENIDAD ?? "No disponible")}</td>
                <td>${EscapeHtml(Amenidad.DESCRIPCION ?? "")}</td>
                <td>
                    <span class="EtiquetaRol ${EstadoActual === "ACTIVO" ? "RolCliente" : "RolAdmin"}">
                        ${EscapeHtml(EstadoActual)}
                    </span>
                </td>
                <td>${EscapeHtml(Amenidad.TOTAL_ASIGNACIONES ?? "0")}</td>
                <td>
                    <div class="FilaAcciones">
                        <button type="button" class="BotonEditar" data-editar="${Amenidad.ID_AMENIDAD}">
                            Editar
                        </button>
                        <button type="button" class="BotonSecundario" data-estado="${Amenidad.ID_AMENIDAD}">
                            ${EscapeHtml(TextoBotonEstado)}
                        </button>
                    </div>
                </td>
            `;

            const BotonEditar = Fila.querySelector("button[data-editar]");
            const BotonEstado = Fila.querySelector("button[data-estado]");

            if (BotonEditar) {
                BotonEditar.addEventListener("click", () => {
                    CargarAmenidadEnFormulario(Amenidad.ID_AMENIDAD);
                });
            }

            if (BotonEstado) {
                BotonEstado.addEventListener("click", () => {
                    CambiarEstadoAmenidad(Amenidad.ID_AMENIDAD, NuevoEstado);
                });
            }

            CuerpoTablaAmenidades.appendChild(Fila);
        });
    }

    async function CargarAmenidadEnFormulario(IdAmenidad) {
        const Amenidad = ListaAmenidades.find((Item) => Number(Item.ID_AMENIDAD) === Number(IdAmenidad));

        if (!Amenidad) {
            MostrarMensaje(MensajeAmenidades, "No se encontró la amenidad seleccionada.", "error");
            return;
        }

        InputIdAmenidad.value = Amenidad.ID_AMENIDAD ?? "";
        InputNombreAmenidad.value = Amenidad.NOMBRE_AMENIDAD ?? "";
        TextAreaDescripcionAmenidad.value = Amenidad.DESCRIPCION ?? "";
        SelectEstadoAmenidad.value = Amenidad.ESTADO_AMENIDAD ?? "ACTIVO";
        BotonGuardarAmenidad.textContent = "Actualizar amenidad";

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function GuardarAmenidad(Evento) {
        Evento.preventDefault();
        LimpiarMensaje(MensajeAmenidades);

        const DatosAmenidad = {
            IdAmenidad: InputIdAmenidad?.value.trim() || "",
            NombreAmenidad: InputNombreAmenidad?.value.trim() || "",
            Descripcion: TextAreaDescripcionAmenidad?.value.trim() || "",
            EstadoAmenidad: SelectEstadoAmenidad?.value.trim() || "ACTIVO"
        };

        const ErrorValidacion = ValidarFormulario(DatosAmenidad);

        if (ErrorValidacion !== "") {
            MostrarMensaje(MensajeAmenidades, ErrorValidacion, "error");
            return;
        }

        const EsEdicion = DatosAmenidad.IdAmenidad !== "";
        const Metodo = EsEdicion ? "PUT" : "POST";
        const TextoCargando = EsEdicion ? "Actualizando..." : "Guardando...";
        const TextoNormal = EsEdicion ? "Actualizar amenidad" : "Guardar amenidad";

        try {
            CambiarEstadoBoton(BotonGuardarAmenidad, true, TextoCargando);

            const Respuesta = await fetch("php/Admin/Amenidades.php", {
                method: Metodo,
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(DatosAmenidad)
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
                    MensajeAmenidades,
                    Resultado.message || "No fue posible guardar la amenidad.",
                    "error"
                );
                return;
            }

            MostrarMensaje(
                MensajeAmenidades,
                Resultado.message || "Amenidad guardada correctamente.",
                "exito"
            );

            LimpiarFormulario();
            await CargarAmenidades();
        } catch (Error) {
            console.error("Error al guardar amenidad:", Error);
            MostrarMensaje(
                MensajeAmenidades,
                "Ocurrió un error inesperado al guardar la amenidad.",
                "error"
            );
        } finally {
            CambiarEstadoBoton(BotonGuardarAmenidad, false, TextoNormal);
        }
    }

    async function CambiarEstadoAmenidad(IdAmenidad, NuevoEstado) {
        const Amenidad = ListaAmenidades.find((Item) => Number(Item.ID_AMENIDAD) === Number(IdAmenidad));

        if (!Amenidad) {
            MostrarMensaje(MensajeAmenidades, "No se encontró la amenidad seleccionada.", "error");
            return;
        }

        try {
            const Respuesta = await fetch("php/Admin/Amenidades.php", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    IdAmenidad: Amenidad.ID_AMENIDAD,
                    NombreAmenidad: Amenidad.NOMBRE_AMENIDAD,
                    Descripcion: Amenidad.DESCRIPCION ?? "",
                    EstadoAmenidad: NuevoEstado
                })
            });

            const Resultado = await Respuesta.json();

            if (!Respuesta.ok || !Resultado.success) {
                MostrarMensaje(
                    MensajeAmenidades,
                    Resultado.message || "No fue posible cambiar el estado.",
                    "error"
                );
                return;
            }

            MostrarMensaje(MensajeAmenidades, "Estado actualizado correctamente.", "exito");
            await CargarAmenidades();
        } catch (Error) {
            console.error("Error al cambiar estado:", Error);
            MostrarMensaje(MensajeAmenidades, "Ocurrió un error inesperado al cambiar el estado.", "error");
        }
    }

    function LimpiarFormulario() {
        if (InputIdAmenidad) {
            InputIdAmenidad.value = "";
        }

        if (InputNombreAmenidad) {
            InputNombreAmenidad.value = "";
        }

        if (TextAreaDescripcionAmenidad) {
            TextAreaDescripcionAmenidad.value = "";
        }

        if (SelectEstadoAmenidad) {
            SelectEstadoAmenidad.value = "ACTIVO";
        }

        if (BotonGuardarAmenidad) {
            BotonGuardarAmenidad.textContent = "Guardar amenidad";
        }
    }

    function ValidarFormulario(DatosAmenidad) {
        if (DatosAmenidad.NombreAmenidad === "") {
            return "Debes ingresar el nombre de la amenidad.";
        }

        if (DatosAmenidad.EstadoAmenidad === "") {
            return "Debes seleccionar un estado.";
        }

        return "";
    }

    function CambiarEstadoBoton(Boton, Deshabilitado, Texto) {
        if (!Boton) {
            return;
        }

        Boton.disabled = Deshabilitado;
        Boton.textContent = Texto;
    }

    function MostrarFilaCarga(Texto) {
        if (!CuerpoTablaAmenidades) {
            return;
        }

        CuerpoTablaAmenidades.innerHTML = `
            <tr>
                <td colspan="5">${EscapeHtml(Texto)}</td>
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