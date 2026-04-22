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

function ObtenerDatosJson(): array
{
    $Contenido = file_get_contents("php://input");

    if (!$Contenido) {
        return [];
    }

    $Datos = json_decode($Contenido, true);

    return is_array($Datos) ? $Datos : [];
}

try {
    Sesion::Iniciar();

    if (!Sesion::HaySesion()) {
        ResponderJson(false, "Debes iniciar sesión para solicitar un servicio.", [], 401);
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

    if ($_SERVER["REQUEST_METHOD"] === "GET") {
        $ConsultaReservas = $Conexion->prepare("
            SELECT
                R.ID_RESERVA,
                R.ID_HOTEL,
                H.NOMBRE_HOTEL,
                R.FECHA_CHECK_IN,
                R.FECHA_CHECK_OUT,
                R.ESTADO_RESERVA
            FROM COR_RESERVAS_TB R
            INNER JOIN COR_HOTELES_TB H
                ON H.ID_HOTEL = R.ID_HOTEL
            WHERE R.ID_USUARIO = ?
              AND R.ESTADO_RESERVA IN ('PENDIENTE', 'CONFIRMADA')
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
            $Reservas[] = $FilaReserva;
        }

        $ConsultaReservas->close();
        $Conexion->close();

        ResponderJson(
            true,
            "Reservas cargadas correctamente.",
            [
                "Reservas" => $Reservas
            ]
        );
    }

    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        $Conexion->close();
        ResponderJson(false, "Método no permitido.", [], 405);
    }

    $Datos = ObtenerDatosJson();

    $IdServicio = isset($Datos["IdServicio"]) ? (int) $Datos["IdServicio"] : 0;
    $IdReserva = isset($Datos["IdReserva"]) ? (int) $Datos["IdReserva"] : 0;
    $Cantidad = isset($Datos["Cantidad"]) ? (int) $Datos["Cantidad"] : 0;
    $FechaServicio = isset($Datos["FechaServicio"]) ? trim((string) $Datos["FechaServicio"]) : "";

    if ($IdServicio <= 0) {
        $Conexion->close();
        ResponderJson(false, "Servicio no válido.", [], 422);
    }

    if ($IdReserva <= 0) {
        $Conexion->close();
        ResponderJson(false, "Debes seleccionar una reserva válida.", [], 422);
    }

    if ($Cantidad <= 0) {
        $Conexion->close();
        ResponderJson(false, "La cantidad debe ser mayor a cero.", [], 422);
    }

    if ($FechaServicio === "") {
        $Conexion->close();
        ResponderJson(false, "Debes indicar la fecha del servicio.", [], 422);
    }

    $FechaActual = date("Y-m-d");

    if ($FechaServicio < $FechaActual) {
        $Conexion->close();
        ResponderJson(false, "La fecha del servicio no puede ser anterior a hoy.", [], 422);
    }

    $ConsultaReserva = $Conexion->prepare("
        SELECT
            R.ID_RESERVA,
            R.ID_HOTEL,
            R.ESTADO_RESERVA
        FROM COR_RESERVAS_TB R
        WHERE R.ID_RESERVA = ?
          AND R.ID_USUARIO = ?
        LIMIT 1
    ");

    if (!$ConsultaReserva) {
        throw new Exception("No fue posible preparar la validación de la reserva.");
    }

    $ConsultaReserva->bind_param("ii", $IdReserva, $IdUsuario);
    $ConsultaReserva->execute();

    $ResultadoReserva = $ConsultaReserva->get_result();
    $Reserva = $ResultadoReserva->fetch_assoc();
    $ConsultaReserva->close();

    if (!$Reserva) {
        $Conexion->close();
        ResponderJson(false, "La reserva seleccionada no pertenece al usuario.", [], 403);
    }

    if (!in_array($Reserva["ESTADO_RESERVA"], ["PENDIENTE", "CONFIRMADA"], true)) {
        $Conexion->close();
        ResponderJson(false, "La reserva seleccionada no permite asociar servicios.", [], 422);
    }

    $ConsultaServicio = $Conexion->prepare("
        SELECT
            ID_SERVICIO,
            ID_HOTEL,
            PRECIO,
            ESTADO_SERVICIO
        FROM COR_SERVICIOS_TB
        WHERE ID_SERVICIO = ?
        LIMIT 1
    ");

    if (!$ConsultaServicio) {
        throw new Exception("No fue posible preparar la validación del servicio.");
    }

    $ConsultaServicio->bind_param("i", $IdServicio);
    $ConsultaServicio->execute();

    $ResultadoServicio = $ConsultaServicio->get_result();
    $Servicio = $ResultadoServicio->fetch_assoc();
    $ConsultaServicio->close();

    if (!$Servicio) {
        $Conexion->close();
        ResponderJson(false, "El servicio seleccionado no existe.", [], 404);
    }

    if ($Servicio["ESTADO_SERVICIO"] !== "ACTIVO") {
        $Conexion->close();
        ResponderJson(false, "El servicio seleccionado no está disponible.", [], 422);
    }

    if ((int) $Servicio["ID_HOTEL"] !== (int) $Reserva["ID_HOTEL"]) {
        $Conexion->close();
        ResponderJson(false, "El servicio no pertenece al mismo hotel de la reserva.", [], 422);
    }

    $PrecioUnitario = (float) $Servicio["PRECIO"];
    $Subtotal = $PrecioUnitario * $Cantidad;
    $FechaServicioCompleta = $FechaServicio . " 10:00:00";

    $ConsultaDuplicado = $Conexion->prepare("
        SELECT
            ID_RESERVA_SERVICIO
        FROM COR_RESERVA_SERVICIO_TB
        WHERE ID_RESERVA = ?
          AND ID_SERVICIO = ?
          AND FECHA_SERVICIO = ?
        LIMIT 1
    ");

    if (!$ConsultaDuplicado) {
        throw new Exception("No fue posible preparar la validación de duplicados.");
    }

    $ConsultaDuplicado->bind_param("iis", $IdReserva, $IdServicio, $FechaServicioCompleta);
    $ConsultaDuplicado->execute();

    $ResultadoDuplicado = $ConsultaDuplicado->get_result();
    $Duplicado = $ResultadoDuplicado->fetch_assoc();
    $ConsultaDuplicado->close();

    if ($Duplicado) {
        $Conexion->close();
        ResponderJson(false, "Ya existe una solicitud de este servicio para esa fecha.", [], 409);
    }

    $ConsultaInsertar = $Conexion->prepare("
        INSERT INTO COR_RESERVA_SERVICIO_TB
        (
            ID_RESERVA,
            ID_SERVICIO,
            FECHA_SERVICIO,
            CANTIDAD,
            PRECIO_UNITARIO,
            SUBTOTAL
        )
        VALUES (?, ?, ?, ?, ?, ?)
    ");

    if (!$ConsultaInsertar) {
        throw new Exception("No fue posible preparar el registro del servicio.");
    }

    $ConsultaInsertar->bind_param(
        "iisidd",
        $IdReserva,
        $IdServicio,
        $FechaServicioCompleta,
        $Cantidad,
        $PrecioUnitario,
        $Subtotal
    );

    $Guardado = $ConsultaInsertar->execute();
    $ConsultaInsertar->close();

    if (!$Guardado) {
        $Conexion->close();
        ResponderJson(false, "No fue posible guardar la solicitud del servicio.", [], 500);
    }

    $Conexion->close();

    ResponderJson(
        true,
        "Servicio agregado correctamente a la reserva.",
        [
            "IdReserva" => $IdReserva,
            "IdServicio" => $IdServicio,
            "Cantidad" => $Cantidad,
            "PrecioUnitario" => $PrecioUnitario,
            "Subtotal" => $Subtotal,
            "FechaServicio" => $FechaServicioCompleta
        ]
    );
} catch (Throwable $Error) {
    if (isset($Conexion) && $Conexion instanceof mysqli) {
        try {
            $Conexion->close();
        } catch (Throwable $ErrorConexion) {
        }
    }

    ResponderJson(false, $Error->getMessage(), [], 500);
}