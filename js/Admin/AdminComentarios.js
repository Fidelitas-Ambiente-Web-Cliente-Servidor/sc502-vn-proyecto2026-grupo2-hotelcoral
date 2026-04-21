document.addEventListener("DOMContentLoaded", () => {
    CargarComentariosAdmin();
});

let ListaGlobal = [];
let FiltroActual = "TODOS";

async function CargarComentariosAdmin() {

    try {
        const Respuesta = await fetch("php/Admin/ComentariosAdmin.php");
        const Datos = await Respuesta.json();

        if (Datos.success) {
            ListaGlobal = Datos.data;
            AplicarFiltro();
        }

    } catch (error) {
        console.error(error);
    }
}

function RenderAdminComentarios(Lista) {

    const Contenedor = document.getElementById("ListaAdminComentarios");
    Contenedor.innerHTML = "";

    Lista.forEach(c => {

        const Inicial = (c.NOMBRE || "U").charAt(0);
        const Estrellas = "★".repeat(Math.round(c.CALIFICACION || 5));

        const Tarjeta = `
        <div class="TarjetaComentario AdminComentario">

            <div class="EstadoComentario 
                ${c.ESTADO_COMENTARIO === 'APROBADO' ? 'EstadoAprobado' : ''}
                ${c.ESTADO_COMENTARIO === 'PENDIENTE' ? 'EstadoPendiente' : ''}
                ${c.ESTADO_COMENTARIO === 'SPAM' ? 'EstadoSPAM' : ''}
            ">
                ${c.ESTADO_COMENTARIO}
            </div>

            <div class="ComentarioHeaderTarjeta">

                <div class="UsuarioInfo">
                    <div class="Avatar">${Inicial}</div>

                    <div>
                        <h3>${c.NOMBRE} ${c.APELLIDO}</h3>
                        <span class="Lugar">${c.NOMBRE_HOTEL}</span>
                    </div>
                </div>

                <div class="EstrellasComentario">
                    ${Estrellas}
                </div>

            </div>

            <p>${c.COMENTARIO}</p>

            ${c.RESPUESTA_ADMIN ? `
                <div class="RespuestaHotel">
                    <div class="AdminInfo">
                        <div class="AvatarAdmin">H</div>
                        <strong>Hotel Coral</strong>
                    </div>
                    <p>${c.RESPUESTA_ADMIN}</p>
                </div>
                ` : `
                <textarea id="respuesta-${c.ID_COMENTARIO}" class="AdminTextarea" placeholder="Responder comentario..."></textarea>
                `
            }

            <div class="AdminActions">

                ${c.ESTADO_COMENTARIO === 'PENDIENTE' ? `
                    <button class="BtnAprobar" onclick="AprobarComentario(${c.ID_COMENTARIO})">Aprobar</button>
                ` : ''}

                ${!c.RESPUESTA_ADMIN || c.RESPUESTA_ADMIN.trim() === "" ? `
                    <button class="BtnResponder" onclick="ResponderComentario(${c.ID_COMENTARIO})">Responder</button>
                ` : ''}

                <button class="BtnSpam" onclick="MarcarSpam(${c.ID_COMENTARIO})">Spam</button>
                <button class="BtnEliminar" onclick="EliminarComentario(${c.ID_COMENTARIO})">Eliminar</button>
            </div>

        </div>
        `;

        Contenedor.innerHTML += Tarjeta;
    });
}

async function AprobarComentario(id) {

    if (!confirm("¿Aprobar este comentario?")) return;

    try {
        const Respuesta = await fetch("php/Admin/ComentariosAdmin.php", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ID_COMENTARIO: id,
                ACCION: "APROBAR"
            })
        });

        const Resultado = await Respuesta.json();

        console.log(Resultado.message);

        CargarComentariosAdmin();

    } catch (error) {
        console.error(error);
    }
}


function Filtrar(tipo) {
    FiltroActual = tipo;
    AplicarFiltro();
}

function AplicarFiltro() {

    let ListaFiltrada = ListaGlobal;

    if (FiltroActual !== "TODOS") {
        ListaFiltrada = ListaGlobal.filter(c => c.ESTADO_COMENTARIO === FiltroActual);
    }

    RenderAdminComentarios(ListaFiltrada);
}


async function MarcarSpam(id) {

    const Respuesta = await fetch("php/Admin/ComentariosAdmin.php", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            ID_COMENTARIO: id,
            ACCION: "SPAM"
        })
    });

    const Resultado = await Respuesta.json();
    console.log(Resultado.message);

    CargarComentariosAdmin();
}

async function EliminarComentario(id) {

    if (!confirm("¿Seguro que deseas eliminar este comentario?")) return;

    const Respuesta = await fetch("php/Admin/ComentariosAdmin.php", {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            ID_COMENTARIO: id
        })
    });

    const Resultado = await Respuesta.json();
    console.log(Resultado.message);

    CargarComentariosAdmin();
}

async function ResponderComentario(id) {

    const Texto = document.getElementById(`respuesta-${id}`).value;

    if (!Texto) {
        alert("Escribe una respuesta");
        return;
    }

    const Respuesta = await fetch("php/Admin/ComentariosAdmin.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            ID_COMENTARIO: id,
            RESPUESTA: Texto
        })
    });

    const Resultado = await Respuesta.json();
    console.log(Resultado.message);

    CargarComentariosAdmin();
}