document.addEventListener("DOMContentLoaded", () => {
    let ListaHoteles = [];
    let ListaServicios = [];

    const SelectHotelServicios = document.getElementById("FiltroHotelServicios");
    const GridServicios = document.getElementById("GridServicios");
    const EstadoCargaServicios = document.getElementById("EstadoCargaServicios");
    const EstadoVacioServicios = document.getElementById("EstadoVacioServicios");
    const CantidadServicios = document.getElementById("CantidadServicios");
    const PlantillaTarjetaServicio = document.getElementById("PlantillaTarjetaServicio");

    const TituloServicioDestacado = document.getElementById("TituloServicioDestacado");
    const TextoServicioDestacado = document.getElementById("TextoServicioDestacado");
    const PrecioServicioDestacado = document.getElementById("PrecioServicioDestacado");
    const ImagenServicioDestacado = document.getElementById("ImagenServicioDestacado");
    const BotonServicioDestacado = document.getElementById("BotonServicioDestacado");

    async function InicializarPagina() {
        AsignarEventos();
        await CargarDatosDesdeBackend();
    }

    function AsignarEventos() {
        SelectHotelServicios.addEventListener("change", (Evento) => {
            const IdHotelSeleccionado = Evento.target.value;
            RenderizarServicios(IdHotelSeleccionado);
        });

        BotonServicioDestacado.addEventListener("click", () => {
            const ServicioDestacado = ObtenerServicioDestacado();

            if (ServicioDestacado) {
                MostrarSolicitudTemporal(ServicioDestacado.NombreServicio);
            }
        });
    }

    async function CargarDatosDesdeBackend() {
        try {
            MostrarEstadoCarga("Cargando servicios...");

            const Respuesta = await fetch("php/Publico/Servicios.php");
            const Resultado = await Respuesta.json();

            if (!Resultado.success) {
                throw new Error(Resultado.message || "No se pudieron cargar los servicios.");
            }

            ListaHoteles = Resultado.data.Hoteles || [];
            ListaServicios = Resultado.data.Servicios || [];

            CargarHoteles();
            CargarServicioDestacado();
            RenderizarServicios("");
            OcultarEstadoCarga();
        } catch (Error) {
            console.error("Error al cargar servicios:", Error);
            MostrarEstadoCarga("No fue posible cargar los servicios en este momento.");
            MostrarEstadoVacio();
            ActualizarCantidadServicios(0);
        }
    }

    function CargarHoteles() {
        SelectHotelServicios.innerHTML = '<option value="">Todos los hoteles</option>';

        ListaHoteles.forEach((Hotel) => {
            const OpcionHotel = document.createElement("option");
            OpcionHotel.value = Hotel.IdHotel;
            OpcionHotel.textContent = Hotel.NombreHotel;
            SelectHotelServicios.appendChild(OpcionHotel);
        });
    }

    function ObtenerServicioDestacado() {
        return ListaServicios.find((Servicio) => Servicio.NombreServicio === "Spa Coral") || ListaServicios[0] || null;
    }

    function CargarServicioDestacado() {
        const ServicioDestacado = ObtenerServicioDestacado();

        if (!ServicioDestacado) {
            TituloServicioDestacado.textContent = "Sin servicio destacado";
            TextoServicioDestacado.textContent = "Por el momento no hay información disponible.";
            PrecioServicioDestacado.textContent = "Precio no disponible";
            ImagenServicioDestacado.src = "Recursos/Imagenes/HotelGeneral.png";
            ImagenServicioDestacado.alt = "Servicio destacado";
            return;
        }

        TituloServicioDestacado.textContent = ServicioDestacado.NombreServicio;
        TextoServicioDestacado.textContent = ServicioDestacado.Descripcion;
        PrecioServicioDestacado.textContent = `Precio desde ${ServicioDestacado.Precio}`;
        ImagenServicioDestacado.src = ServicioDestacado.Imagen;
        ImagenServicioDestacado.alt = ServicioDestacado.NombreServicio;
    }

    function ObtenerServiciosFiltrados(IdHotelSeleccionado) {
        if (!IdHotelSeleccionado) {
            return ListaServicios;
        }

        return ListaServicios.filter((Servicio) =>
            Array.isArray(Servicio.HotelesDisponibles) &&
            Servicio.HotelesDisponibles.includes(IdHotelSeleccionado)
        );
    }

    function RenderizarServicios(IdHotelSeleccionado) {
        const ServiciosFiltrados = ObtenerServiciosFiltrados(IdHotelSeleccionado);

        GridServicios.innerHTML = "";

        if (ServiciosFiltrados.length === 0) {
            MostrarEstadoVacio();
            ActualizarCantidadServicios(0);
            return;
        }

        OcultarEstadoVacio();
        ActualizarCantidadServicios(ServiciosFiltrados.length);

        ServiciosFiltrados.forEach((Servicio) => {
            const Fragmento = PlantillaTarjetaServicio.content.cloneNode(true);

            const ImagenServicio = Fragmento.querySelector(".ImagenServicio");
            const NombreServicio = Fragmento.querySelector(".NombreServicio");
            const PrecioServicio = Fragmento.querySelector(".PrecioServicio");
            const HotelServicio = Fragmento.querySelector(".HotelServicio");
            const DescripcionServicio = Fragmento.querySelector(".DescripcionServicio");
            const BotonServicio = Fragmento.querySelector(".BotonServicio");

            ImagenServicio.src = Servicio.Imagen;
            ImagenServicio.alt = Servicio.NombreServicio;
            NombreServicio.textContent = Servicio.NombreServicio;
            PrecioServicio.textContent = Servicio.Precio;
            HotelServicio.textContent = ObtenerTextoHotel(Servicio, IdHotelSeleccionado);
            DescripcionServicio.textContent = Servicio.Descripcion;

            BotonServicio.addEventListener("click", () => {
                MostrarSolicitudTemporal(Servicio.NombreServicio);
            });

            GridServicios.appendChild(Fragmento);
        });
    }

    function ObtenerTextoHotel(Servicio, IdHotelSeleccionado) {
        if (IdHotelSeleccionado) {
            const HotelEncontrado = ListaHoteles.find((Hotel) => Hotel.IdHotel === IdHotelSeleccionado);
            return HotelEncontrado
                ? `Disponible en: ${HotelEncontrado.NombreHotel}`
                : "Disponible en varios hoteles";
        }

        if (Array.isArray(Servicio.NombresHoteles) && Servicio.NombresHoteles.length > 0) {
            return `Disponible en: ${Servicio.NombresHoteles.join(" • ")}`;
        }

        return "Disponible en varios hoteles";
    }

    function ActualizarCantidadServicios(Cantidad) {
        CantidadServicios.textContent = Cantidad;
    }

    function MostrarEstadoCarga(Mensaje) {
        EstadoCargaServicios.textContent = Mensaje;
        EstadoCargaServicios.classList.remove("EstadoServiciosOculto");
    }

    function OcultarEstadoCarga() {
        EstadoCargaServicios.classList.add("EstadoServiciosOculto");
    }

    function MostrarEstadoVacio() {
        EstadoVacioServicios.classList.remove("EstadoServiciosOculto");
    }

    function OcultarEstadoVacio() {
        EstadoVacioServicios.classList.add("EstadoServiciosOculto");
    }

    function MostrarSolicitudTemporal(NombreServicio) {
        alert(`Gracias por tu interés en ${NombreServicio}.`);
    }

    InicializarPagina();
});