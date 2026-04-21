<?php

header('Content-Type: application/json');
require_once(__DIR__ . "/../Base/Db.php");

try {

    $Db = new Db();
    $Conexion = $Db->Conectar();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {

        $Query = "
        SELECT 
            c.ID_COMENTARIO,
            c.CALIFICACION,
            c.COMENTARIO,
            c.ESTADO_COMENTARIO,
            c.RESPUESTA_ADMIN,
            u.NOMBRE,
            u.APELLIDO,
            h.NOMBRE_HOTEL
        FROM COR_COMENTARIOS_TB c
        JOIN COR_USUARIOS_TB u ON c.ID_USUARIO = u.ID_USUARIO
        JOIN COR_HOTELES_TB h ON c.ID_HOTEL = h.ID_HOTEL

        ORDER BY  
        FIELD(c.ESTADO_COMENTARIO, 'PENDIENTE', 'APROBADO', 'SPAM'),
        c.FECHA_COMENTARIO DESC
        ";

        $Resultado = $Conexion->query($Query);

        $Lista = [];

        while ($Fila = $Resultado->fetch_assoc()) {
            $Fila['USUARIO'] = $Fila['NOMBRE'] . " " . $Fila['APELLIDO'];
            $Fila['HOTEL'] = $Fila['NOMBRE_HOTEL'];
            $Lista[] = $Fila;
        }

        echo json_encode([
            "success" => true,
            "data" => $Lista
        ]);

        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {

        $Datos = json_decode(file_get_contents("php://input"), true);

        $Id = $Datos['ID_COMENTARIO'];
        $Accion = $Datos['ACCION'];

        if ($Accion === "APROBAR") {
            $Estado = "APROBADO";
        } elseif ($Accion === "SPAM") {
            $Estado = "SPAM";
        }

        $Query = $Conexion->prepare("
            UPDATE COR_COMENTARIOS_TB
            SET ESTADO_COMENTARIO = ?
            WHERE ID_COMENTARIO = ?
        ");

        $Query->bind_param("si", $Estado, $Id);
        $Query->execute();

        echo json_encode([
            "success" => true,
            "message" => "Comentario actualizado"
        ]);

        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {

        $Datos = json_decode(file_get_contents("php://input"), true);
        $Id = $Datos['ID_COMENTARIO'];

        $Query = $Conexion->prepare("
            DELETE FROM COR_COMENTARIOS_TB WHERE ID_COMENTARIO = ?
        ");

        $Query->bind_param("i", $Id);
        $Query->execute();

        echo json_encode([
            "success" => true,
            "message" => "Comentario eliminado"
        ]);

        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {

        $Datos = json_decode(file_get_contents("php://input"), true);

        $Id = $Datos['ID_COMENTARIO'];
        $Respuesta = $Datos['RESPUESTA'];

        if (!$Respuesta) {
            echo json_encode([
                "success" => false,
                "message" => "Respuesta vacía"
            ]);
            exit;
        }

        $Query = $Conexion->prepare("
            UPDATE COR_COMENTARIOS_TB
            SET 
                RESPUESTA_ADMIN = ?,
                FECHA_RESPUESTA = NOW()
            WHERE ID_COMENTARIO = ?
        ");

        $Query->bind_param("si", $Respuesta, $Id);
        $Query->execute();

        echo json_encode([
            "success" => true,
            "message" => "Respuesta enviada"
        ]);

        exit;
    }


} catch (Exception $e) {

    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}