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

function ValidarEstadoAmenidad(string $Estado): bool
{
    return in_array($Estado, ["ACTIVO", "INACTIVO"], true);
}

try {
    ValidarSesionAdmin();

    $Metodo = $_SERVER["REQUEST_METHOD"] ?? "GET";
    $Db = new Db();
    $Conexion = $Db->Conectar();

    if ($Metodo === "GET") {
        $IdAmenidad = isset($_GET["id"]) ? (int) $_GET["id"] : 0;

        if ($IdAmenidad > 0) {
            $Consulta = $Conexion->prepare("
                SELECT
                    ID_AMENIDAD,
                    NOMBRE_AMENIDAD,
                    DESCRIPCION,
                    ESTADO_AMENIDAD
                FROM COR_AMENIDADES_TB
                WHERE ID_AMENIDAD = ?
                LIMIT 1
            ");

            if (!$Consulta) {
                throw new Exception("No fue posible cargar la amenidad.");
            }

            $Consulta->bind_param("i", $IdAmenidad);
            $Consulta->execute();

            $Resultado = $Consulta->get_result();
            $Amenidad = $Resultado->fetch_assoc();

            $Consulta->close();
            $Conexion->close();

            if (!$Amenidad) {
                ResponderJson(false, "Amenidad no encontrada.", [], 404);
            }

            ResponderJson(true, "Amenidad cargada correctamente.", [
                "Amenidad" => $Amenidad
            ]);
        }

        $Consulta = $Conexion->prepare("
            SELECT
                A.ID_AMENIDAD,
                A.NOMBRE_AMENIDAD,
                A.DESCRIPCION,
                A.ESTADO_AMENIDAD,
                COUNT(HA.ID_HABITACION_AMENIDAD) AS TOTAL_ASIGNACIONES
            FROM COR_AMENIDADES_TB A
            LEFT JOIN COR_HABITACION_AMENIDAD_TB HA
                ON HA.ID_AMENIDAD = A.ID_AMENIDAD
            GROUP BY
                A.ID_AMENIDAD,
                A.NOMBRE_AMENIDAD,
                A.DESCRIPCION,
                A.ESTADO_AMENIDAD
            ORDER BY A.NOMBRE_AMENIDAD ASC
        ");

        if (!$Consulta) {
            throw new Exception("No fue posible cargar las amenidades.");
        }

        $Consulta->execute();
        $Resultado = $Consulta->get_result();

        $Amenidades = [];

        while ($Fila = $Resultado->fetch_assoc()) {
            $Amenidades[] = $Fila;
        }

        $Consulta->close();
        $Conexion->close();

        ResponderJson(true, "Amenidades cargadas correctamente.", [
            "Amenidades" => $Amenidades
        ]);
    }

    if ($Metodo === "POST") {
        $Datos = ObtenerDatosEntrada();

        $NombreAmenidad = NormalizarTexto($Datos["NombreAmenidad"] ?? "");
        $Descripcion = NormalizarTexto($Datos["Descripcion"] ?? "");
        $EstadoAmenidad = strtoupper(NormalizarTexto($Datos["EstadoAmenidad"] ?? "ACTIVO"));

        if ($NombreAmenidad === "") {
            ResponderJson(false, "Debes ingresar el nombre de la amenidad.", [], 422);
        }

        if (!ValidarEstadoAmenidad($EstadoAmenidad)) {
            ResponderJson(false, "El estado indicado no es válido.", [], 422);
        }

        $ConsultaDuplicado = $Conexion->prepare("
            SELECT ID_AMENIDAD
            FROM COR_AMENIDADES_TB
            WHERE NOMBRE_AMENIDAD = ?
            LIMIT 1
        ");

        if (!$ConsultaDuplicado) {
            throw new Exception("No fue posible validar la amenidad.");
        }

        $ConsultaDuplicado->bind_param("s", $NombreAmenidad);
        $ConsultaDuplicado->execute();

        $ResultadoDuplicado = $ConsultaDuplicado->get_result();

        if ($ResultadoDuplicado->num_rows > 0) {
            $ConsultaDuplicado->close();
            $Conexion->close();
            ResponderJson(false, "Ya existe una amenidad con ese nombre.", [], 409);
        }

        $ConsultaDuplicado->close();

        $Insercion = $Conexion->prepare("
            INSERT INTO COR_AMENIDADES_TB
            (
                NOMBRE_AMENIDAD,
                DESCRIPCION,
                ESTADO_AMENIDAD
            )
            VALUES (?, ?, ?)
        ");

        if (!$Insercion) {
            throw new Exception("No fue posible crear la amenidad.");
        }

        $Insercion->bind_param(
            "sss",
            $NombreAmenidad,
            $Descripcion,
            $EstadoAmenidad
        );

        if (!$Insercion->execute()) {
            throw new Exception("No fue posible crear la amenidad.");
        }

        $IdAmenidadNueva = $Insercion->insert_id;

        $Insercion->close();
        $Conexion->close();

        ResponderJson(true, "Amenidad creada correctamente.", [
            "IdAmenidad" => $IdAmenidadNueva
        ]);
    }

    if ($Metodo === "PUT") {
        $Datos = ObtenerDatosEntrada();

        $IdAmenidad = (int) ($Datos["IdAmenidad"] ?? 0);
        $NombreAmenidad = NormalizarTexto($Datos["NombreAmenidad"] ?? "");
        $Descripcion = NormalizarTexto($Datos["Descripcion"] ?? "");
        $EstadoAmenidad = strtoupper(NormalizarTexto($Datos["EstadoAmenidad"] ?? "ACTIVO"));

        if ($IdAmenidad <= 0) {
            ResponderJson(false, "El ID de la amenidad es obligatorio.", [], 422);
        }

        if ($NombreAmenidad === "") {
            ResponderJson(false, "Debes ingresar el nombre de la amenidad.", [], 422);
        }

        if (!ValidarEstadoAmenidad($EstadoAmenidad)) {
            ResponderJson(false, "El estado indicado no es válido.", [], 422);
        }

        $ConsultaExistencia = $Conexion->prepare("
            SELECT ID_AMENIDAD
            FROM COR_AMENIDADES_TB
            WHERE ID_AMENIDAD = ?
            LIMIT 1
        ");

        if (!$ConsultaExistencia) {
            throw new Exception("No fue posible validar la existencia de la amenidad.");
        }

        $ConsultaExistencia->bind_param("i", $IdAmenidad);
        $ConsultaExistencia->execute();

        $ResultadoExistencia = $ConsultaExistencia->get_result();

        if ($ResultadoExistencia->num_rows === 0) {
            $ConsultaExistencia->close();
            $Conexion->close();
            ResponderJson(false, "La amenidad no existe.", [], 404);
        }

        $ConsultaExistencia->close();

        $ConsultaDuplicado = $Conexion->prepare("
            SELECT ID_AMENIDAD
            FROM COR_AMENIDADES_TB
            WHERE NOMBRE_AMENIDAD = ? AND ID_AMENIDAD <> ?
            LIMIT 1
        ");

        if (!$ConsultaDuplicado) {
            throw new Exception("No fue posible validar el nombre de la amenidad.");
        }

        $ConsultaDuplicado->bind_param("si", $NombreAmenidad, $IdAmenidad);
        $ConsultaDuplicado->execute();

        $ResultadoDuplicado = $ConsultaDuplicado->get_result();

        if ($ResultadoDuplicado->num_rows > 0) {
            $ConsultaDuplicado->close();
            $Conexion->close();
            ResponderJson(false, "Ya existe otra amenidad con ese nombre.", [], 409);
        }

        $ConsultaDuplicado->close();

        $Actualizacion = $Conexion->prepare("
            UPDATE COR_AMENIDADES_TB
            SET
                NOMBRE_AMENIDAD = ?,
                DESCRIPCION = ?,
                ESTADO_AMENIDAD = ?
            WHERE ID_AMENIDAD = ?
        ");

        if (!$Actualizacion) {
            throw new Exception("No fue posible actualizar la amenidad.");
        }

        $Actualizacion->bind_param(
            "sssi",
            $NombreAmenidad,
            $Descripcion,
            $EstadoAmenidad,
            $IdAmenidad
        );

        if (!$Actualizacion->execute()) {
            throw new Exception("No fue posible actualizar la amenidad.");
        }

        $Actualizacion->close();
        $Conexion->close();

        ResponderJson(true, "Amenidad actualizada correctamente.");
    }

    $Conexion->close();
    ResponderJson(false, "Método no permitido.", [], 405);
} catch (Throwable $Error) {
    ResponderJson(false, $Error->getMessage(), [], 500);
}