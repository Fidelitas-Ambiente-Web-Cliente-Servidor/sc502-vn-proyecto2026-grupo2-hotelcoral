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

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    ResponderJson(false, "Método no permitido.", [], 405);
}

try {
    $IdTipoHabitacion = isset($_GET["id"]) ? (int) $_GET["id"] : 0;
    $IdHotel = isset($_GET["IdHotel"]) ? (int) $_GET["IdHotel"] : 0;

    $Db = new Db();
    $Conexion = $Db->Conectar();

    if ($IdTipoHabitacion > 0) {
        $Consulta = $Conexion->prepare("
            SELECT
                TH.ID_TIPO_HABITACION,
                TH.ID_HOTEL,
                H.NOMBRE_HOTEL,
                H.CIUDAD,
                H.PROVINCIA,
                TH.NOMBRE_TIPO,
                TH.DESCRIPCION,
                TH.CAPACIDAD,
                TH.CANTIDAD_CAMAS,
                TH.PRECIO_BASE,
                TH.ESTADO_TIPO_HABITACION,
                I.URL_IMAGEN,
                I.DESCRIPCION AS DESCRIPCION_IMAGEN
            FROM COR_TIPOS_HABITACION_TB TH
            INNER JOIN COR_HOTELES_TB H
                ON H.ID_HOTEL = TH.ID_HOTEL
            LEFT JOIN COR_IMAGENES_TIPO_HABITACION_TB I
                ON I.ID_TIPO_HABITACION = TH.ID_TIPO_HABITACION
                AND I.ORDEN_IMAGEN = 1
            WHERE TH.ID_TIPO_HABITACION = ?
              AND TH.ESTADO_TIPO_HABITACION = 'ACTIVO'
              AND H.ESTADO_HOTEL = 'ACTIVO'
            LIMIT 1
        ");

        if (!$Consulta) {
            throw new Exception("No fue posible preparar la consulta del tipo de habitación.");
        }

        $Consulta->bind_param("i", $IdTipoHabitacion);
        $Consulta->execute();

        $Resultado = $Consulta->get_result();
        $TipoHabitacion = $Resultado->fetch_assoc();

        $Consulta->close();
        $Conexion->close();

        if (!$TipoHabitacion) {
            ResponderJson(false, "Tipo de habitación no encontrado.", [], 404);
        }

        ResponderJson(true, "Tipo de habitación cargado correctamente.", [
            "TipoHabitacion" => $TipoHabitacion
        ]);
    }

    $Sql = "
        SELECT
            TH.ID_TIPO_HABITACION,
            TH.ID_HOTEL,
            H.NOMBRE_HOTEL,
            H.CIUDAD,
            H.PROVINCIA,
            TH.NOMBRE_TIPO,
            TH.DESCRIPCION,
            TH.CAPACIDAD,
            TH.CANTIDAD_CAMAS,
            TH.PRECIO_BASE,
            TH.ESTADO_TIPO_HABITACION,
            I.URL_IMAGEN,
            I.DESCRIPCION AS DESCRIPCION_IMAGEN
        FROM COR_TIPOS_HABITACION_TB TH
        INNER JOIN COR_HOTELES_TB H
            ON H.ID_HOTEL = TH.ID_HOTEL
        LEFT JOIN COR_IMAGENES_TIPO_HABITACION_TB I
            ON I.ID_TIPO_HABITACION = TH.ID_TIPO_HABITACION
            AND I.ORDEN_IMAGEN = 1
        WHERE TH.ESTADO_TIPO_HABITACION = 'ACTIVO'
          AND H.ESTADO_HOTEL = 'ACTIVO'
    ";

    if ($IdHotel > 0) {
        $Sql .= " AND TH.ID_HOTEL = ? ";
    }

    $Sql .= " ORDER BY H.NOMBRE_HOTEL ASC, TH.NOMBRE_TIPO ASC ";

    $Consulta = $Conexion->prepare($Sql);

    if (!$Consulta) {
        throw new Exception("No fue posible preparar la lista de tipos de habitación.");
    }

    if ($IdHotel > 0) {
        $Consulta->bind_param("i", $IdHotel);
    }

    $Consulta->execute();
    $Resultado = $Consulta->get_result();

    $TiposHabitacion = [];

    while ($Fila = $Resultado->fetch_assoc()) {
        $TiposHabitacion[] = $Fila;
    }

    $Consulta->close();
    $Conexion->close();

    ResponderJson(true, "Tipos de habitación cargados correctamente.", [
        "TiposHabitacion" => $TiposHabitacion
    ]);
} catch (Throwable $Error) {
    ResponderJson(false, $Error->getMessage(), [], 500);
}