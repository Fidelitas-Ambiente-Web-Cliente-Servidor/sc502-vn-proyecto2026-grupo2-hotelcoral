document.addEventListener("DOMContentLoaded", () => {
    const MensajeAdminReservas = document.getElementById("MensajeAdminReservas");
    const InputBuscarReserva = document.getElementById("InputBuscarReserva");
    const SelectFiltroHotelReserva = document.getElementById("SelectFiltroHotelReserva");
    const SelectFiltroEstadoReserva = document.getElementById("SelectFiltroEstadoReserva");
    const CuerpoTablaReservas = document.getElementById("CuerpoTablaReservas");

    const TarjetaDetalleReserva = document.getElementById("TarjetaDetalleReserva");
    const ContenedorDetalleReserva = document.getElementById("ContenedorDetalleReserva");
    const BotonCerrarDetalleReserva = document.getElementById("BotonCerrarDetalleReserva");

    let ListaHoteles = [];
    let ListaReservas = [];

    InicializarModulo();

    async function InicializarModulo() {
        if (InputBuscarReserva) {
            InputBuscarReserva.addEventListener("input", AplicarFiltros);
        }

        if (SelectFiltroHotelReserva) {
            SelectFiltroHotelReserva.addEventListener("change", AplicarFiltros);
        }

        if (SelectFiltroEstadoReserva) {
            SelectFiltroEstadoReserva.addEventListener("change", AplicarFiltros);
        }

        if (BotonCerrarDetalleReserva) {
            BotonCerrarDetalleReserva.addEventListener("click", () => {
                if (TarjetaDetalleReserva) {
                    TarjetaDetalleReserva.style.display = "none";
                }
            });
        }

        await CargarHoteles();
        await CargarReservas();
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
            MostrarMensaje(MensajeAdminReservas, "No fue posible cargar los hoteles.", "error");
        }
    }

    async function CargarReservas() {
        LimpiarMensaje(MensajeAdminReservas);
        MostrarFilaCarga("Cargando reservas...");

        try {
            const Respuesta = await fetch("php/Admin/AdminReservas.php", {
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
                    MensajeAdminReservas,
                    Resultado.message || "No fue posible cargar las reservas.",
                    "error"
                );
                MostrarFilaCarga("No fue posible cargar las reservas.");
                return;
            }

            ListaReservas = Array.isArray(Resultado.data?.Reservas)
                ? Resultado.data.Reservas
                : [];

            AplicarFiltros();
        } catch (Error) {
            console.error("Error al cargar reservas:", Error);
            MostrarMensaje(
                MensajeAdminReservas,
                "Ocurrió un error inesperado al cargar las reservas.",
                "error"
            );
            MostrarFilaCarga("No fue posible cargar las reservas.");
        }
    }

    function RenderizarSelectHoteles() {
        if (!SelectFiltroHotelReserva) {
            return;
        }

        SelectFiltroHotelReserva.innerHTML = `
            <option value="">Todos los hoteles</option>
        `;

        ListaHoteles.forEach((Hotel) => {
            const Opcion = document.createElement("option");
            Opcion.value = Hotel.ID_HOTEL;
            Opcion.textContent = Hotel.NOMBRE_HOTEL;
            SelectFiltroHotelReserva.appendChild(Opcion);
        });
    }

    function AplicarFiltros() {
        const TextoBusqueda = (InputBuscarReserva?.value || "").trim().toLowerCase();
        const IdHotel = String(SelectFiltroHotelReserva?.value || "").trim();
        const Estado = String(SelectFiltroEstadoReserva?.value || "").trim().toUpperCase();

        let ReservasFiltradas = [...ListaReservas];

        if (TextoBusqueda !== "") {
            ReservasFiltradas = ReservasFiltradas.filter((Reserva) => {
                const Cliente = String(Reserva.NOMBRE_CLIENTE ?? "").toLowerCase();
                const Hotel = String(Reserva.NOMBRE_HOTEL ?? "").toLowerCase();
                const Tipos = String(Reserva.TIPOS_HABITACION ?? "").toLowerCase();
                const Habitaciones = String(Reserva.NUMEROS_HABITACION ?? "").toLowerCase();

                return (
                    Cliente.includes(TextoBusqueda) ||
                    Hotel.includes(TextoBusqueda) ||
                    Tipos.includes(TextoBusqueda) ||
                    Habitaciones.includes(TextoBusqueda)
                );
            });
        }

        if (IdHotel !== "") {
            ReservasFiltradas = ReservasFiltradas.filter((Reserva) => {
                const Hotel = ListaHoteles.find((Item) => Item.NOMBRE_HOTEL === Reserva.NOMBRE_HOTEL);
                return Hotel ? String(Hotel.ID_HOTEL) === IdHotel : false;
            });
        }

        if (Estado !== "") {
            ReservasFiltradas = ReservasFiltradas.filter((Reserva) => {
                return String(Reserva.ESTADO_RESERVA ?? "").toUpperCase() === Estado;
            });
        }

        RenderizarTabla(ReservasFiltradas);
    }

    function RenderizarTabla(Reservas) {
        if (!CuerpoTablaReservas) {
            return;
        }

        CuerpoTablaReservas.innerHTML = "";

        if (!Array.isArray(Reservas) || Reservas.length === 0) {
            CuerpoTablaReservas.innerHTML = `
                <tr>
                    <td colspan="8">No se encontraron reservas.</td>
                </tr>
            `;
            return;
        }

        Reservas.forEach((Reserva) => {
            const Fila = document.createElement("tr");
            const EstadoActual = String(Reserva.ESTADO_RESERVA ?? "").toUpperCase();

            Fila.innerHTML = `
                <td>#${EscapeHtml(Reserva.ID_RESERVA ?? "—")}</td>
                <td class="NombreUsuario">${EscapeHtml(Reserva.NOMBRE_CLIENTE ?? "No disponible")}</td>
                <td>${EscapeHtml(Reserva.NOMBRE_HOTEL ?? "No disponible")}</td>
                <td>
                    <div>${EscapeHtml(Reserva.NUMEROS_HABITACION ?? "Sin asignación")}</div>
                    <div style="font-size:0.85rem; opacity:0.8;">${EscapeHtml(Reserva.TIPOS_HABITACION ?? "Sin tipo")}</div>
                </td>
                <td>
                    <div>${EscapeHtml(FormatearFecha(Reserva.FECHA_CHECK_IN))}</div>
                    <div style="font-size:0.85rem; opacity:0.8;">${EscapeHtml(FormatearFecha(Reserva.FECHA_CHECK_OUT))}</div>
                </td>
                <td>
                    <span class="EtiquetaRol ${ObtenerClaseEstado(EstadoActual)}">
                        ${EscapeHtml(EstadoActual)}
                    </span>
                </td>
                <td>${EscapeHtml(FormatearMoneda(Reserva.TOTAL_RESERVA))}</td>
                <td>
                    <div class="FilaAcciones">
                        <button type="button" class="BotonEditar" data-detalle="${Reserva.ID_RESERVA}">
                            Ver detalle
                        </button>
                        <button type="button" class="BotonSecundario" data-estado="${Reserva.ID_RESERVA}">
                            Cambiar estado
                        </button>
                    </div>
                </td>
            `;

            const BotonDetalle = Fila.querySelector('button[data-detalle]');
            const BotonEstado = Fila.querySelector('button[data-estado]');

            if (BotonDetalle) {
                BotonDetalle.addEventListener("click", () => {
                    CargarDetalleReserva(Number(Reserva.ID_RESERVA));
                });
            }

            if (BotonEstado) {
                BotonEstado.addEventListener("click", () => {
                    CambiarEstadoReserva(Number(Reserva.ID_RESERVA), EstadoActual);
                });
            }

            CuerpoTablaReservas.appendChild(Fila);
        });
    }

    async function CargarDetalleReserva(IdReserva) {
        try {
            const Respuesta = await fetch(`php/Admin/AdminReservas.php?id=${encodeURIComponent(IdReserva)}`, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });

            const Resultado = await Respuesta.json();

            if (!Respuesta.ok || !Resultado.success || !Resultado.data?.Reserva) {
                MostrarMensaje(
                    MensajeAdminReservas,
                    Resultado.message || "No fue posible cargar el detalle de la reserva.",
                    "error"
                );
                return;
            }

            const Reserva = Resultado.data.Reserva;
            const Habitaciones = Array.isArray(Resultado.data?.Habitaciones) ? Resultado.data.Habitaciones : [];
            const Servicios = Array.isArray(Resultado.data?.Servicios) ? Resultado.data.Servicios : [];

            RenderizarDetalleReserva(Reserva, Habitaciones, Servicios);

            if (TarjetaDetalleReserva) {
                TarjetaDetalleReserva.style.display = "block";
                TarjetaDetalleReserva.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        } catch (Error) {
            console.error("Error al cargar detalle:", Error);
            MostrarMensaje(MensajeAdminReservas, "Ocurrió un error inesperado al cargar el detalle.", "error");
        }
    }

    function RenderizarDetalleReserva(Reserva, Habitaciones, Servicios) {
        if (!ContenedorDetalleReserva) {
            return;
        }

        const HabitacionesHtml = Habitaciones.length > 0
            ? Habitaciones.map((Habitacion) => `
                <article class="TarjetaListadoCuenta">
                    <div class="EncabezadoListadoCuenta">
                        <h3 class="TituloListadoCuenta">Habitación ${EscapeHtml(Habitacion.NUMERO_HABITACION ?? "—")}</h3>
                        <span class="EtiquetaEstadoCuenta">${EscapeHtml(Habitacion.NOMBRE_TIPO ?? "Sin tipo")}</span>
                    </div>
                    <div class="CuerpoListadoCuenta">
                        <p><strong>Precio por noche:</strong> ${EscapeHtml(FormatearMoneda(Habitacion.PRECIO_NOCHE))}</p>
                        <p><strong>Noches:</strong> ${EscapeHtml(Habitacion.CANTIDAD_NOCHES ?? "—")}</p>
                        <p><strong>Subtotal:</strong> ${EscapeHtml(FormatearMoneda(Habitacion.SUBTOTAL))}</p>
                    </div>
                </article>
            `).join("")
            : `<p class="TextoVacio">Esta reserva no tiene habitaciones asociadas.</p>`;

        const ServiciosHtml = Servicios.length > 0
            ? Servicios.map((Servicio) => `
                <article class="TarjetaListadoCuenta">
                    <div class="EncabezadoListadoCuenta">
                        <h3 class="TituloListadoCuenta">${EscapeHtml(Servicio.NOMBRE_SERVICIO ?? "Servicio")}</h3>
                        <span class="EtiquetaEstadoCuenta">${EscapeHtml(FormatearFechaHora(Servicio.FECHA_SERVICIO))}</span>
                    </div>
                    <div class="CuerpoListadoCuenta">
                        <p><strong>Cantidad:</strong> ${EscapeHtml(Servicio.CANTIDAD ?? "—")}</p>
                        <p><strong>Precio unitario:</strong> ${EscapeHtml(FormatearMoneda(Servicio.PRECIO_UNITARIO))}</p>
                        <p><strong>Subtotal:</strong> ${EscapeHtml(FormatearMoneda(Servicio.SUBTOTAL))}</p>
                    </div>
                </article>
            `).join("")
            : `<p class="TextoVacio">Esta reserva no tiene servicios asociados.</p>`;

        ContenedorDetalleReserva.innerHTML = `
    <div class="ContenedorDetalleReserva">
        <article class="BloqueDetalleReserva">
            <h3 class="TituloBloqueDetalleReserva">Resumen general</h3>
            <div class="ListaDatosDetalleReserva">
                <p><strong>Reserva:</strong> #${EscapeHtml(Reserva.ID_RESERVA ?? "—")}</p>
                <p><strong>Estado:</strong> ${EscapeHtml(Reserva.ESTADO_RESERVA ?? "—")}</p>
                <p><strong>Cliente:</strong> ${EscapeHtml(`${Reserva.NOMBRE ?? ""} ${Reserva.APELLIDO ?? ""}`.trim() || "No disponible")}</p>
                <p><strong>Correo:</strong> ${EscapeHtml(Reserva.CORREO ?? "No disponible")}</p>
                <p><strong>Teléfono:</strong> ${EscapeHtml(Reserva.TELEFONO ?? "No registrado")}</p>
                <p><strong>Hotel:</strong> ${EscapeHtml(Reserva.NOMBRE_HOTEL ?? "No disponible")}</p>
                <p><strong>Fecha de reserva:</strong> ${EscapeHtml(FormatearFechaHora(Reserva.FECHA_RESERVA))}</p>
                <p><strong>Entrada:</strong> ${EscapeHtml(FormatearFecha(Reserva.FECHA_CHECK_IN))}</p>
                <p><strong>Salida:</strong> ${EscapeHtml(FormatearFecha(Reserva.FECHA_CHECK_OUT))}</p>
                <p><strong>Huéspedes:</strong> ${EscapeHtml(Reserva.CANTIDAD_HUESPEDES ?? "—")}</p>
                <p><strong>Total:</strong> ${EscapeHtml(FormatearMoneda(Reserva.TOTAL_RESERVA))}</p>
            </div>
        </article>

        <section class="BloqueDetalleReserva">
            <h3 class="TituloBloqueDetalleReserva">Habitaciones asociadas</h3>
            <div class="ListaTarjetasDetalleReserva">
                ${Habitaciones.length > 0
                    ? Habitaciones.map((Habitacion) => `
                        <article class="TarjetaDetalleInterna">
                            <p><strong>Habitación:</strong> ${EscapeHtml(Habitacion.NUMERO_HABITACION ?? "—")}</p>
                            <p><strong>Tipo:</strong> ${EscapeHtml(Habitacion.NOMBRE_TIPO ?? "Sin tipo")}</p>
                            <p><strong>Precio por noche:</strong> ${EscapeHtml(FormatearMoneda(Habitacion.PRECIO_NOCHE))}</p>
                            <p><strong>Noches:</strong> ${EscapeHtml(Habitacion.CANTIDAD_NOCHES ?? "—")}</p>
                            <p><strong>Subtotal:</strong> ${EscapeHtml(FormatearMoneda(Habitacion.SUBTOTAL))}</p>
                        </article>
                    `).join("")
                    : `<p class="TextoVacio">Esta reserva no tiene habitaciones asociadas.</p>`
                }
            </div>
        </section>

        <section class="BloqueDetalleReserva">
            <h3 class="TituloBloqueDetalleReserva">Servicios asociados</h3>
            <div class="ListaTarjetasDetalleReserva">
                ${Servicios.length > 0
                    ? Servicios.map((Servicio) => `
                        <article class="TarjetaDetalleInterna">
                            <p><strong>Servicio:</strong> ${EscapeHtml(Servicio.NOMBRE_SERVICIO ?? "Servicio")}</p>
                            <p><strong>Fecha:</strong> ${EscapeHtml(FormatearFechaHora(Servicio.FECHA_SERVICIO))}</p>
                            <p><strong>Cantidad:</strong> ${EscapeHtml(Servicio.CANTIDAD ?? "—")}</p>
                            <p><strong>Precio unitario:</strong> ${EscapeHtml(FormatearMoneda(Servicio.PRECIO_UNITARIO))}</p>
                            <p><strong>Subtotal:</strong> ${EscapeHtml(FormatearMoneda(Servicio.SUBTOTAL))}</p>
                        </article>
                    `).join("")
                    : `<p class="TextoVacio">Esta reserva no tiene servicios asociados.</p>`
                }
            </div>
        </section>
    </div>
`;
    }

    async function CambiarEstadoReserva(IdReserva, EstadoActual) {
        const NuevoEstado = prompt(
            `Estado actual: ${EstadoActual}\n\nEscribe el nuevo estado:\nPENDIENTE, CONFIRMADA, CANCELADA o FINALIZADA`,
            EstadoActual
        );

        if (!NuevoEstado) {
            return;
        }

        const EstadoReserva = String(NuevoEstado).trim().toUpperCase();

        if (!["PENDIENTE", "CONFIRMADA", "CANCELADA", "FINALIZADA"].includes(EstadoReserva)) {
            MostrarMensaje(MensajeAdminReservas, "El estado ingresado no es válido.", "error");
            return;
        }

        try {
            const Respuesta = await fetch("php/Admin/AdminReservas.php", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    IdReserva,
                    EstadoReserva
                })
            });

            const Resultado = await Respuesta.json();

            if (!Respuesta.ok || !Resultado.success) {
                MostrarMensaje(
                    MensajeAdminReservas,
                    Resultado.message || "No fue posible actualizar el estado de la reserva.",
                    "error"
                );
                return;
            }

            MostrarMensaje(MensajeAdminReservas, "Estado de reserva actualizado correctamente.", "exito");
            await CargarReservas();

            if (TarjetaDetalleReserva && TarjetaDetalleReserva.style.display !== "none") {
                await CargarDetalleReserva(IdReserva);
            }
        } catch (Error) {
            console.error("Error al cambiar estado:", Error);
            MostrarMensaje(MensajeAdminReservas, "Ocurrió un error inesperado al cambiar el estado.", "error");
        }
    }

    function ObtenerClaseEstado(EstadoActual) {
        if (EstadoActual === "CONFIRMADA") {
            return "RolCliente";
        }

        if (EstadoActual === "PENDIENTE") {
            return "RolAdmin";
        }

        if (EstadoActual === "CANCELADA") {
            return "RolAdmin";
        }

        if (EstadoActual === "FINALIZADA") {
            return "RolCliente";
        }

        return "";
    }

    function MostrarFilaCarga(Texto) {
        if (!CuerpoTablaReservas) {
            return;
        }

        CuerpoTablaReservas.innerHTML = `
            <tr>
                <td colspan="8">${EscapeHtml(Texto)}</td>
            </tr>
        `;
    }

    function FormatearFecha(ValorFecha) {
        if (!ValorFecha) {
            return "No disponible";
        }

        const Fecha = new Date(`${ValorFecha}T00:00:00`);

        if (Number.isNaN(Fecha.getTime())) {
            return ValorFecha;
        }

        return Fecha.toLocaleDateString("es-CR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        });
    }

    function FormatearFechaHora(ValorFechaHora) {
        if (!ValorFechaHora) {
            return "No disponible";
        }

        const Fecha = new Date(String(ValorFechaHora).replace(" ", "T"));

        if (Number.isNaN(Fecha.getTime())) {
            return ValorFechaHora;
        }

        return Fecha.toLocaleString("es-CR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        });
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
})
;