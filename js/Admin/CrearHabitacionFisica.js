document.addEventListener("DOMContentLoaded", () => {
    const BotonRecargarAmenidades = document.getElementById("BotonRecargarAmenidades");
    const Parametros = new URLSearchParams(window.location.search);
    const IdHabitacion = Number(Parametros.get("IdHabitacion") || 0);
    const EsEdicion = IdHabitacion > 0;

    const TituloPaginaHabitacionFisica = document.getElementById("TituloPaginaHabitacionFisica");
    const TextoPaginaHabitacionFisica = document.getElementById("TextoPaginaHabitacionFisica");
    const MensajeCrearHabitacionFisica = document.getElementById("MensajeCrearHabitacionFisica");

    const FormularioHabitacionFisica = document.getElementById("FormularioHabitacionFisica");

    const InputIdHabitacionFisica = document.getElementById("InputIdHabitacionFisica");
    const SelectHotelHabitacionFisica = document.getElementById("SelectHotelHabitacionFisica");
    const SelectTipoHabitacionFisica = document.getElementById("SelectTipoHabitacionFisica");
    const InputNumeroHabitacionFisica = document.getElementById("InputNumeroHabitacionFisica");
    const InputPisoHabitacionFisica = document.getElementById("InputPisoHabitacionFisica");
    const SelectEstadoHabitacionFisica = document.getElementById("SelectEstadoHabitacionFisica");
    const TextAreaDescripcionHabitacionFisica = document.getElementById("TextAreaDescripcionHabitacionFisica");
    const BotonGuardarHabitacionFisica = document.getElementById("BotonGuardarHabitacionFisica");

    const ContenedorAmenidadesHabitacionFisica = document.getElementById("ContenedorAmenidadesHabitacionFisica");
    const TextoAyudaAmenidadesHabitacionFisica = document.getElementById("TextoAyudaAmenidadesHabitacionFisica");

    let ListaAmenidades = [];

    InicializarModulo();

    if (BotonRecargarAmenidades) {
    BotonRecargarAmenidades.addEventListener("click", async () => {
        await CargarAmenidades();
        MostrarMensaje(
            MensajeCrearHabitacionFisica,
            "Lista de amenidades actualizada correctamente.",
            "exito"
        );
    });
}

    async function InicializarModulo() {
        ConfigurarModoFormulario();
        await CargarHoteles();
        await CargarAmenidades();

        if (SelectHotelHabitacionFisica) {
            SelectHotelHabitacionFisica.addEventListener("change", async () => {
                await CargarTiposHabitacionPorHotel(Number(SelectHotelHabitacionFisica.value || 0));
            });
        }

        if (EsEdicion) {
            await CargarHabitacionFisica();
        }

        if (FormularioHabitacionFisica) {
            FormularioHabitacionFisica.addEventListener("submit", GuardarHabitacionFisica);
        }
    }

    function ConfigurarModoFormulario() {
        if (EsEdicion) {
            if (TituloPaginaHabitacionFisica) {
                TituloPaginaHabitacionFisica.textContent = "Editar habitación física";
            }

            if (TextoPaginaHabitacionFisica) {
                TextoPaginaHabitacionFisica.textContent = "Modifica los datos de la habitación física seleccionada.";
            }

            if (BotonGuardarHabitacionFisica) {
                BotonGuardarHabitacionFisica.textContent = "Actualizar habitación física";
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

            if (!SelectHotelHabitacionFisica) {
                return;
            }

            SelectHotelHabitacionFisica.innerHTML = `
                <option value="">Seleccione un hotel</option>
            `;

            ListaHoteles.forEach((Hotel) => {
                const Opcion = document.createElement("option");
                Opcion.value = Hotel.ID_HOTEL;
                Opcion.textContent = Hotel.NOMBRE_HOTEL;
                SelectHotelHabitacionFisica.appendChild(Opcion);
            });
        } catch (Error) {
            console.error("Error al cargar hoteles:", Error);
            MostrarMensaje(MensajeCrearHabitacionFisica, "No fue posible cargar los hoteles.", "error");
        }
    }

    async function CargarAmenidades() {
        if (!ContenedorAmenidadesHabitacionFisica) {
            return;
        }

        ContenedorAmenidadesHabitacionFisica.innerHTML = `
            <p class="TextoAyudaAmenidades">Cargando amenidades...</p>
        `;

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
                throw new Error(Resultado.message || "No fue posible cargar las amenidades.");
            }

            ListaAmenidades = Array.isArray(Resultado.data?.Amenidades)
                ? Resultado.data.Amenidades
                : [];

            RenderizarAmenidades([]);
        } catch (Error) {
            console.error("Error al cargar amenidades:", Error);
            ContenedorAmenidadesHabitacionFisica.innerHTML = `
                <p class="TextoAyudaAmenidades">No fue posible cargar las amenidades.</p>
            `;
        }
    }

    function RenderizarAmenidades(AmenidadesSeleccionadas = []) {
        if (!ContenedorAmenidadesHabitacionFisica) {
            return;
        }

        const AmenidadesMarcadas = new Set(
            Array.isArray(AmenidadesSeleccionadas)
                ? AmenidadesSeleccionadas.map((Item) => Number(Item))
                : []
        );

        if (!Array.isArray(ListaAmenidades) || ListaAmenidades.length === 0) {
            ContenedorAmenidadesHabitacionFisica.innerHTML = `
                <p class="TextoAyudaAmenidades">No hay amenidades activas registradas.</p>
            `;
            return;
        }

        ContenedorAmenidadesHabitacionFisica.innerHTML = ListaAmenidades.map((Amenidad) => {
            const IdAmenidad = Number(Amenidad.ID_AMENIDAD);
            const Marcada = AmenidadesMarcadas.has(IdAmenidad) ? "checked" : "";

            return `
                <label class="TarjetaAmenidadSeleccion">
                    <input
                        type="checkbox"
                        class="CheckboxAmenidad"
                        name="AmenidadesHabitacionFisica"
                        value="${IdAmenidad}"
                        ${Marcada}
                    >
                    <span class="ContenidoAmenidadSeleccion">
                        <span class="TituloAmenidadSeleccion">${EscapeHtml(Amenidad.NOMBRE_AMENIDAD ?? "Amenidad")}</span>
                        <span class="DescripcionAmenidadSeleccion">${EscapeHtml(Amenidad.DESCRIPCION ?? "")}</span>
                    </span>
                </label>
            `;
        }).join("");

        if (TextoAyudaAmenidadesHabitacionFisica) {
            TextoAyudaAmenidadesHabitacionFisica.style.display = "none";
        }
    }

    function ObtenerAmenidadesSeleccionadas() {
        const Checkboxes = document.querySelectorAll('input[name="AmenidadesHabitacionFisica"]:checked');
        return Array.from(Checkboxes).map((Checkbox) => Number(Checkbox.value)).filter((Valor) => Valor > 0);
    }

    async function CargarTiposHabitacionPorHotel(IdHotel, IdTipoSeleccionado = 0) {
        if (!SelectTipoHabitacionFisica) {
            return;
        }

        SelectTipoHabitacionFisica.innerHTML = `
            <option value="">Seleccione un tipo de habitación</option>
        `;

        if (IdHotel <= 0) {
            return;
        }

        try {
            const Respuesta = await fetch(`php/Admin/TiposHabitacion.php?IdHotel=${encodeURIComponent(IdHotel)}`, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });

            const Resultado = await Respuesta.json();

            if (!Respuesta.ok || !Resultado.success) {
                throw new Error(Resultado.message || "No fue posible cargar los tipos de habitación.");
            }

            const ListaTiposHabitacion = Array.isArray(Resultado.data?.TiposHabitacion)
                ? Resultado.data.TiposHabitacion
                : [];

            ListaTiposHabitacion.forEach((TipoHabitacion) => {
                const Opcion = document.createElement("option");
                Opcion.value = TipoHabitacion.ID_TIPO_HABITACION;
                Opcion.textContent = `${TipoHabitacion.NOMBRE_TIPO} · ${FormatearMoneda(TipoHabitacion.PRECIO_BASE)}`;
                SelectTipoHabitacionFisica.appendChild(Opcion);
            });

            if (IdTipoSeleccionado > 0) {
                SelectTipoHabitacionFisica.value = String(IdTipoSeleccionado);
            }
        } catch (Error) {
            console.error("Error al cargar tipos de habitación:", Error);
            MostrarMensaje(MensajeCrearHabitacionFisica, "No fue posible cargar los tipos de habitación.", "error");
        }
    }

    async function CargarHabitacionFisica() {
        LimpiarMensaje(MensajeCrearHabitacionFisica);

        try {
            const Respuesta = await fetch(`php/Admin/HabitacionesFisicas.php?id=${encodeURIComponent(IdHabitacion)}`, {
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

            if (!Respuesta.ok || !Resultado.success || !Resultado.data?.HabitacionFisica) {
                MostrarMensaje(
                    MensajeCrearHabitacionFisica,
                    Resultado.message || "No fue posible cargar la habitación física.",
                    "error"
                );
                return;
            }

            const HabitacionFisica = Resultado.data.HabitacionFisica;
            const AmenidadesSeleccionadas = Array.isArray(Resultado.data?.Amenidades)
                ? Resultado.data.Amenidades
                : [];

            InputIdHabitacionFisica.value = HabitacionFisica.ID_HABITACION ?? "";
            SelectHotelHabitacionFisica.value = HabitacionFisica.ID_HOTEL ?? "";

            await CargarTiposHabitacionPorHotel(
                Number(HabitacionFisica.ID_HOTEL ?? 0),
                Number(HabitacionFisica.ID_TIPO_HABITACION ?? 0)
            );

            InputNumeroHabitacionFisica.value = HabitacionFisica.NUMERO_HABITACION ?? "";
            InputPisoHabitacionFisica.value = HabitacionFisica.PISO ?? "";
            SelectEstadoHabitacionFisica.value = HabitacionFisica.ESTADO_HABITACION ?? "DISPONIBLE";
            TextAreaDescripcionHabitacionFisica.value = HabitacionFisica.DESCRIPCION ?? "";

            RenderizarAmenidades(AmenidadesSeleccionadas);
        } catch (Error) {
            console.error("Error al cargar habitación física:", Error);
            MostrarMensaje(
                MensajeCrearHabitacionFisica,
                "Ocurrió un error inesperado al cargar la habitación física.",
                "error"
            );
        }
    }

    async function GuardarHabitacionFisica(Evento) {
        Evento.preventDefault();
        LimpiarMensaje(MensajeCrearHabitacionFisica);

        const DatosHabitacionFisica = {
            IdHabitacion: InputIdHabitacionFisica?.value.trim() || "",
            IdHotel: SelectHotelHabitacionFisica?.value.trim() || "",
            IdTipoHabitacion: SelectTipoHabitacionFisica?.value.trim() || "",
            NumeroHabitacion: InputNumeroHabitacionFisica?.value.trim() || "",
            Piso: InputPisoHabitacionFisica?.value.trim() || "",
            EstadoHabitacion: SelectEstadoHabitacionFisica?.value.trim() || "",
            Descripcion: TextAreaDescripcionHabitacionFisica?.value.trim() || "",
            Amenidades: ObtenerAmenidadesSeleccionadas()
        };

        const ErrorValidacion = ValidarFormulario(DatosHabitacionFisica);

        if (ErrorValidacion !== "") {
            MostrarMensaje(MensajeCrearHabitacionFisica, ErrorValidacion, "error");
            return;
        }

        const Metodo = EsEdicion ? "PUT" : "POST";
        const TextoCargando = EsEdicion ? "Actualizando..." : "Guardando...";
        const TextoNormal = EsEdicion ? "Actualizar habitación física" : "Guardar habitación física";

        try {
            CambiarEstadoBoton(BotonGuardarHabitacionFisica, true, TextoCargando);

            const Respuesta = await fetch("php/Admin/HabitacionesFisicas.php", {
                method: Metodo,
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(DatosHabitacionFisica)
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
                    MensajeCrearHabitacionFisica,
                    Resultado.message || "No fue posible guardar la habitación física.",
                    "error"
                );
                return;
            }

            MostrarMensaje(
                MensajeCrearHabitacionFisica,
                Resultado.message || "Habitación física guardada correctamente.",
                "exito"
            );

            setTimeout(() => {
                window.location.href = "AdminHabitacionesFisicas.html";
            }, 900);
        } catch (Error) {
            console.error("Error al guardar habitación física:", Error);
            MostrarMensaje(
                MensajeCrearHabitacionFisica,
                "Ocurrió un error inesperado al guardar la habitación física.",
                "error"
            );
        } finally {
            CambiarEstadoBoton(BotonGuardarHabitacionFisica, false, TextoNormal);
        }
    }

    function ValidarFormulario(DatosHabitacionFisica) {
        if (DatosHabitacionFisica.IdHotel === "") {
            return "Debes seleccionar un hotel.";
        }

        if (DatosHabitacionFisica.IdTipoHabitacion === "") {
            return "Debes seleccionar un tipo de habitación.";
        }

        if (DatosHabitacionFisica.NumeroHabitacion === "") {
            return "Debes ingresar el número de habitación.";
        }

        if (DatosHabitacionFisica.EstadoHabitacion === "") {
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