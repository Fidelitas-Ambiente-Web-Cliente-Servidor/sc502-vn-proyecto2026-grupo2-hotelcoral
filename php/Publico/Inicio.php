<?php

header("Content-Type: application/json; charset=utf-8");

require_once __DIR__ . "/../Base/Db.php";

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

try {
    $Db = new Db();
    $Conexion = $Db->Conectar();

    /*
     * HABITACIONES DESTACADAS
     * Solo tipos activos, no habitaciones físicas.
     */
    $ConsultaHabitaciones = $Conexion->prepare("
        SELECT
            TH.ID_TIPO_HABITACION,
            TH.ID_HOTEL,
            H.NOMBRE_HOTEL,
            TH.NOMBRE_TIPO,
            TH.DESCRIPCION,
            TH.CAPACIDAD,
            TH.CANTIDAD_CAMAS,
            TH.PRECIO_BASE,
            IMG.URL_IMAGEN
        FROM COR_TIPOS_HABITACION_TB TH
        INNER JOIN COR_HOTELES_TB H
            ON H.ID_HOTEL = TH.ID_HOTEL
        LEFT JOIN (
            SELECT I1.ID_TIPO_HABITACION, I1.URL_IMAGEN
            FROM COR_IMAGENES_TIPO_HABITACION_TB I1
            INNER JOIN (
                SELECT ID_TIPO_HABITACION, MIN(ORDEN_IMAGEN) AS ORDEN_PRINCIPAL
                FROM COR_IMAGENES_TIPO_HABITACION_TB
                GROUP BY ID_TIPO_HABITACION
            ) I2
                ON I2.ID_TIPO_HABITACION = I1.ID_TIPO_HABITACION
                AND I2.ORDEN_PRINCIPAL = I1.ORDEN_IMAGEN
        ) IMG
            ON IMG.ID_TIPO_HABITACION = TH.ID_TIPO_HABITACION
        WHERE TH.ESTADO_TIPO_HABITACION = 'ACTIVO'
        ORDER BY TH.ID_TIPO_HABITACION ASC
        LIMIT 5
    ");

    if (!$ConsultaHabitaciones) {
        throw new Exception("No fue posible preparar la consulta de habitaciones destacadas.");
    }

    $ConsultaHabitaciones->execute();
    $ResultadoHabitaciones = $ConsultaHabitaciones->get_result();

    $Habitaciones = [];

    while ($Fila = $ResultadoHabitaciones->fetch_assoc()) {
        $Habitaciones[] = $Fila;
    }

    $ConsultaHabitaciones->close();

    /*
     * SERVICIOS DESTACADOS
     * Solo servicios activos.
     */
    $ConsultaServicios = $Conexion->prepare("
        SELECT
            S.ID_SERVICIO,
            S.ID_HOTEL,
            H.NOMBRE_HOTEL,
            S.NOMBRE_SERVICIO,
            S.DESCRIPCION,
            S.PRECIO
        FROM COR_SERVICIOS_TB S
        INNER JOIN COR_HOTELES_TB H
            ON H.ID_HOTEL = S.ID_HOTEL
        WHERE S.ESTADO_SERVICIO = 'ACTIVO'
        ORDER BY S.ID_SERVICIO ASC
        LIMIT 5
    ");

    if (!$ConsultaServicios) {
        throw new Exception("No fue posible preparar la consulta de servicios destacados.");
    }

    $ConsultaServicios->execute();
    $ResultadoServicios = $ConsultaServicios->get_result();

    $Servicios = [];

    while ($Fila = $ResultadoServicios->fetch_assoc()) {
        $Servicios[] = $Fila;
    }

    $ConsultaServicios->close();

    /*
     * COMENTARIOS DESTACADOS
     * Solo aprobados.
     */
    $ConsultaComentarios = $Conexion->prepare("
        SELECT
            C.ID_COMENTARIO,
            CONCAT(U.NOMBRE, ' ', U.APELLIDO) AS AUTOR,
            H.NOMBRE_HOTEL AS HOTEL,
            C.CALIFICACION,
            C.COMENTARIO,
            C.RESPUESTA_ADMIN
        FROM COR_COMENTARIOS_TB C
        INNER JOIN COR_RESERVAS_TB R
            ON R.ID_RESERVA = C.ID_RESERVA
        INNER JOIN COR_USUARIOS_TB U
            ON U.ID_USUARIO = R.ID_USUARIO
        INNER JOIN COR_HOTELES_TB H
            ON H.ID_HOTEL = R.ID_HOTEL
        WHERE C.ESTADO_COMENTARIO = 'APROBADO'
        ORDER BY C.FECHA_COMENTARIO DESC, C.ID_COMENTARIO DESC
        LIMIT 5
    ");

    if (!$ConsultaComentarios) {
        throw new Exception("No fue posible preparar la consulta de comentarios destacados.");
    }

    $ConsultaComentarios->execute();
    $ResultadoComentarios = $ConsultaComentarios->get_result();

    $Comentarios = [];

    while ($Fila = $ResultadoComentarios->fetch_assoc()) {
        $Comentarios[] = $Fila;
    }

    $ConsultaComentarios->close();
    $Conexion->close();

    ResponderJson(true, "Inicio cargado correctamente.", [
        "Habitaciones" => $Habitaciones,
        "Servicios" => $Servicios,
        "Comentarios" => $Comentarios
    ]);
} catch (Throwable $Error) {
    ResponderJson(false, $Error->getMessage(), [], 500);
}
