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

function ObtenerDatosEntrada(): array
{
    $Contenido = file_get_contents("php://input");
    $Json = json_decode($Contenido, true);

    if (is_array($Json) && !empty($Json)) {
        return $Json;
    }

    if (!empty($_POST)) {
        return $_POST;
    }

    parse_str($Contenido, $DatosParseados);

    return is_array($DatosParseados) ? $DatosParseados : [];
}

function NormalizarTexto(?string $Valor): string
{
    return trim((string) $Valor);
}

function ValidarSesionCliente(): array
{
    Sesion::Iniciar();

    if (!Sesion::HaySesion()) {
        ResponderJson(false, "Debes iniciar sesión para realizar una reserva.", [], 401);
    }

    $Usuario = Sesion::ObtenerUsuario();

    if (!$Usuario || !isset($Usuario["ID_USUARIO"])) {
        ResponderJson(false, "Sesión inválida.", [], 401);
    }

    if (($Usuario["ROL"] ?? "") !== "CLIENTE" && ($Usuario["ROL"] ?? "") !== "ADMIN") {
        ResponderJson(false, "No tienes permisos para reservar.", [], 403);
    }

    return $Usuario;
}

function CalcularCantidadNoches(string $FechaEntrada, string $FechaSalida): int
{
    $MarcaEntrada = strtotime($FechaEntrada);
    $MarcaSalida = strtotime($FechaSalida);

    if ($MarcaEntrada === false || $MarcaSalida === false) {
        return 0;
    }

    $DiferenciaSegundos = $MarcaSalida - $MarcaEntrada;
    return (int) floor($DiferenciaSegundos / 86400);
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    ResponderJson(false, "Método no permitido.", [], 405);
}

try {
    $UsuarioSesion = ValidarSesionCliente();
    $Datos = ObtenerDatosEntrada();

    $IdUsuario = (int) $UsuarioSesion["ID_USUARIO"];
    $IdHotel = (int) ($Datos["IdHotel"] ?? 0);
    $IdTipoHabitacion = (int) ($Datos["IdTipoHabitacion"] ?? 0);
    $FechaEntrada = NormalizarTexto($Datos["FechaEntrada"] ?? "");
    $FechaSalida = NormalizarTexto($Datos["FechaSalida"] ?? "");
    $CantidadHuespedes = (int) ($Datos["CantidadHuespedes"] ?? 0);
    $NotasAdicionales = NormalizarTexto($Datos["NotasAdicionales"] ?? "");

    if ($IdHotel <= 0) {
        ResponderJson(false, "Debes seleccionar un hotel válido.", [], 422);
    }

    if ($IdTipoHabitacion <= 0) {
        ResponderJson(false, "Debes seleccionar un tipo de habitación válido.", [], 422);
    }

    if ($FechaEntrada === "") {
        ResponderJson(false, "Debes seleccionar la fecha de entrada.", [], 422);
    }

    if ($FechaSalida === "") {
        ResponderJson(false, "Debes seleccionar la fecha de salida.", [], 422);
    }

    if ($CantidadHuespedes <= 0) {
        ResponderJson(false, "La cantidad de huéspedes debe ser mayor que cero.", [], 422);
    }

    $CantidadNoches = CalcularCantidadNoches($FechaEntrada, $FechaSalida);

    if ($CantidadNoches <= 0) {
        ResponderJson(false, "La fecha de salida debe ser posterior a la fecha de entrada.", [], 422);
    }

    $FechaActual = date("Y-m-d");
    if ($FechaEntrada < $FechaActual) {
        ResponderJson(false, "La fecha de entrada no puede ser anterior al día actual.", [], 422);
    }

    $Db = new Db();
    $Conexion = $Db->Conectar();
    $Conexion->begin_transaction();

    $ConsultaHotel = $Conexion->prepare("
        SELECT
            ID_HOTEL,
            NOMBRE_HOTEL,
            ESTADO_HOTEL
        FROM COR_HOTELES_TB
        WHERE ID_HOTEL = ?
        LIMIT 1
    ");

    if (!$ConsultaHotel) {
        throw new Exception("No fue posible validar el hotel.");
    }

    $ConsultaHotel->bind_param("i", $IdHotel);
    $ConsultaHotel->execute();

    $ResultadoHotel = $ConsultaHotel->get_result();
    $Hotel = $ResultadoHotel->fetch_assoc();

    $ConsultaHotel->close();

    if (!$Hotel || ($Hotel["ESTADO_HOTEL"] ?? "") !== "ACTIVO") {
        $Conexion->rollback();
        $Conexion->close();
        ResponderJson(false, "El hotel seleccionado no está disponible.", [], 404);
    }

    $ConsultaTipo = $Conexion->prepare("
        SELECT
            ID_TIPO_HABITACION,
            ID_HOTEL,
            NOMBRE_TIPO,
            CAPACIDAD,
            PRECIO_BASE,
            ESTADO_TIPO_HABITACION
        FROM COR_TIPOS_HABITACION_TB
        WHERE ID_TIPO_HABITACION = ?
          AND ID_HOTEL = ?
        LIMIT 1
    ");

    if (!$ConsultaTipo) {
        throw new Exception("No fue posible validar el tipo de habitación.");
    }

    $ConsultaTipo->bind_param("ii", $IdTipoHabitacion, $IdHotel);
    $ConsultaTipo->execute();

    $ResultadoTipo = $ConsultaTipo->get_result();
    $TipoHabitacion = $ResultadoTipo->fetch_assoc();

    $ConsultaTipo->close();

    if (!$TipoHabitacion || ($TipoHabitacion["ESTADO_TIPO_HABITACION"] ?? "") !== "ACTIVO") {
        $Conexion->rollback();
        $Conexion->close();
        ResponderJson(false, "El tipo de habitación seleccionado no está disponible para ese hotel.", [], 404);
    }

    if ($CantidadHuespedes > (int) $TipoHabitacion["CAPACIDAD"]) {
        $Conexion->rollback();
        $Conexion->close();
        ResponderJson(false, "La cantidad de huéspedes excede la capacidad del tipo de habitación.", [], 422);
    }

    $ConsultaHabitacionDisponible = $Conexion->prepare("
        SELECT
            HB.ID_HABITACION,
            HB.NUMERO_HABITACION
        FROM COR_HABITACIONES_TB HB
        WHERE HB.ID_HOTEL = ?
          AND HB.ID_TIPO_HABITACION = ?
          AND HB.ESTADO_HABITACION = 'DISPONIBLE'
          AND NOT EXISTS (
              SELECT 1
              FROM COR_RESERVA_HABITACION_TB RH
              INNER JOIN COR_RESERVAS_TB R
                  ON R.ID_RESERVA = RH.ID_RESERVA
              WHERE RH.ID_HABITACION = HB.ID_HABITACION
                AND R.ESTADO_RESERVA IN ('PENDIENTE', 'CONFIRMADA')
                AND NOT (
                    R.FECHA_CHECK_OUT <= ?
                    OR R.FECHA_CHECK_IN >= ?
                )
          )
        ORDER BY HB.NUMERO_HABITACION ASC
        LIMIT 1
    ");

    if (!$ConsultaHabitacionDisponible) {
        throw new Exception("No fue posible validar la disponibilidad.");
    }

    $ConsultaHabitacionDisponible->bind_param(
        "iiss",
        $IdHotel,
        $IdTipoHabitacion,
        $FechaEntrada,
        $FechaSalida
    );

    $ConsultaHabitacionDisponible->execute();

    $ResultadoHabitacionDisponible = $ConsultaHabitacionDisponible->get_result();
    $HabitacionDisponible = $ResultadoHabitacionDisponible->fetch_assoc();

    $ConsultaHabitacionDisponible->close();

    if (!$HabitacionDisponible) {
        $Conexion->rollback();
        $Conexion->close();
        ResponderJson(false, "No hay habitaciones disponibles para esas fechas.", [], 409);
    }

    $PrecioNoche = (float) $TipoHabitacion["PRECIO_BASE"];
    $Subtotal = $PrecioNoche * $CantidadNoches;
    $TotalReserva = $Subtotal;
    $EstadoReserva = "PENDIENTE";

    $InsercionReserva = $Conexion->prepare("
        INSERT INTO COR_RESERVAS_TB
        (
            ID_USUARIO,
            ID_HOTEL,
            FECHA_CHECK_IN,
            FECHA_CHECK_OUT,
            CANTIDAD_HUESPEDES,
            ESTADO_RESERVA,
            TOTAL_RESERVA
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");

    if (!$InsercionReserva) {
        throw new Exception("No fue posible crear la reserva.");
    }

    $InsercionReserva->bind_param(
        "iissisd",
        $IdUsuario,
        $IdHotel,
        $FechaEntrada,
        $FechaSalida,
        $CantidadHuespedes,
        $EstadoReserva,
        $TotalReserva
    );

    if (!$InsercionReserva->execute()) {
        throw new Exception("No fue posible crear la reserva.");
    }

    $IdReserva = $InsercionReserva->insert_id;
    $InsercionReserva->close();

    $IdHabitacion = (int) $HabitacionDisponible["ID_HABITACION"];

    $InsercionDetalle = $Conexion->prepare("
        INSERT INTO COR_RESERVA_HABITACION_TB
        (
            ID_RESERVA,
            ID_HABITACION,
            PRECIO_NOCHE,
            CANTIDAD_NOCHES,
            SUBTOTAL
        )
        VALUES (?, ?, ?, ?, ?)
    ");

    if (!$InsercionDetalle) {
        throw new Exception("No fue posible guardar el detalle de la reserva.");
    }

    $InsercionDetalle->bind_param(
        "iidid",
        $IdReserva,
        $IdHabitacion,
        $PrecioNoche,
        $CantidadNoches,
        $Subtotal
    );

    if (!$InsercionDetalle->execute()) {
        throw new Exception("No fue posible guardar el detalle de la reserva.");
    }

    $InsercionDetalle->close();

    $Conexion->commit();
    $Conexion->close();

    ResponderJson(true, "Reserva creada correctamente.", [
        "IdReserva" => $IdReserva,
        "IdHabitacion" => $IdHabitacion,
        "NumeroHabitacion" => $HabitacionDisponible["NUMERO_HABITACION"] ?? "",
        "CantidadNoches" => $CantidadNoches,
        "PrecioNoche" => $PrecioNoche,
        "TotalReserva" => $TotalReserva,
        "NotasAdicionales" => $NotasAdicionales
    ]);
} catch (Throwable $Error) {
    if (isset($Conexion) && $Conexion instanceof mysqli) {
        try {
            $Conexion->rollback();
        } catch (Throwable $ErrorRollback) {
        }

        $Conexion->close();
    }

    ResponderJson(false, $Error->getMessage(), [], 500);
}