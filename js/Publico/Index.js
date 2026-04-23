document.addEventListener("DOMContentLoaded", () => {
    const EstadoHabitaciones = document.getElementById("EstadoHabitacionesIndex");
    const EstadoServicios = document.getElementById("EstadoServiciosIndex");
    const EstadoComentarios = document.getElementById("EstadoComentariosIndex");

    const ListaHabitaciones = document.getElementById("ListaHabitaciones");
    const ListaServicios = document.getElementById("ListaServicios");
    const CarruselComentarios = document.getElementById("CarruselComentarios");

    const PlantillaHabitacion = document.getElementById("PlantillaHabitacionIndex");
    const PlantillaServicio = document.getElementById("PlantillaServicioIndex");
    const PlantillaComentario = document.getElementById("PlantillaComentarioIndex");

    const BotonComentarioAnterior = document.getElementById("BotonComentarioAnterior");
    const BotonComentarioSiguiente = document.getElementById("BotonComentarioSiguiente");

    InicializarIndex();

    async function InicializarIndex() {
        ConfigurarControlesComentarios();
        await CargarResumenInicio();
    }

    async function CargarResumenInicio() {
        try {
            const Respuesta = await fetch("php/Publico/Inicio.php", {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });

            const Resultado = await Respuesta.json();

            if (!Respuesta.ok || !Resultado.success) {
                MostrarEstado(EstadoHabitaciones, Resultado.message || "No fue posible cargar habitaciones.");
                MostrarEstado(EstadoServicios, Resultado.message || "No fue posible cargar servicios.");
                MostrarEstado(EstadoComentarios, Resultado.message || "No fue posible cargar comentarios.");
                return;
            }

            const Habitaciones = Array.isArray(Resultado.data?.Habitaciones)
                ? Resultado.data.Habitaciones
                : [];

            const Servicios = Array.isArray(Resultado.data?.Servicios)
                ? Resultado.data.Servicios
                : [];

            const Comentarios = Array.isArray(Resultado.data?.Comentarios)
                ? Resultado.data.Comentarios
                : [];

            RenderizarHabitaciones(Habitaciones);
            RenderizarServicios(Servicios);
            RenderizarComentarios(Comentarios);
        } catch (Error) {
            console.error("Error al cargar el inicio:", Error);

            MostrarEstado(EstadoHabitaciones, "Ocurrió un error al cargar habitaciones.");
            MostrarEstado(EstadoServicios, "Ocurrió un error al cargar servicios.");
            MostrarEstado(EstadoComentarios, "Ocurrió un error al cargar comentarios.");
        }
    }

    function RenderizarHabitaciones(Habitaciones) {
        if (!ListaHabitaciones || !PlantillaHabitacion) {
            return;
        }

        ListaHabitaciones.innerHTML = "";

        if (!Habitaciones.length) {
            MostrarEstado(EstadoHabitaciones, "No hay habitaciones destacadas disponibles en este momento.");
            return;
        }

        OcultarEstado(EstadoHabitaciones);

        Habitaciones.forEach((Habitacion) => {
            const Fragmento = PlantillaHabitacion.content.cloneNode(true);

            const Tarjeta = Fragmento.querySelector(".TarjetaHabitacion");
            const Imagen = Fragmento.querySelector(".ImagenTarjetaHabitacion");
            const Titulo = Fragmento.querySelector(".TituloTarjetaHabitacion");
            const Precio = Fragmento.querySelector(".PrecioTarjetaHabitacion");
            const Descripcion = Fragmento.querySelector(".DescripcionTarjetaHabitacion");
            const ListaDetalles = Fragmento.querySelector(".ListaDetallesTarjeta");
            const BotonReserva = Fragmento.querySelector(".BotonTarjeta");

            const UrlImagen = Habitacion.URL_IMAGEN && Habitacion.URL_IMAGEN.trim() !== ""
                ? Habitacion.URL_IMAGEN
                : "Recursos/Imagenes/HotelGeneral.png";

            if (Tarjeta) {
                Tarjeta.dataset.idTipoHabitacion = Habitacion.ID_TIPO_HABITACION ?? "";
                Tarjeta.dataset.idHotel = Habitacion.ID_HOTEL ?? "";
            }

            if (Imagen) {
                Imagen.style.backgroundImage = `url("${UrlImagen}")`;
            }

            if (Titulo) {
                Titulo.textContent = Habitacion.NOMBRE_TIPO ?? "Habitación";
            }

            if (Precio) {
                Precio.innerHTML = `${FormatearMoneda(Habitacion.PRECIO_BASE)} <span>/noche</span>`;
            }

            if (Descripcion) {
                Descripcion.textContent = RecortarTexto(
                    Habitacion.DESCRIPCION || "Sin descripción disponible.",
                    120
                );
            }

            if (ListaDetalles) {
                ListaDetalles.innerHTML = "";

                const Detalles = [
                    `Hotel: ${Habitacion.NOMBRE_HOTEL ?? "No disponible"}`,
                    `Capacidad: ${Habitacion.CAPACIDAD ?? "—"} huésped(es)`,
                    `Camas: ${Habitacion.CANTIDAD_CAMAS ?? "—"}`
                ];

                Detalles.forEach((Detalle) => {
                    const Item = document.createElement("li");
                    Item.textContent = Detalle;
                    ListaDetalles.appendChild(Item);
                });
            }

            if (BotonReserva) {
                const IdTipoHabitacion = encodeURIComponent(Habitacion.ID_TIPO_HABITACION ?? "");
                const IdHotel = encodeURIComponent(Habitacion.ID_HOTEL ?? "");
                BotonReserva.href = `Reservas.html?IdTipoHabitacion=${IdTipoHabitacion}&IdHotel=${IdHotel}`;
            }

            ListaHabitaciones.appendChild(Fragmento);
        });
    }

    function RenderizarServicios(Servicios) {
        if (!ListaServicios || !PlantillaServicio) {
            return;
        }

        ListaServicios.innerHTML = "";

        if (!Servicios.length) {
            MostrarEstado(EstadoServicios, "No hay servicios destacados disponibles en este momento.");
            return;
        }

        OcultarEstado(EstadoServicios);

        Servicios.forEach((Servicio) => {
            const Fragmento = PlantillaServicio.content.cloneNode(true);

            const Icono = Fragmento.querySelector(".ImagenIconoServicio");
            const Titulo = Fragmento.querySelector(".TituloTarjetaServicio");
            const Hotel = Fragmento.querySelector(".HotelServicioIndex");
            const Descripcion = Fragmento.querySelector(".TextoTarjetaServicio");
            const Precio = Fragmento.querySelector(".PrecioServicioIndex");

            if (Icono) {
                Icono.src = ObtenerIconoServicio(Servicio.NOMBRE_SERVICIO ?? "");
                Icono.alt = Servicio.NOMBRE_SERVICIO ?? "Servicio";
            }

            if (Titulo) {
                Titulo.textContent = Servicio.NOMBRE_SERVICIO ?? "Servicio";
            }

            if (Hotel) {
                Hotel.textContent = Servicio.NOMBRE_HOTEL ?? "Hotel Coral";
            }

            if (Descripcion) {
                Descripcion.textContent = RecortarTexto(
                    Servicio.DESCRIPCION || "Sin descripción disponible.",
                    110
                );
            }

            if (Precio) {
                Precio.textContent = FormatearMoneda(Servicio.PRECIO);
            }

            ListaServicios.appendChild(Fragmento);
        });
    }

    function RenderizarComentarios(Comentarios) {
        if (!CarruselComentarios || !PlantillaComentario) {
            return;
        }

        CarruselComentarios.innerHTML = "";

        if (!Comentarios.length) {
            MostrarEstado(EstadoComentarios, "No hay comentarios destacados disponibles en este momento.");
            return;
        }

        OcultarEstado(EstadoComentarios);

        Comentarios.forEach((Comentario) => {
            const Fragmento = PlantillaComentario.content.cloneNode(true);

            const Estrellas = Fragmento.querySelector(".EstrellasComentario");
            const TextoComentario = Fragmento.querySelector(".TextoComentario");
            const NombreComentario = Fragmento.querySelector(".NombreComentario");
            const PaisComentario = Fragmento.querySelector(".PaisComentario");
            const RespuestaContenedor = Fragmento.querySelector(".RespuestaComentarioHotel");
            const TextoRespuesta = Fragmento.querySelector(".TextoRespuestaComentario");

            if (Estrellas) {
                Estrellas.textContent = ConstruirEstrellas(Comentario.CALIFICACION);
            }

            if (TextoComentario) {
                TextoComentario.textContent = `“${RecortarTexto(Comentario.COMENTARIO || "", 170)}”`;
            }

            if (NombreComentario) {
                NombreComentario.textContent = Comentario.AUTOR ?? "Huésped";
            }

            if (PaisComentario) {
                PaisComentario.textContent = Comentario.HOTEL ?? "Hotel Coral";
            }

            if (Comentario.RESPUESTA_ADMIN && Comentario.RESPUESTA_ADMIN.trim() !== "") {
                if (RespuestaContenedor) {
                    RespuestaContenedor.classList.remove("RespuestaComentarioHotelOculta");
                }

                if (TextoRespuesta) {
                    TextoRespuesta.textContent = RecortarTexto(Comentario.RESPUESTA_ADMIN, 160);
                }
            }

            CarruselComentarios.appendChild(Fragmento);
        });
    }

    function ConfigurarControlesComentarios() {
        if (!CarruselComentarios || !BotonComentarioAnterior || !BotonComentarioSiguiente) {
            return;
        }

        BotonComentarioAnterior.addEventListener("click", () => {
            CarruselComentarios.scrollBy({
                left: -380,
                behavior: "smooth"
            });
        });

        BotonComentarioSiguiente.addEventListener("click", () => {
            CarruselComentarios.scrollBy({
                left: 380,
                behavior: "smooth"
            });
        });
    }

    function MostrarEstado(Elemento, Texto) {
        if (!Elemento) {
            return;
        }

        Elemento.textContent = Texto;
        Elemento.style.display = "block";
    }

    function OcultarEstado(Elemento) {
        if (!Elemento) {
            return;
        }

        Elemento.style.display = "none";
    }

    function FormatearMoneda(Valor) {
        const Numero = Number(Valor);

        if (Number.isNaN(Numero)) {
            return "Precio no disponible";
        }

        return Numero.toLocaleString("es-CR", {
            style: "currency",
            currency: "CRC"
        });
    }

    function RecortarTexto(Texto, Limite) {
        const Valor = String(Texto || "").trim();

        if (Valor.length <= Limite) {
            return Valor;
        }

        return `${Valor.slice(0, Limite).trim()}...`;
    }

    function ConstruirEstrellas(Calificacion) {
        const Numero = Math.round(Number(Calificacion));

        if (Number.isNaN(Numero) || Numero <= 0) {
            return "☆☆☆☆☆";
        }

        const Llenas = "★".repeat(Math.min(Numero, 5));
        const Vacias = "☆".repeat(Math.max(0, 5 - Numero));

        return `${Llenas}${Vacias}`;
    }

    function ObtenerIconoServicio(NombreServicio) {
        const Nombre = String(NombreServicio || "").toLowerCase();

        if (Nombre.includes("spa") || Nombre.includes("bienestar")) {
            return "https://img.icons8.com/sf-black-filled/64/2c6e7f/lotus.png";
        }

        if (Nombre.includes("restaurante") || Nombre.includes("gastronom")) {
            return "https://img.icons8.com/ios-filled/50/2c6e7f/tableware.png";
        }

        if (Nombre.includes("tour") || Nombre.includes("aventura")) {
            return "https://img.icons8.com/ios-filled/50/2c6e7f/holding-spyglass.png";
        }

        if (Nombre.includes("evento")) {
            return "https://img.icons8.com/ios-filled/50/2c6e7f/volleyball-2.png";
        }

        return "https://img.icons8.com/ios-filled/50/2c6e7f/service-bell.png";
    }
});