<?php

require_once("../Base/Sesion.php");
require_once("../Base/Db.php");

Sesion::Iniciar();

header('Content-Type: application/json');

$Usuario = Sesion::ObtenerUsuario();
$IdUsuario = $Usuario["ID_USUARIO"] ?? null;

error_reporting(E_ALL);
ini_set('display_errors', 1);

try {

    $Db = new Db();
    $Conexion = $Db->Conectar();

    // POST (Insertar / Actualizar)
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {

        if (!$IdUsuario) {
            echo json_encode([
                "success" => false,
                "message" => "Debe iniciar sesión"
            ]);
            exit;
        }

        $Datos = json_decode(file_get_contents("php://input"), true);

        $IdHotel = $Datos['ID_HOTEL'] ?? null;
        $Calificacion = $Datos['CALIFICACION'] ?? null;
        $Comentario = $Datos['COMENTARIO'] ?? null;

        if (!$IdHotel || !$Calificacion || !$Comentario) {
            echo json_encode([
                "success" => false,
                "message" => "Datos incompletos"
            ]);
            exit;
        }

        $Calificacion = floatval($Calificacion);

        //Verificar si ya comentó ese hotel
        $Check = $Conexion->prepare("
            SELECT ID_COMENTARIO 
            FROM COR_COMENTARIOS_TB 
            WHERE ID_USUARIO = ? AND ID_HOTEL = ?
        ");

        $Check->bind_param("ii", $IdUsuario, $IdHotel);
        $Check->execute();
        $Check->store_result();

        // UPDATE si ya existe
        if ($Check->num_rows > 0) {

            $Update = $Conexion->prepare("
                UPDATE COR_COMENTARIOS_TB
                SET CALIFICACION = ?, COMENTARIO = ?, ESTADO_COMENTARIO = 'PENDIENTE'
                WHERE ID_USUARIO = ? AND ID_HOTEL = ?
            ");

            $Update->bind_param("dsii", $Calificacion, $Comentario, $IdUsuario, $IdHotel);

            if (!$Update->execute()) {
                throw new Exception($Update->error);
            }

            echo json_encode([
                "success" => true,
                "message" => "Comentario actualizado correctamente"
            ]);
            exit;
        }

        // INSERT
        $Insert = $Conexion->prepare("
            INSERT INTO COR_COMENTARIOS_TB 
            (ID_USUARIO, ID_HOTEL, CALIFICACION, COMENTARIO, ESTADO_COMENTARIO)
            VALUES (?, ?, ?, ?, 'PENDIENTE')
        ");

        $Insert->bind_param("iids", $IdUsuario, $IdHotel, $Calificacion, $Comentario);

        if (!$Insert->execute()) {
            throw new Exception($Insert->error);
        }

        echo json_encode([
            "success" => true,
            "message" => "Comentario enviado y pendiente de aprobación"
        ]);

        exit;
    }

    // GET (Cargar comentarios)
    $Query = "
        SELECT 
            c.ID_COMENTARIO,
            c.CALIFICACION,
            c.COMENTARIO,
            c.FECHA_COMENTARIO,
            c.RESPUESTA_ADMIN,
            u.NOMBRE,
            u.APELLIDO,
            h.NOMBRE_HOTEL
        FROM COR_COMENTARIOS_TB c
        JOIN COR_USUARIOS_TB u ON c.ID_USUARIO = u.ID_USUARIO
        JOIN COR_HOTELES_TB h ON c.ID_HOTEL = h.ID_HOTEL
        WHERE c.ESTADO_COMENTARIO = 'APROBADO'
        ORDER BY c.FECHA_COMENTARIO DESC
    ";

    $Resultado = $Conexion->query($Query);

    $Comentarios = [];

    while ($Fila = $Resultado->fetch_assoc()) {
        $Comentarios[] = $Fila;
    }

    echo json_encode([
        "success" => true,
        "data" => $Comentarios
    ]);

} catch (Exception $e) {

    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}