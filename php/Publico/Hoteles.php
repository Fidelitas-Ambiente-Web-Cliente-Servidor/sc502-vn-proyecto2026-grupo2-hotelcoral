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

    $Consulta = $Conexion->prepare("
        SELECT
            ID_HOTEL,
            NOMBRE_HOTEL,
            CIUDAD,
            PROVINCIA,
            ESTADO_HOTEL
        FROM COR_HOTELES_TB
        WHERE ESTADO_HOTEL = 'ACTIVO'
        ORDER BY NOMBRE_HOTEL ASC
    ");

    if (!$Consulta) {
        throw new Exception("No fue posible preparar la consulta de hoteles.");
    }

    $Consulta->execute();
    $Resultado = $Consulta->get_result();

    $Hoteles = [];

    while ($Fila = $Resultado->fetch_assoc()) {
        $Hoteles[] = $Fila;
    }

    $Consulta->close();
    $Conexion->close();

    ResponderJson(true, "Hoteles cargados correctamente.", [
        "Hoteles" => $Hoteles
    ]);
} catch (Throwable $Error) {
    ResponderJson(false, $Error->getMessage(), [], 500);
}