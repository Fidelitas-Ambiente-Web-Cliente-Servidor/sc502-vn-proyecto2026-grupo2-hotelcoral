document.addEventListener("DOMContentLoaded", () => {
    const Parametros = new URLSearchParams(window.location.search);
    const IdTipoHabitacion = Number(Parametros.get("IdTipoHabitacion") || 0);
    const EsEdicion = IdTipoHabitacion > 0;

    const TituloPaginaTipoHabitacion = document.getElementById("TituloPaginaTipoHabitacion");
    const TextoPaginaTipoHabitacion = document.getElementById("TextoPaginaTipoHabitacion");
    const MensajeCrearTipoHabitacion = document.getElementById("MensajeCrearTipoHabitacion");

    const FormularioTipoHabitacion = document.getElementById("FormularioTipoHabitacion");

    const InputIdTipoHabitacion = document.getElementById("InputIdTipoHabitacion");
    const SelectHotelTipoHabitacion = document.getElementById("SelectHotelTipoHabitacion");
    const InputNombreTipoHabitacion = document.getElementById("InputNombreTipoHabitacion");
    const TextAreaDescripcionTipoHabitacion = document.getElementById("TextAreaDescripcionTipoHabitacion");
    const InputCapacidadTipoHabitacion = document.getElementById("InputCapacidadTipoHabitacion");
    const InputCantidadCamasTipoHabitacion = document.getElementById("InputCantidadCamasTipoHabitacion");
    const InputPrecioBaseTipoHabitacion = document.getElementById("InputPrecioBaseTipoHabitacion");
    const SelectEstadoTipoHabitacion = document.getElementById("SelectEstadoTipoHabitacion");
    const InputUrlImagenTipoHabitacion = document.getElementById("InputUrlImagenTipoHabitacion");
    const InputDescripcionImagenTipoHabitacion = document.getElementById("InputDescripcionImagenTipoHabitacion");
    const BotonGuardarTipoHabitacion = document.getElementById("BotonGuardarTipoHabitacion");

    InicializarModulo();

    async function InicializarModulo() {
        ConfigurarModoFormulario();
        await CargarHoteles();

        if (EsEdicion) {
            await CargarTipoHabitacion();
        }

        if (FormularioTipoHabitacion) {
            FormularioTipoHabitacion.addEventListener("submit", GuardarTipoHabitacion);
        }
    }

    function ConfigurarModoFormulario() {
        if (EsEdicion) {
            if (TituloPaginaTipoHabitacion) {
                TituloPaginaTipoHabitacion.textContent = "Editar tipo de habitación";
            }

            if (TextoPaginaTipoHabitacion) {
                TextoPaginaTipoHabitacion.textContent = "Modifica los datos del tipo de habitación seleccionado.";
            }

            if (BotonGuardarTipoHabitacion) {
                BotonGuardarTipoHabitacion.textContent = "Actualizar tipo de habitación";
            }
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

            const ListaHoteles = Array.isArray(Resultado.data?.Hoteles)
                ? Resultado.data.Hoteles
                : [];

            if (!SelectHotelTipoHabitacion) {
                return;
            }

            SelectHotelTipoHabitacion.innerHTML = `
                <option value="">Seleccione un hotel</option>
            `;

            ListaHoteles.forEach((Hotel) => {
                const Opcion = document.createElement("option");
                Opcion.value = Hotel.ID_HOTEL;
                Opcion.textContent = Hotel.NOMBRE_HOTEL;
                SelectHotelTipoHabitacion.appendChild(Opcion);
            });
        } catch (Error) {
            console.error("Error al cargar hoteles:", Error);
            MostrarMensaje(MensajeCrearTipoHabitacion, "No fue posible cargar los hoteles.", "error");
        }
    }

    async function CargarTipoHabitacion() {
        LimpiarMensaje(MensajeCrearTipoHabitacion);

        try {
            const Respuesta = await fetch(`php/Admin/TiposHabitacion.php?id=${encodeURIComponent(IdTipoHabitacion)}`, {
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

            if (!Respuesta.ok || !Resultado.success || !Resultado.data?.TipoHabitacion) {
                MostrarMensaje(
                    MensajeCrearTipoHabitacion,
                    Resultado.message || "No fue posible cargar el tipo de habitación.",
                    "error"
                );
                return;
            }

            const TipoHabitacion = Resultado.data.TipoHabitacion;

            InputIdTipoHabitacion.value = TipoHabitacion.ID_TIPO_HABITACION ?? "";
            SelectHotelTipoHabitacion.value = TipoHabitacion.ID_HOTEL ?? "";
            InputNombreTipoHabitacion.value = TipoHabitacion.NOMBRE_TIPO ?? "";
            TextAreaDescripcionTipoHabitacion.value = TipoHabitacion.DESCRIPCION ?? "";
            InputCapacidadTipoHabitacion.value = TipoHabitacion.CAPACIDAD ?? "";
            InputCantidadCamasTipoHabitacion.value = TipoHabitacion.CANTIDAD_CAMAS ?? "";
            InputPrecioBaseTipoHabitacion.value = TipoHabitacion.PRECIO_BASE ?? "";
            SelectEstadoTipoHabitacion.value = TipoHabitacion.ESTADO_TIPO_HABITACION ?? "ACTIVO";
            InputUrlImagenTipoHabitacion.value = TipoHabitacion.URL_IMAGEN ?? "";
            InputDescripcionImagenTipoHabitacion.value = TipoHabitacion.DESCRIPCION_IMAGEN ?? "";
        } catch (Error) {
            console.error("Error al cargar tipo de habitación:", Error);
            MostrarMensaje(
                MensajeCrearTipoHabitacion,
                "Ocurrió un error inesperado al cargar el tipo de habitación.",
                "error"
            );
        }
    }

    async function GuardarTipoHabitacion(Evento) {
        Evento.preventDefault();
        LimpiarMensaje(MensajeCrearTipoHabitacion);

        const DatosTipoHabitacion = {
            IdTipoHabitacion: InputIdTipoHabitacion?.value.trim() || "",
            IdHotel: SelectHotelTipoHabitacion?.value.trim() || "",
            NombreTipo: InputNombreTipoHabitacion?.value.trim() || "",
            Descripcion: TextAreaDescripcionTipoHabitacion?.value.trim() || "",
            Capacidad: InputCapacidadTipoHabitacion?.value.trim() || "",
            CantidadCamas: InputCantidadCamasTipoHabitacion?.value.trim() || "",
            PrecioBase: InputPrecioBaseTipoHabitacion?.value.trim() || "",
            EstadoTipoHabitacion: SelectEstadoTipoHabitacion?.value.trim() || "",
            UrlImagen: InputUrlImagenTipoHabitacion?.value.trim() || "",
            DescripcionImagen: InputDescripcionImagenTipoHabitacion?.value.trim() || ""
        };

        const ErrorValidacion = ValidarFormulario(DatosTipoHabitacion);

        if (ErrorValidacion !== "") {
            MostrarMensaje(MensajeCrearTipoHabitacion, ErrorValidacion, "error");
            return;
        }

        const Metodo = EsEdicion ? "PUT" : "POST";
        const TextoCargando = EsEdicion ? "Actualizando..." : "Guardando...";
        const TextoNormal = EsEdicion ? "Actualizar tipo de habitación" : "Guardar tipo de habitación";

        try {
            CambiarEstadoBoton(BotonGuardarTipoHabitacion, true, TextoCargando);

            const Respuesta = await fetch("php/Admin/TiposHabitacion.php", {
                method: Metodo,
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(DatosTipoHabitacion)
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
                    MensajeCrearTipoHabitacion,
                    Resultado.message || "No fue posible guardar el tipo de habitación.",
                    "error"
                );
                return;
            }

            MostrarMensaje(
                MensajeCrearTipoHabitacion,
                Resultado.message || "Tipo de habitación guardado correctamente.",
                "exito"
            );

            setTimeout(() => {
                window.location.href = "AdminTiposHabitacion.html";
            }, 900);
        } catch (Error) {
            console.error("Error al guardar tipo de habitación:", Error);
            MostrarMensaje(
                MensajeCrearTipoHabitacion,
                "Ocurrió un error inesperado al guardar el tipo de habitación.",
                "error"
            );
        } finally {
            CambiarEstadoBoton(BotonGuardarTipoHabitacion, false, TextoNormal);
        }
    }

    function ValidarFormulario(DatosTipoHabitacion) {
        if (DatosTipoHabitacion.IdHotel === "") {
            return "Debes seleccionar un hotel.";
        }

        if (DatosTipoHabitacion.NombreTipo === "") {
            return "Debes ingresar el nombre del tipo de habitación.";
        }

        if (DatosTipoHabitacion.Capacidad === "" || Number(DatosTipoHabitacion.Capacidad) <= 0) {
            return "La capacidad debe ser mayor que cero.";
        }

        if (DatosTipoHabitacion.CantidadCamas === "" || Number(DatosTipoHabitacion.CantidadCamas) <= 0) {
            return "La cantidad de camas debe ser mayor que cero.";
        }

        if (DatosTipoHabitacion.PrecioBase === "" || Number(DatosTipoHabitacion.PrecioBase) < 0) {
            return "El precio base debe ser válido.";
        }

        if (DatosTipoHabitacion.EstadoTipoHabitacion === "") {
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
});