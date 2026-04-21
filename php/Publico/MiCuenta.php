<?php

header("Content-Type: application/json; charset=utf-8");

require_once __DIR__ . "/../Base/Db.php";
require_once __DIR__ . "/../Base/Sesion.php";

function ResponderJson(bool $Exito, string $Mensaje, array $Datos = [], int $Codigo = 200): void
{
    http_response_code($Codigo);

    echo json_encode([
        "success" => $Exito,
        "message" => $Mensaje,
        "data" => $Datos
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    ResponderJson(false, "Método no permitido.", [], 405);
}

try {
    Sesion::Iniciar();

    if (!Sesion::HaySesion()) {
        ResponderJson(false, "Acceso no autorizado.", [], 401);
    }

    $UsuarioSesion = Sesion::ObtenerUsuario();

    if (!$UsuarioSesion || !isset($UsuarioSesion["ID_USUARIO"])) {
        ResponderJson(false, "Sesión inválida.", [], 401);
    }

    $IdUsuario = (int) $UsuarioSesion["ID_USUARIO"];

    if ($IdUsuario <= 0) {
        ResponderJson(false, "Usuario no válido.", [], 401);
    }

    $Db = new Db();
    $Conexion = $Db->Conectar();

    /*
     * 1) Obtener usuario actual
     */
    $ConsultaUsuario = $Conexion->prepare("
        SELECT
            ID_USUARIO,
            NOMBRE,
            APELLIDO,
            CORREO,
            TELEFONO,
            FECHA_REGISTRO,
            ESTADO_USUARIO,
            ROL
        FROM COR_USUARIOS_TB
        WHERE ID_USUARIO = ?
        LIMIT 1
    ");

    if (!$ConsultaUsuario) {
        throw new Exception("No fue posible preparar la consulta del usuario.");
    }

    $ConsultaUsuario->bind_param("i", $IdUsuario);
    $ConsultaUsuario->execute();

    $ResultadoUsuario = $ConsultaUsuario->get_result();
    $Usuario = $ResultadoUsuario->fetch_assoc();

    $ConsultaUsuario->close();

    if (!$Usuario) {
        $Conexion->close();
        ResponderJson(false, "El usuario autenticado no existe.", [], 404);
    }

    /*
     * 2) Obtener reservas del usuario actual
     *    Se agrupa por reserva para evitar duplicados si hay varias habitaciones ligadas.
     */
    $ConsultaReservas = $Conexion->prepare("
        SELECT
            R.ID_RESERVA,
            H.NOMBRE_HOTEL AS HOTEL,
            GROUP_CONCAT(DISTINCT TH.NOMBRE_TIPO ORDER BY TH.NOMBRE_TIPO SEPARATOR ', ') AS TIPO_HABITACION,
            R.FECHA_CHECK_IN,
            R.FECHA_CHECK_OUT,
            R.CANTIDAD_HUESPEDES,
            R.ESTADO_RESERVA,
            R.TOTAL_RESERVA
        FROM COR_RESERVAS_TB R
        INNER JOIN COR_HOTELES_TB H
            ON H.ID_HOTEL = R.ID_HOTEL
        LEFT JOIN COR_RESERVA_HABITACION_TB RH
            ON RH.ID_RESERVA = R.ID_RESERVA
        LEFT JOIN COR_HABITACIONES_TB HB
            ON HB.ID_HABITACION = RH.ID_HABITACION
        LEFT JOIN COR_TIPOS_HABITACION_TB TH
            ON TH.ID_TIPO_HABITACION = HB.ID_TIPO_HABITACION
        WHERE R.ID_USUARIO = ?
        GROUP BY
            R.ID_RESERVA,
            H.NOMBRE_HOTEL,
            R.FECHA_CHECK_IN,
            R.FECHA_CHECK_OUT,
            R.CANTIDAD_HUESPEDES,
            R.ESTADO_RESERVA,
            R.TOTAL_RESERVA
        ORDER BY R.FECHA_RESERVA DESC, R.ID_RESERVA DESC
    ");

    if (!$ConsultaReservas) {
        throw new Exception("No fue posible preparar la consulta de reservas.");
    }

    $ConsultaReservas->bind_param("i", $IdUsuario);
    $ConsultaReservas->execute();

    $ResultadoReservas = $ConsultaReservas->get_result();
    $Reservas = [];

    while ($FilaReserva = $ResultadoReservas->fetch_assoc()) {
        if ($FilaReserva["TIPO_HABITACION"] === null || $FilaReserva["TIPO_HABITACION"] === "") {
            $FilaReserva["TIPO_HABITACION"] = "No disponible";
        }

        $Reservas[] = $FilaReserva;
    }

    $ConsultaReservas->close();

    /*
     * 3) Obtener comentarios del usuario actual
     *    El comentario está ligado a una reserva y debe filtrarse por ID_USUARIO de la sesión.
     */
    $ConsultaComentarios = $Conexion->prepare("
        SELECT
            C.ID_COMENTARIO,
            H.NOMBRE_HOTEL AS HOTEL,
            C.FECHA_COMENTARIO,
            C.CALIFICACION,
            C.COMENTARIO,
            C.ESTADO_COMENTARIO,
            C.RESPUESTA_ADMIN
        FROM COR_COMENTARIOS_TB C
        INNER JOIN COR_HOTELES_TB H
            ON H.ID_HOTEL = C.ID_HOTEL
        WHERE C.ID_USUARIO = ?
        ORDER BY C.FECHA_COMENTARIO DESC, C.ID_COMENTARIO DESC
    ");

    if (!$ConsultaComentarios) {
        throw new Exception("No fue posible preparar la consulta de comentarios.");
    }

    $ConsultaComentarios->bind_param("i", $IdUsuario);
    $ConsultaComentarios->execute();

    $ResultadoComentarios = $ConsultaComentarios->get_result();
    $Comentarios = [];

    while ($FilaComentario = $ResultadoComentarios->fetch_assoc()) {
        $Comentarios[] = $FilaComentario;
    }

    $ConsultaComentarios->close();
    $Conexion->close();

    ResponderJson(
        true,
        "Cuenta cargada correctamente.",
        [
            "Usuario" => $Usuario,
            "Reservas" => $Reservas,
            "Comentarios" => $Comentarios
        ]
    );
} catch (Throwable $Error) {
    ResponderJson(false, $Error->getMessage(), [], 500);
}
