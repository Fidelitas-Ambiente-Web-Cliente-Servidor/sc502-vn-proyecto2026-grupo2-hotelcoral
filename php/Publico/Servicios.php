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
    $Db = new Db();
    $Conexion = $Db->Conectar();

    $ConsultaHoteles = $Conexion->prepare("
        SELECT
            ID_HOTEL,
            NOMBRE_HOTEL
        FROM COR_HOTELES_TB
        WHERE ESTADO_HOTEL = 'ACTIVO'
        ORDER BY NOMBRE_HOTEL ASC
    ");

    if (!$ConsultaHoteles) {
        throw new Exception("No fue posible preparar la consulta de hoteles.");
    }

    $ConsultaHoteles->execute();
    $ResultadoHoteles = $ConsultaHoteles->get_result();
    $Hoteles = [];

    while ($FilaHotel = $ResultadoHoteles->fetch_assoc()) {
        $Hoteles[] = $FilaHotel;
    }

    $ConsultaHoteles->close();

    $IdHotel = isset($_GET["IdHotel"]) ? (int) $_GET["IdHotel"] : 0;

    $SqlServicios = "
        SELECT
            S.ID_SERVICIO,
            S.ID_HOTEL,
            H.NOMBRE_HOTEL,
            S.NOMBRE_SERVICIO,
            S.DESCRIPCION,
            S.PRECIO,
            S.ESTADO_SERVICIO
        FROM COR_SERVICIOS_TB S
        INNER JOIN COR_HOTELES_TB H
            ON H.ID_HOTEL = S.ID_HOTEL
        WHERE S.ESTADO_SERVICIO = 'ACTIVO'
    ";

    if ($IdHotel > 0) {
        $SqlServicios .= " AND S.ID_HOTEL = ? ";
    }

    $SqlServicios .= " ORDER BY H.NOMBRE_HOTEL ASC, S.NOMBRE_SERVICIO ASC ";

    $ConsultaServicios = $Conexion->prepare($SqlServicios);

    if (!$ConsultaServicios) {
        throw new Exception("No fue posible preparar la consulta de servicios.");
    }

    if ($IdHotel > 0) {
        $ConsultaServicios->bind_param("i", $IdHotel);
    }

    $ConsultaServicios->execute();
    $ResultadoServicios = $ConsultaServicios->get_result();
    $Servicios = [];

    while ($FilaServicio = $ResultadoServicios->fetch_assoc()) {
        $Servicios[] = $FilaServicio;
    }

    $ConsultaServicios->close();
    $Conexion->close();

    ResponderJson(
        true,
        "Servicios cargados correctamente.",
        [
            "Hoteles" => $Hoteles,
            "Servicios" => $Servicios
        ]
    );
} catch (Throwable $Error) {
    ResponderJson(false, $Error->getMessage(), [], 500);
}