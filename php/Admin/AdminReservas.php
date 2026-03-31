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

function ValidarSesionAdmin(): array
{
    Sesion::Iniciar();

    if (!Sesion::HaySesion()) {
        ResponderJson(false, "Acceso no autorizado.", [], 401);
    }

    $Usuario = Sesion::ObtenerUsuario();

    if (!$Usuario || ($Usuario["ROL"] ?? "") !== "ADMIN") {
        ResponderJson(false, "No tienes permisos para usar este módulo.", [], 403);
    }

    return $Usuario;
}

function NormalizarTexto(?string $Valor): string
{
    return trim((string) $Valor);
}

function ValidarEstadoReserva(string $Estado): bool
{
    return in_array($Estado, ["PENDIENTE", "CONFIRMADA", "CANCELADA", "FINALIZADA"], true);
}

try {
    ValidarSesionAdmin();

    $Metodo = $_SERVER["REQUEST_METHOD"] ?? "GET";
    $Db = new Db();
    $Conexion = $Db->Conectar();

    if ($Metodo === "GET") {
        $IdReserva = isset($_GET["id"]) ? (int) $_GET["id"] : 0;

        if ($IdReserva > 0) {
            $ConsultaReserva = $Conexion->prepare("
                SELECT
                    R.ID_RESERVA,
                    R.ID_USUARIO,
                    U.NOMBRE,
                    U.APELLIDO,
                    U.CORREO,
                    U.TELEFONO,
                    R.ID_HOTEL,
                    H.NOMBRE_HOTEL,
                    R.FECHA_RESERVA,
                    R.FECHA_CHECK_IN,
                    R.FECHA_CHECK_OUT,
                    R.CANTIDAD_HUESPEDES,
                    R.ESTADO_RESERVA,
                    R.TOTAL_RESERVA
                FROM COR_RESERVAS_TB R
                INNER JOIN COR_USUARIOS_TB U
                    ON U.ID_USUARIO = R.ID_USUARIO
                INNER JOIN COR_HOTELES_TB H
                    ON H.ID_HOTEL = R.ID_HOTEL
                WHERE R.ID_RESERVA = ?
                LIMIT 1
            ");

            if (!$ConsultaReserva) {
                throw new Exception("No fue posible preparar la consulta de la reserva.");
            }

            $ConsultaReserva->bind_param("i", $IdReserva);
            $ConsultaReserva->execute();

            $ResultadoReserva = $ConsultaReserva->get_result();
            $Reserva = $ResultadoReserva->fetch_assoc();

            $ConsultaReserva->close();

            if (!$Reserva) {
                $Conexion->close();
                ResponderJson(false, "Reserva no encontrada.", [], 404);
            }

            $ConsultaHabitaciones = $Conexion->prepare("
                SELECT
                    RH.ID_RESERVA_HABITACION,
                    RH.ID_HABITACION,
                    HB.NUMERO_HABITACION,
                    TH.NOMBRE_TIPO,
                    RH.PRECIO_NOCHE,
                    RH.CANTIDAD_NOCHES,
                    RH.SUBTOTAL
                FROM COR_RESERVA_HABITACION_TB RH
                INNER JOIN COR_HABITACIONES_TB HB
                    ON HB.ID_HABITACION = RH.ID_HABITACION
                INNER JOIN COR_TIPOS_HABITACION_TB TH
                    ON TH.ID_TIPO_HABITACION = HB.ID_TIPO_HABITACION
                WHERE RH.ID_RESERVA = ?
                ORDER BY HB.NUMERO_HABITACION ASC
            ");

            if (!$ConsultaHabitaciones) {
                throw new Exception("No fue posible preparar el detalle de habitaciones.");
            }

            $ConsultaHabitaciones->bind_param("i", $IdReserva);
            $ConsultaHabitaciones->execute();

            $ResultadoHabitaciones = $ConsultaHabitaciones->get_result();
            $Habitaciones = [];

            while ($FilaHabitacion = $ResultadoHabitaciones->fetch_assoc()) {
                $Habitaciones[] = $FilaHabitacion;
            }

            $ConsultaHabitaciones->close();

            $ConsultaServicios = $Conexion->prepare("
                SELECT
                    RS.ID_RESERVA_SERVICIO,
                    RS.ID_SERVICIO,
                    S.NOMBRE_SERVICIO,
                    RS.FECHA_SERVICIO,
                    RS.CANTIDAD,
                    RS.PRECIO_UNITARIO,
                    RS.SUBTOTAL
                FROM COR_RESERVA_SERVICIO_TB RS
                INNER JOIN COR_SERVICIOS_TB S
                    ON S.ID_SERVICIO = RS.ID_SERVICIO
                WHERE RS.ID_RESERVA = ?
                ORDER BY RS.FECHA_SERVICIO ASC, S.NOMBRE_SERVICIO ASC
            ");

            if (!$ConsultaServicios) {
                throw new Exception("No fue posible preparar el detalle de servicios.");
            }

            $ConsultaServicios->bind_param("i", $IdReserva);
            $ConsultaServicios->execute();

            $ResultadoServicios = $ConsultaServicios->get_result();
            $Servicios = [];

            while ($FilaServicio = $ResultadoServicios->fetch_assoc()) {
                $Servicios[] = $FilaServicio;
            }

            $ConsultaServicios->close();
            $Conexion->close();

            ResponderJson(true, "Detalle de reserva cargado correctamente.", [
                "Reserva" => $Reserva,
                "Habitaciones" => $Habitaciones,
                "Servicios" => $Servicios
            ]);
        }

        $Consulta = $Conexion->prepare("
            SELECT
                R.ID_RESERVA,
                R.ID_USUARIO,
                CONCAT(U.NOMBRE, ' ', U.APELLIDO) AS NOMBRE_CLIENTE,
                U.CORREO,
                H.NOMBRE_HOTEL,
                R.FECHA_RESERVA,
                R.FECHA_CHECK_IN,
                R.FECHA_CHECK_OUT,
                R.CANTIDAD_HUESPEDES,
                R.ESTADO_RESERVA,
                R.TOTAL_RESERVA,
                GROUP_CONCAT(DISTINCT TH.NOMBRE_TIPO ORDER BY TH.NOMBRE_TIPO SEPARATOR ', ') AS TIPOS_HABITACION,
                GROUP_CONCAT(DISTINCT HB.NUMERO_HABITACION ORDER BY HB.NUMERO_HABITACION SEPARATOR ', ') AS NUMEROS_HABITACION,
                COUNT(DISTINCT RS.ID_RESERVA_SERVICIO) AS TOTAL_SERVICIOS
            FROM COR_RESERVAS_TB R
            INNER JOIN COR_USUARIOS_TB U
                ON U.ID_USUARIO = R.ID_USUARIO
            INNER JOIN COR_HOTELES_TB H
                ON H.ID_HOTEL = R.ID_HOTEL
            LEFT JOIN COR_RESERVA_HABITACION_TB RH
                ON RH.ID_RESERVA = R.ID_RESERVA
            LEFT JOIN COR_HABITACIONES_TB HB
                ON HB.ID_HABITACION = RH.ID_HABITACION
            LEFT JOIN COR_TIPOS_HABITACION_TB TH
                ON TH.ID_TIPO_HABITACION = HB.ID_TIPO_HABITACION
            LEFT JOIN COR_RESERVA_SERVICIO_TB RS
                ON RS.ID_RESERVA = R.ID_RESERVA
            GROUP BY
                R.ID_RESERVA,
                R.ID_USUARIO,
                U.NOMBRE,
                U.APELLIDO,
                U.CORREO,
                H.NOMBRE_HOTEL,
                R.FECHA_RESERVA,
                R.FECHA_CHECK_IN,
                R.FECHA_CHECK_OUT,
                R.CANTIDAD_HUESPEDES,
                R.ESTADO_RESERVA,
                R.TOTAL_RESERVA
            ORDER BY R.FECHA_RESERVA DESC, R.ID_RESERVA DESC
        ");

        if (!$Consulta) {
            throw new Exception("No fue posible preparar la lista de reservas.");
        }

        $Consulta->execute();
        $Resultado = $Consulta->get_result();

        $Reservas = [];

        while ($Fila = $Resultado->fetch_assoc()) {
            $Reservas[] = $Fila;
        }

        $Consulta->close();
        $Conexion->close();

        ResponderJson(true, "Reservas cargadas correctamente.", [
            "Reservas" => $Reservas
        ]);
    }

    if ($Metodo === "PUT") {
        $Datos = ObtenerDatosEntrada();

        $IdReserva = (int) ($Datos["IdReserva"] ?? 0);
        $EstadoReserva = strtoupper(NormalizarTexto($Datos["EstadoReserva"] ?? ""));

        if ($IdReserva <= 0) {
            ResponderJson(false, "El ID de la reserva es obligatorio.", [], 422);
        }

        if (!ValidarEstadoReserva($EstadoReserva)) {
            ResponderJson(false, "El estado de la reserva no es válido.", [], 422);
        }

        $ConsultaExistencia = $Conexion->prepare("
            SELECT ID_RESERVA
            FROM COR_RESERVAS_TB
            WHERE ID_RESERVA = ?
            LIMIT 1
        ");

        if (!$ConsultaExistencia) {
            throw new Exception("No fue posible validar la existencia de la reserva.");
        }

        $ConsultaExistencia->bind_param("i", $IdReserva);
        $ConsultaExistencia->execute();

        $ResultadoExistencia = $ConsultaExistencia->get_result();

        if ($ResultadoExistencia->num_rows === 0) {
            $ConsultaExistencia->close();
            $Conexion->close();
            ResponderJson(false, "La reserva no existe.", [], 404);
        }

        $ConsultaExistencia->close();

        $Actualizacion = $Conexion->prepare("
            UPDATE COR_RESERVAS_TB
            SET ESTADO_RESERVA = ?
            WHERE ID_RESERVA = ?
        ");

        if (!$Actualizacion) {
            throw new Exception("No fue posible actualizar la reserva.");
        }

        $Actualizacion->bind_param("si", $EstadoReserva, $IdReserva);

        if (!$Actualizacion->execute()) {
            throw new Exception("No fue posible actualizar la reserva.");
        }

        $Actualizacion->close();
        $Conexion->close();

        ResponderJson(true, "Estado de reserva actualizado correctamente.");
    }

    $Conexion->close();
    ResponderJson(false, "Método no permitido.", [], 405);
} catch (Throwable $Error) {
    if (isset($Conexion) && $Conexion instanceof mysqli) {
        $Conexion->close();
    }

    ResponderJson(false, $Error->getMessage(), [], 500);
}