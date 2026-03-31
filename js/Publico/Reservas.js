document.addEventListener("DOMContentLoaded", () => {
    const Parametros = new URLSearchParams(window.location.search);
    const IdHotelDesdeUrl = String(Parametros.get("IdHotel") || "").trim();
    const IdTipoHabitacionDesdeUrl = String(Parametros.get("IdTipoHabitacion") || "").trim();

    const MensajeReserva = document.getElementById("MensajeReserva");
    const FormularioReserva = document.getElementById("FormularioReserva");

    const SelectHotelReserva = document.getElementById("SelectHotelReserva");
    const SelectTipoHabitacionReserva = document.getElementById("SelectTipoHabitacionReserva");

    const InputFechaEntradaReserva = document.getElementById("InputFechaEntradaReserva");
    const InputFechaSalidaReserva = document.getElementById("InputFechaSalidaReserva");
    const InputCantidadHuespedesReserva = document.getElementById("InputCantidadHuespedesReserva");
    const TextAreaNotasAdicionalesReserva = document.getElementById("TextAreaNotasAdicionalesReserva");
    const BotonConfirmarReserva = document.getElementById("BotonConfirmarReserva");

    const TextoPrecioPorNoche = document.getElementById("TextoPrecioPorNoche");
    const TextoCantidadNoches = document.getElementById("TextoCantidadNoches");
    const TextoTotalEstimado = document.getElementById("TextoTotalEstimado");
    const TextoPrecioEtiqueta = document.getElementById("TextoPrecioEtiqueta");

    const ImagenTipoHabitacion = document.getElementById("ImagenTipoHabitacion");
    const TextoNombreTipoHabitacion = document.getElementById("TextoNombreTipoHabitacion");
    const TextoHotelSeleccionado = document.getElementById("TextoHotelSeleccionado");
    const TextoCapacidadTipoHabitacion = document.getElementById("TextoCapacidadTipoHabitacion");
    const TextoCamasTipoHabitacion = document.getElementById("TextoCamasTipoHabitacion");
    const TextoDescripcionTipoHabitacion = document.getElementById("TextoDescripcionTipoHabitacion");

    let ListaHoteles = [];
    let ListaTiposHabitacion = [];
    let TipoHabitacionSeleccionado = null;

    InicializarModulo();

    async function InicializarModulo() {
        AsignarFechaMinima();

        if (SelectHotelReserva) {
            SelectHotelReserva.addEventListener("change", async () => {
                await CargarTiposHabitacionPorHotel(Number(SelectHotelReserva.value || 0));
                ReiniciarDetalleTipoHabitacion();
                CalcularResumen();
            });
        }

        if (SelectTipoHabitacionReserva) {
            SelectTipoHabitacionReserva.addEventListener("change", async () => {
                await CargarDetalleTipoHabitacion(Number(SelectTipoHabitacionReserva.value || 0));
                CalcularResumen();
            });
        }

        if (InputFechaEntradaReserva) {
            InputFechaEntradaReserva.addEventListener("change", () => {
                AjustarFechaSalidaMinima();
                CalcularResumen();
            });
        }

        if (InputFechaSalidaReserva) {
            InputFechaSalidaReserva.addEventListener("change", CalcularResumen);
        }

        if (InputCantidadHuespedesReserva) {
            InputCantidadHuespedesReserva.addEventListener("input", CalcularResumen);
        }

        if (FormularioReserva) {
            FormularioReserva.addEventListener("submit", ManejarReserva);
        }

        await CargarHoteles();

        if (IdHotelDesdeUrl !== "" && SelectHotelReserva) {
            SelectHotelReserva.value = IdHotelDesdeUrl;
            await CargarTiposHabitacionPorHotel(Number(IdHotelDesdeUrl), Number(IdTipoHabitacionDesdeUrl || 0));
        }

        if (IdTipoHabitacionDesdeUrl !== "") {
            await CargarDetalleTipoHabitacion(Number(IdTipoHabitacionDesdeUrl));
        }

        CalcularResumen();
    }

    function AsignarFechaMinima() {
        const FechaActual = new Date();
        const FechaTexto = FormatearFechaInput(FechaActual);

        if (InputFechaEntradaReserva) {
            InputFechaEntradaReserva.min = FechaTexto;
        }

        if (InputFechaSalidaReserva) {
            InputFechaSalidaReserva.min = FechaTexto;
        }
    }

    function AjustarFechaSalidaMinima() {
        if (!InputFechaEntradaReserva || !InputFechaSalidaReserva) {
            return;
        }

        const FechaEntrada = InputFechaEntradaReserva.value || "";

        if (FechaEntrada !== "") {
            InputFechaSalidaReserva.min = FechaEntrada;

            if (InputFechaSalidaReserva.value !== "" && InputFechaSalidaReserva.value <= FechaEntrada) {
                InputFechaSalidaReserva.value = "";
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

            ListaHoteles = Array.isArray(Resultado.data?.Hoteles)
                ? Resultado.data.Hoteles
                : [];

            RenderizarSelectHoteles();
        } catch (Error) {
            console.error("Error al cargar hoteles:", Error);
            MostrarMensaje(MensajeReserva, "No fue posible cargar los hoteles.", "error");
        }
    }

    function RenderizarSelectHoteles() {
        if (!SelectHotelReserva) {
            return;
        }

        SelectHotelReserva.innerHTML = `
            <option value="">Seleccione un hotel</option>
        `;

        ListaHoteles.forEach((Hotel) => {
            const Opcion = document.createElement("option");
            Opcion.value = Hotel.ID_HOTEL;
            Opcion.textContent = Hotel.NOMBRE_HOTEL;
            SelectHotelReserva.appendChild(Opcion);
        });
    }

    async function CargarTiposHabitacionPorHotel(IdHotel, IdTipoSeleccionado = 0) {
        if (!SelectTipoHabitacionReserva) {
            return;
        }

        SelectTipoHabitacionReserva.innerHTML = `
            <option value="">Seleccione un tipo de habitación</option>
        `;

        ListaTiposHabitacion = [];
        TipoHabitacionSeleccionado = null;

        if (IdHotel <= 0) {
            return;
        }

        try {
            const Respuesta = await fetch(`php/Publico/TiposHabitacion.php?IdHotel=${encodeURIComponent(IdHotel)}`, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });

            const Resultado = await Respuesta.json();

            if (!Respuesta.ok || !Resultado.success) {
                throw new Error(Resultado.message || "No fue posible cargar los tipos de habitación.");
            }

            ListaTiposHabitacion = Array.isArray(Resultado.data?.TiposHabitacion)
                ? Resultado.data.TiposHabitacion
                : [];

            ListaTiposHabitacion.forEach((TipoHabitacion) => {
                const Opcion = document.createElement("option");
                Opcion.value = TipoHabitacion.ID_TIPO_HABITACION;
                Opcion.textContent = `${TipoHabitacion.NOMBRE_TIPO} · ${FormatearMoneda(TipoHabitacion.PRECIO_BASE)}`;
                SelectTipoHabitacionReserva.appendChild(Opcion);
            });

            if (IdTipoSeleccionado > 0) {
                SelectTipoHabitacionReserva.value = String(IdTipoSeleccionado);
            }
        } catch (Error) {
            console.error("Error al cargar tipos de habitación:", Error);
            MostrarMensaje(MensajeReserva, "No fue posible cargar los tipos de habitación.", "error");
        }
    }

    async function CargarDetalleTipoHabitacion(IdTipoHabitacion) {
        TipoHabitacionSeleccionado = null;

        if (IdTipoHabitacion <= 0) {
            ReiniciarDetalleTipoHabitacion();
            return;
        }

        try {
            const Respuesta = await fetch(`php/Publico/TiposHabitacion.php?id=${encodeURIComponent(IdTipoHabitacion)}`, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });

            const Resultado = await Respuesta.json();

            if (!Respuesta.ok || !Resultado.success || !Resultado.data?.TipoHabitacion) {
                throw new Error(Resultado.message || "No fue posible cargar el detalle del tipo de habitación.");
            }

            TipoHabitacionSeleccionado = Resultado.data.TipoHabitacion;
            RenderizarDetalleTipoHabitacion();
        } catch (Error) {
            console.error("Error al cargar detalle del tipo:", Error);
            ReiniciarDetalleTipoHabitacion();
            MostrarMensaje(MensajeReserva, "No fue posible cargar el detalle del tipo de habitación.", "error");
        }
    }

    function RenderizarDetalleTipoHabitacion() {
        if (!TipoHabitacionSeleccionado) {
            ReiniciarDetalleTipoHabitacion();
            return;
        }

        const UrlImagen = String(TipoHabitacionSeleccionado.URL_IMAGEN ?? "").trim();

        if (ImagenTipoHabitacion) {
            ImagenTipoHabitacion.src = UrlImagen !== "" ? UrlImagen : "Recursos/Imagenes/HeroFondo.png";
            ImagenTipoHabitacion.alt = TipoHabitacionSeleccionado.NOMBRE_TIPO ?? "Habitación Hotel Coral";
        }

        if (TextoNombreTipoHabitacion) {
            TextoNombreTipoHabitacion.textContent = TipoHabitacionSeleccionado.NOMBRE_TIPO ?? "Tipo de habitación";
        }

        if (TextoHotelSeleccionado) {
            TextoHotelSeleccionado.textContent = `Hotel: ${TipoHabitacionSeleccionado.NOMBRE_HOTEL ?? "—"}`;
        }

        if (TextoCapacidadTipoHabitacion) {
            TextoCapacidadTipoHabitacion.textContent = `Capacidad: ${TipoHabitacionSeleccionado.CAPACIDAD ?? "—"} huésped(es)`;
        }

        if (TextoCamasTipoHabitacion) {
            TextoCamasTipoHabitacion.textContent = `Camas: ${TipoHabitacionSeleccionado.CANTIDAD_CAMAS ?? "—"}`;
        }

        if (TextoDescripcionTipoHabitacion) {
            TextoDescripcionTipoHabitacion.textContent =
                TipoHabitacionSeleccionado.DESCRIPCION ?? "Sin descripción disponible.";
        }

        const PrecioTexto = FormatearMoneda(TipoHabitacionSeleccionado.PRECIO_BASE);

        if (TextoPrecioEtiqueta) {
            TextoPrecioEtiqueta.textContent = `${PrecioTexto} / noche`;
        }

        if (TextoPrecioPorNoche) {
            TextoPrecioPorNoche.textContent = PrecioTexto;
        }
    }

    function ReiniciarDetalleTipoHabitacion() {
        if (ImagenTipoHabitacion) {
            ImagenTipoHabitacion.src = "Recursos/Imagenes/HeroFondo.png";
            ImagenTipoHabitacion.alt = "Habitación Hotel Coral";
        }

        if (TextoNombreTipoHabitacion) {
            TextoNombreTipoHabitacion.textContent = "Selecciona un tipo de habitación";
        }

        if (TextoHotelSeleccionado) {
            TextoHotelSeleccionado.textContent = "Hotel: —";
        }

        if (TextoCapacidadTipoHabitacion) {
            TextoCapacidadTipoHabitacion.textContent = "Capacidad: —";
        }

        if (TextoCamasTipoHabitacion) {
            TextoCamasTipoHabitacion.textContent = "Camas: —";
        }

        if (TextoDescripcionTipoHabitacion) {
            TextoDescripcionTipoHabitacion.textContent = "Selecciona un hotel y un tipo de habitación para ver su información.";
        }

        if (TextoPrecioEtiqueta) {
            TextoPrecioEtiqueta.textContent = "₡0 / noche";
        }

        if (TextoPrecioPorNoche) {
            TextoPrecioPorNoche.textContent = "₡0";
        }
    }

    function CalcularResumen() {
        const PrecioNoche = Number(TipoHabitacionSeleccionado?.PRECIO_BASE ?? 0);
        const FechaEntrada = InputFechaEntradaReserva?.value || "";
        const FechaSalida = InputFechaSalidaReserva?.value || "";

        let CantidadNoches = 0;

        if (FechaEntrada !== "" && FechaSalida !== "") {
            CantidadNoches = ObtenerCantidadNoches(FechaEntrada, FechaSalida);
        }

        const TotalEstimado = PrecioNoche * CantidadNoches;

        if (TextoCantidadNoches) {
            TextoCantidadNoches.textContent = String(CantidadNoches);
        }

        if (TextoTotalEstimado) {
            TextoTotalEstimado.textContent = FormatearMoneda(TotalEstimado);
        }

        if (TextoPrecioPorNoche) {
            TextoPrecioPorNoche.textContent = FormatearMoneda(PrecioNoche);
        }

        if (TextoPrecioEtiqueta) {
            TextoPrecioEtiqueta.textContent = `${FormatearMoneda(PrecioNoche)} / noche`;
        }
    }

    function ObtenerCantidadNoches(FechaEntrada, FechaSalida) {
        const MarcaEntrada = new Date(`${FechaEntrada}T00:00:00`).getTime();
        const MarcaSalida = new Date(`${FechaSalida}T00:00:00`).getTime();

        if (Number.isNaN(MarcaEntrada) || Number.isNaN(MarcaSalida) || MarcaSalida <= MarcaEntrada) {
            return 0;
        }

        const Diferencia = MarcaSalida - MarcaEntrada;
        return Math.floor(Diferencia / 86400000);
    }

    async function ManejarReserva(Evento) {
        Evento.preventDefault();
        LimpiarMensaje(MensajeReserva);

        const DatosReserva = {
            IdHotel: SelectHotelReserva?.value.trim() || "",
            IdTipoHabitacion: SelectTipoHabitacionReserva?.value.trim() || "",
            FechaEntrada: InputFechaEntradaReserva?.value || "",
            FechaSalida: InputFechaSalidaReserva?.value || "",
            CantidadHuespedes: InputCantidadHuespedesReserva?.value.trim() || "",
            NotasAdicionales: TextAreaNotasAdicionalesReserva?.value.trim() || ""
        };

        const ErrorValidacion = ValidarFormulario(DatosReserva);

        if (ErrorValidacion !== "") {
            MostrarMensaje(MensajeReserva, ErrorValidacion, "error");
            return;
        }

        if (TipoHabitacionSeleccionado) {
            const CapacidadMaxima = Number(TipoHabitacionSeleccionado.CAPACIDAD ?? 0);
            const CantidadHuespedes = Number(DatosReserva.CantidadHuespedes);

            if (CapacidadMaxima > 0 && CantidadHuespedes > CapacidadMaxima) {
                MostrarMensaje(
                    MensajeReserva,
                    "La cantidad de huéspedes excede la capacidad del tipo de habitación seleccionado.",
                    "error"
                );
                return;
            }
        }

        try {
            CambiarEstadoBoton(BotonConfirmarReserva, true, "Confirmando...");

            const Respuesta = await fetch("php/Publico/Reservas.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(DatosReserva)
            });

            const Resultado = await Respuesta.json();

            if (Respuesta.status === 401) {
                MostrarMensaje(
                    MensajeReserva,
                    Resultado.message || "Debes iniciar sesión para reservar.",
                    "error"
                );

                setTimeout(() => {
                    window.location.href = "AccesoCuenta.html";
                }, 1000);

                return;
            }

            if (!Respuesta.ok || !Resultado.success) {
                MostrarMensaje(
                    MensajeReserva,
                    Resultado.message || "No fue posible crear la reserva.",
                    "error"
                );
                return;
            }

            MostrarMensaje(
                MensajeReserva,
                Resultado.message || "Reserva creada correctamente.",
                "exito"
            );

            setTimeout(() => {
                window.location.href = "MiCuenta.html";
            }, 1200);
        } catch (Error) {
            console.error("Error al crear reserva:", Error);
            MostrarMensaje(
                MensajeReserva,
                "Ocurrió un error inesperado al crear la reserva.",
                "error"
            );
        } finally {
            CambiarEstadoBoton(BotonConfirmarReserva, false, "Confirmar reserva");
        }
    }

    function ValidarFormulario(DatosReserva) {
        if (DatosReserva.IdHotel === "") {
            return "Debes seleccionar un hotel.";
        }

        if (DatosReserva.IdTipoHabitacion === "") {
            return "Debes seleccionar un tipo de habitación.";
        }

        if (DatosReserva.FechaEntrada === "") {
            return "Debes seleccionar la fecha de entrada.";
        }

        if (DatosReserva.FechaSalida === "") {
            return "Debes seleccionar la fecha de salida.";
        }

        if (DatosReserva.CantidadHuespedes === "" || Number(DatosReserva.CantidadHuespedes) <= 0) {
            return "La cantidad de huéspedes debe ser mayor que cero.";
        }

        const CantidadNoches = ObtenerCantidadNoches(DatosReserva.FechaEntrada, DatosReserva.FechaSalida);

        if (CantidadNoches <= 0) {
            return "La fecha de salida debe ser posterior a la fecha de entrada.";
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
            return "₡0";
        }

        return Numero.toLocaleString("es-CR", {
            style: "currency",
            currency: "CRC"
        });
    }

    function FormatearFechaInput(Fecha) {
        const Ano = Fecha.getFullYear();
        const Mes = String(Fecha.getMonth() + 1).padStart(2, "0");
        const Dia = String(Fecha.getDate()).padStart(2, "0");

        return `${Ano}-${Mes}-${Dia}`;
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