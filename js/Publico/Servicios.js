document.addEventListener("DOMContentLoaded", () => {
    let ListaHoteles = [];
    let ListaServicios = [];
    let ListaReservasUsuario = [];
    let ServicioSeleccionado = null;

    const SelectHotelServicios = document.getElementById("FiltroHotelServicios");
    const GridServicios = document.getElementById("GridServicios");
    const EstadoVacioServicios = document.getElementById("EstadoVacioServicios");
    const CantidadServicios = document.getElementById("CantidadServicios");
    const PlantillaTarjetaServicio = document.getElementById("PlantillaTarjetaServicio");
    const EstadoCargaServicios = document.getElementById("EstadoCargaServicios");

    const TituloServicioDestacado = document.getElementById("TituloServicioDestacado");
    const TextoServicioDestacado = document.getElementById("TextoServicioDestacado");
    const PrecioServicioDestacado = document.getElementById("PrecioServicioDestacado");
    const ImagenServicioDestacado = document.getElementById("ImagenServicioDestacado");
    const BotonServicioDestacado = document.getElementById("BotonServicioDestacado");

    const ModalSolicitudServicio = document.getElementById("ModalSolicitudServicio");
    const OverlayModalServicio = document.getElementById("OverlayModalServicio");
    const BotonCerrarModalServicio = document.getElementById("BotonCerrarModalServicio");
    const BotonCancelarModalServicio = document.getElementById("BotonCancelarModalServicio");
    const FormularioSolicitudServicio = document.getElementById("FormularioSolicitudServicio");
    const MensajeModalServicio = document.getElementById("MensajeModalServicio");

    const InputIdServicio = document.getElementById("InputIdServicio");
    const InputNombreServicioModal = document.getElementById("InputNombreServicioModal");
    const InputHotelServicioModal = document.getElementById("InputHotelServicioModal");
    const SelectReservaServicio = document.getElementById("SelectReservaServicio");
    const InputCantidadServicio = document.getElementById("InputCantidadServicio");
    const InputFechaServicio = document.getElementById("InputFechaServicio");
    const ResumenModalServicio = document.getElementById("ResumenModalServicio");
    const BotonConfirmarServicio = document.getElementById("BotonConfirmarServicio");

    async function InicializarPagina() {
        AsignarEventos();
        ConfigurarFechaMinima();
        await CargarCatalogo();
        CargarServicioDestacado("");
        RenderizarServicios("");
        OcultarEstadoCarga();
    }

    function AsignarEventos() {
        SelectHotelServicios.addEventListener("change", (Evento) => {
            const IdHotelSeleccionado = Evento.target.value;
            RenderizarServicios(IdHotelSeleccionado);
            CargarServicioDestacado(IdHotelSeleccionado);
        });

        if (BotonServicioDestacado) {
            BotonServicioDestacado.addEventListener("click", () => {
                const IdHotelSeleccionado = SelectHotelServicios.value;
                const ServicioDestacado = ObtenerServicioDestacado(IdHotelSeleccionado);

                if (ServicioDestacado) {
                    AbrirModalSolicitud(ServicioDestacado);
                }
            });
        }

        if (OverlayModalServicio) {
            OverlayModalServicio.addEventListener("click", CerrarModalSolicitud);
        }

        if (BotonCerrarModalServicio) {
            BotonCerrarModalServicio.addEventListener("click", CerrarModalSolicitud);
        }

        if (BotonCancelarModalServicio) {
            BotonCancelarModalServicio.addEventListener("click", CerrarModalSolicitud);
        }

        if (InputCantidadServicio) {
            InputCantidadServicio.addEventListener("input", ActualizarResumenModal);
        }

        if (FormularioSolicitudServicio) {
            FormularioSolicitudServicio.addEventListener("submit", EnviarSolicitudServicio);
        }
    }

    function ConfigurarFechaMinima() {
        const Hoy = new Date();
        const FechaFormateada = Hoy.toISOString().split("T")[0];

        if (InputFechaServicio) {
            InputFechaServicio.min = FechaFormateada;
            InputFechaServicio.value = FechaFormateada;
        }
    }

    async function CargarCatalogo() {
        try {
            MostrarEstadoCarga("Cargando servicios...");

            const Respuesta = await fetch("php/Publico/Servicios.php", {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });

            const Datos = await Respuesta.json();

            if (!Respuesta.ok || !Datos.success) {
                throw new Error(Datos.message || "No fue posible cargar los servicios.");
            }

            ListaHoteles = Array.isArray(Datos.data?.Hoteles) ? Datos.data.Hoteles : [];
            ListaServicios = Array.isArray(Datos.data?.Servicios) ? Datos.data.Servicios : [];

            CargarHoteles();
        } catch (Error) {
            ListaHoteles = [];
            ListaServicios = [];
            MostrarEstadoCarga(Error.message || "No fue posible cargar el catálogo.");
        }
    }

    function CargarHoteles() {
        SelectHotelServicios.innerHTML = '<option value="">Todos los hoteles</option>';

        ListaHoteles.forEach((Hotel) => {
            const Opcion = document.createElement("option");
            Opcion.value = String(Hotel.ID_HOTEL);
            Opcion.textContent = Hotel.NOMBRE_HOTEL;
            SelectHotelServicios.appendChild(Opcion);
        });
    }

    function ObtenerServicioDestacado(IdHotelSeleccionado = "") {
        if (!ListaServicios.length) {
            return null;
        }

        if (!IdHotelSeleccionado) {
            return ListaServicios.find((Servicio) => Servicio.NOMBRE_SERVICIO === "Spa Coral")
                || ListaServicios[0]
                || null;
        }

        const ServiciosDelHotel = ListaServicios.filter(
            (Servicio) => String(Servicio.ID_HOTEL) === String(IdHotelSeleccionado)
        );

        if (!ServiciosDelHotel.length) {
            return ListaServicios.find((Servicio) => Servicio.NOMBRE_SERVICIO === "Spa Coral")
                || ListaServicios[0]
                || null;
        }

        const PrioridadesPorHotel = {
            "1": "Cabalgata al atardecer",
            "2": "Tour cultural caribeño",
            "3": "Cena típica frente al mar"
        };

        const NombrePrioritario = PrioridadesPorHotel[String(IdHotelSeleccionado)];

        return ServiciosDelHotel.find((Servicio) => Servicio.NOMBRE_SERVICIO === NombrePrioritario)
            || ServiciosDelHotel[0]
            || null;
    }

    function CargarServicioDestacado(IdHotelSeleccionado = "") {
        const ServicioDestacado = ObtenerServicioDestacado(IdHotelSeleccionado);

        if (!ServicioDestacado) {
            TituloServicioDestacado.textContent = "Sin servicio destacado";
            TextoServicioDestacado.textContent = "Por el momento no hay información disponible.";
            PrecioServicioDestacado.textContent = "Precio no disponible";
            ImagenServicioDestacado.src = "Recursos/Imagenes/HotelGeneral.png";
            ImagenServicioDestacado.alt = "Servicio destacado";
            return;
        }

        TituloServicioDestacado.textContent = ServicioDestacado.NOMBRE_SERVICIO;
        TextoServicioDestacado.textContent = ServicioDestacado.DESCRIPCION || "Sin descripción disponible.";
        PrecioServicioDestacado.textContent = `Precio desde ${FormatearMoneda(ServicioDestacado.PRECIO)}`;
        ImagenServicioDestacado.src = ObtenerImagenServicio(ServicioDestacado.NOMBRE_SERVICIO);
        ImagenServicioDestacado.alt = ServicioDestacado.NOMBRE_SERVICIO;
    }

    function ObtenerServiciosFiltrados(IdHotelSeleccionado) {
        if (!IdHotelSeleccionado) {
            return ListaServicios;
        }

        return ListaServicios.filter((Servicio) => String(Servicio.ID_HOTEL) === String(IdHotelSeleccionado));
    }

    function RenderizarServicios(IdHotelSeleccionado) {
        const ServiciosFiltrados = ObtenerServiciosFiltrados(IdHotelSeleccionado);

        GridServicios.innerHTML = "";

        if (ServiciosFiltrados.length === 0) {
            MostrarEstadoVacio();
            CantidadServicios.textContent = "0";
            CargarServicioDestacado(IdHotelSeleccionado);
            return;
        }

        OcultarEstadoVacio();
        CantidadServicios.textContent = String(ServiciosFiltrados.length);

        ServiciosFiltrados.forEach((Servicio) => {
            const Fragmento = PlantillaTarjetaServicio.content.cloneNode(true);

            const ImagenServicio = Fragmento.querySelector(".ImagenServicio");
            const NombreServicio = Fragmento.querySelector(".NombreServicio");
            const PrecioServicio = Fragmento.querySelector(".PrecioServicio");
            const HotelServicio = Fragmento.querySelector(".HotelServicio");
            const DescripcionServicio = Fragmento.querySelector(".DescripcionServicio");
            const BotonServicio = Fragmento.querySelector(".BotonServicio");

            ImagenServicio.src = ObtenerImagenServicio(Servicio.NOMBRE_SERVICIO);
            ImagenServicio.alt = Servicio.NOMBRE_SERVICIO;
            NombreServicio.textContent = Servicio.NOMBRE_SERVICIO;
            PrecioServicio.textContent = FormatearMoneda(Servicio.PRECIO);
            HotelServicio.textContent = `Disponible en: ${Servicio.NOMBRE_HOTEL}`;
            DescripcionServicio.textContent = Servicio.DESCRIPCION || "Sin descripción disponible.";

            BotonServicio.addEventListener("click", () => {
                AbrirModalSolicitud(Servicio);
            });

            GridServicios.appendChild(Fragmento);
        });
    }

    function MostrarEstadoVacio() {
        EstadoVacioServicios.classList.remove("EstadoServiciosOculto");
    }

    function OcultarEstadoVacio() {
        EstadoVacioServicios.classList.add("EstadoServiciosOculto");
    }

    function MostrarEstadoCarga(Texto) {
        if (EstadoCargaServicios) {
            EstadoCargaServicios.textContent = Texto;
            EstadoCargaServicios.classList.remove("EstadoServiciosOculto");
        }
    }

    function OcultarEstadoCarga() {
        if (EstadoCargaServicios) {
            EstadoCargaServicios.classList.add("EstadoServiciosOculto");
        }
    }

    async function AbrirModalSolicitud(Servicio) {
        ServicioSeleccionado = Servicio;
        LimpiarMensajeModal();

        InputIdServicio.value = Servicio.ID_SERVICIO;
        InputNombreServicioModal.value = Servicio.NOMBRE_SERVICIO;
        InputHotelServicioModal.value = Servicio.NOMBRE_HOTEL;
        InputCantidadServicio.value = "1";
        ConfigurarFechaMinima();
        await CargarReservasUsuario();
        ActualizarResumenModal();

        ModalSolicitudServicio.classList.remove("ModalOculto");
        document.body.style.overflow = "hidden";
    }

    function CerrarModalSolicitud() {
        ModalSolicitudServicio.classList.add("ModalOculto");
        document.body.style.overflow = "";
        ServicioSeleccionado = null;
        FormularioSolicitudServicio.reset();
        SelectReservaServicio.innerHTML = '<option value="">Selecciona una reserva</option>';
        ConfigurarFechaMinima();
        LimpiarMensajeModal();
        ResumenModalServicio.textContent = "Total estimado: ₡0.00";
    }

    async function CargarReservasUsuario() {
        SelectReservaServicio.innerHTML = '<option value="">Cargando reservas...</option>';

        try {
            const Respuesta = await fetch("php/Publico/ReservaServicio.php", {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });

            const Datos = await Respuesta.json();

            if (!Respuesta.ok || !Datos.success) {
                throw new Error(Datos.message || "No fue posible cargar tus reservas.");
            }

            ListaReservasUsuario = Array.isArray(Datos.data?.Reservas) ? Datos.data.Reservas : [];
            RenderizarReservasUsuario();
        } catch (Error) {
            ListaReservasUsuario = [];
            SelectReservaServicio.innerHTML = '<option value="">No disponible</option>';
            MostrarMensajeModal(Error.message || "No fue posible cargar tus reservas.", "error");
        }
    }

    function RenderizarReservasUsuario() {
        SelectReservaServicio.innerHTML = '<option value="">Selecciona una reserva</option>';

        if (ListaReservasUsuario.length === 0) {
            SelectReservaServicio.innerHTML = '<option value="">No tienes reservas válidas</option>';
            return;
        }

        ListaReservasUsuario.forEach((Reserva) => {
            const Opcion = document.createElement("option");
            Opcion.value = String(Reserva.ID_RESERVA);
            Opcion.textContent =
                `Reserva #${Reserva.ID_RESERVA} - ${Reserva.NOMBRE_HOTEL} (${Reserva.FECHA_CHECK_IN} a ${Reserva.FECHA_CHECK_OUT})`;
            SelectReservaServicio.appendChild(Opcion);
        });
    }

    function ActualizarResumenModal() {
        if (!ServicioSeleccionado) {
            ResumenModalServicio.textContent = "Total estimado: ₡0.00";
            return;
        }

        const Cantidad = Number(InputCantidadServicio.value || 0);
        const Precio = Number(ServicioSeleccionado.PRECIO || 0);
        const Total = Cantidad > 0 ? Cantidad * Precio : 0;

        ResumenModalServicio.textContent = `Total estimado: ${FormatearMoneda(Total)}`;
    }

    async function EnviarSolicitudServicio(Evento) {
        Evento.preventDefault();
        LimpiarMensajeModal();

        const IdServicio = InputIdServicio.value.trim();
        const IdReserva = SelectReservaServicio.value.trim();
        const Cantidad = InputCantidadServicio.value.trim();
        const FechaServicio = InputFechaServicio.value.trim();

        if (!IdServicio) {
            MostrarMensajeModal("No se encontró el servicio seleccionado.", "error");
            return;
        }

        if (!IdReserva) {
            MostrarMensajeModal("Debes seleccionar una reserva.", "error");
            return;
        }

        if (!Cantidad || Number(Cantidad) <= 0) {
            MostrarMensajeModal("Debes ingresar una cantidad válida.", "error");
            return;
        }

        if (!FechaServicio) {
            MostrarMensajeModal("Debes seleccionar la fecha del servicio.", "error");
            return;
        }

        try {
            BotonConfirmarServicio.disabled = true;
            BotonConfirmarServicio.textContent = "Guardando...";

            const Respuesta = await fetch("php/Publico/ReservaServicio.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    IdServicio: Number(IdServicio),
                    IdReserva: Number(IdReserva),
                    Cantidad: Number(Cantidad),
                    FechaServicio: FechaServicio
                })
            });

            const Datos = await Respuesta.json();

            if (!Respuesta.ok || !Datos.success) {
                throw new Error(Datos.message || "No fue posible registrar el servicio.");
            }

            MostrarMensajeModal(Datos.message || "Servicio solicitado correctamente.", "exito");

            setTimeout(() => {
                CerrarModalSolicitud();
            }, 1300);
        } catch (Error) {
            MostrarMensajeModal(Error.message || "No fue posible registrar el servicio.", "error");
        } finally {
            BotonConfirmarServicio.disabled = false;
            BotonConfirmarServicio.textContent = "Confirmar solicitud";
        }
    }

    function MostrarMensajeModal(Mensaje, Tipo) {
        MensajeModalServicio.textContent = Mensaje;
        MensajeModalServicio.classList.remove("MensajeModalServicioOculto", "MensajeModalServicioError", "MensajeModalServicioExito");

        if (Tipo === "exito") {
            MensajeModalServicio.classList.add("MensajeModalServicioExito");
            return;
        }

        MensajeModalServicio.classList.add("MensajeModalServicioError");
    }

    function LimpiarMensajeModal() {
        MensajeModalServicio.textContent = "";
        MensajeModalServicio.classList.add("MensajeModalServicioOculto");
        MensajeModalServicio.classList.remove("MensajeModalServicioError", "MensajeModalServicioExito");
    }

    function FormatearMoneda(Valor) {
        const Numero = Number(Valor || 0);

        return new Intl.NumberFormat("es-CR", {
            style: "currency",
            currency: "CRC",
            minimumFractionDigits: 2
        }).format(Numero);
    }

    function ObtenerImagenServicio(NombreServicio) {
        const NombreNormalizado = String(NombreServicio || "").toLowerCase();

        const MapaImagenes = {
            "spa coral": "Recursos/Imagenes/Spa.jpg",
            "spa y bienestar": "Recursos/Imagenes/Spa.jpg",
            "desayuno típico costarricense": "Recursos/Imagenes/DesayunoTipico.jpg",
            "desayuno tipico costarricense": "Recursos/Imagenes/DesayunoTipico.jpg",
            "tour costero": "Recursos/Imagenes/Tour.jpg",
            "cabalgata al atardecer": "Recursos/Imagenes/Cabalgata.jpg",
            "clase de surf básica": "Recursos/Imagenes/Surfing.jpg",
            "clase de surf basica": "Recursos/Imagenes/Surfing.jpg",
            "cena parrilla tropical": "Recursos/Imagenes/Parrilla.jpg",
            "snorkel costero": "Recursos/Imagenes/Snorkel.jpg",
            "desayuno afrocaribeño": "Recursos/Imagenes/Afrocaribeña.jpg",
            "desayuno afrocaribeno": "Recursos/Imagenes/Afrocaribeña.jpg",
            "tour cultural caribeño": "Recursos/Imagenes/Cultural.jpg",
            "tour cultural caribeno": "Recursos/Imagenes/Cultural.jpg",
            "degustación de cacao artesanal": "Recursos/Imagenes/Cacao.jpg",
            "degustacion de cacao artesanal": "Recursos/Imagenes/Cacao.jpg",
            "café y repostería artesanal": "Recursos/Imagenes/Cafe.jpg",
            "cafe y reposteria artesanal": "Recursos/Imagenes/Cafe.jpg",
            "cena típica frente al mar": "Recursos/Imagenes/Cena.jpg",
            "cena tipica frente al mar": "Recursos/Imagenes/Cena.jpg"
        };

        return MapaImagenes[NombreNormalizado] || "Recursos/Imagenes/HotelGeneral.png";
    }

    InicializarPagina();
});