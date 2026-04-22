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

function ValidarEstadoServicio(string $Estado): bool
{
    return in_array($Estado, ["ACTIVO", "INACTIVO"], true);
}

try {
    ValidarSesionAdmin();

    $Metodo = $_SERVER["REQUEST_METHOD"] ?? "GET";
    $Db = new Db();
    $Conexion = $Db->Conectar();

    if ($Metodo === "GET") {
        $IdServicio = isset($_GET["id"]) ? (int) $_GET["id"] : 0;

        if ($IdServicio > 0) {
            $ConsultaServicio = $Conexion->prepare("
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
                WHERE S.ID_SERVICIO = ?
                LIMIT 1
            ");

            if (!$ConsultaServicio) {
                throw new Exception("No fue posible preparar la consulta del servicio.");
            }

            $ConsultaServicio->bind_param("i", $IdServicio);
            $ConsultaServicio->execute();

            $ResultadoServicio = $ConsultaServicio->get_result();
            $Servicio = $ResultadoServicio->fetch_assoc();

            $ConsultaServicio->close();
            $Conexion->close();

            if (!$Servicio) {
                ResponderJson(false, "Servicio no encontrado.", [], 404);
            }

            ResponderJson(true, "Servicio cargado correctamente.", [
                "Servicio" => $Servicio
            ]);
        }

        $ConsultaServicios = $Conexion->prepare("
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
            ORDER BY H.NOMBRE_HOTEL ASC, S.NOMBRE_SERVICIO ASC
        ");

        if (!$ConsultaServicios) {
            throw new Exception("No fue posible preparar la lista de servicios.");
        }

        $ConsultaServicios->execute();
        $ResultadoServicios = $ConsultaServicios->get_result();
        $Servicios = [];

        while ($Fila = $ResultadoServicios->fetch_assoc()) {
            $Servicios[] = $Fila;
        }

        $ConsultaServicios->close();
        $Conexion->close();

        ResponderJson(true, "Servicios cargados correctamente.", [
            "Servicios" => $Servicios
        ]);
    }

    $Datos = ObtenerDatosEntrada();

    if ($Metodo === "POST") {
        $IdHotel = (int) ($Datos["IdHotel"] ?? 0);
        $NombreServicio = NormalizarTexto($Datos["NombreServicio"] ?? "");
        $Descripcion = NormalizarTexto($Datos["Descripcion"] ?? "");
        $Precio = (float) ($Datos["Precio"] ?? 0);
        $EstadoServicio = strtoupper(NormalizarTexto($Datos["EstadoServicio"] ?? "ACTIVO"));

        if ($IdHotel <= 0) {
            $Conexion->close();
            ResponderJson(false, "Debes seleccionar un hotel válido.", [], 422);
        }

        if ($NombreServicio === "") {
            $Conexion->close();
            ResponderJson(false, "El nombre del servicio es obligatorio.", [], 422);
        }

        if ($Precio < 0) {
            $Conexion->close();
            ResponderJson(false, "El precio del servicio no puede ser negativo.", [], 422);
        }

        if (!ValidarEstadoServicio($EstadoServicio)) {
            $Conexion->close();
            ResponderJson(false, "El estado del servicio no es válido.", [], 422);
        }

        $ConsultaHotel = $Conexion->prepare("
            SELECT ID_HOTEL
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

        if (!$Hotel) {
            $Conexion->close();
            ResponderJson(false, "El hotel seleccionado no existe.", [], 404);
        }

        $ConsultaExiste = $Conexion->prepare("
            SELECT ID_SERVICIO
            FROM COR_SERVICIOS_TB
            WHERE ID_HOTEL = ?
              AND NOMBRE_SERVICIO = ?
            LIMIT 1
        ");

        if (!$ConsultaExiste) {
            throw new Exception("No fue posible validar el nombre del servicio.");
        }

        $ConsultaExiste->bind_param("is", $IdHotel, $NombreServicio);
        $ConsultaExiste->execute();

        $ResultadoExiste = $ConsultaExiste->get_result();
        $Existe = $ResultadoExiste->fetch_assoc();
        $ConsultaExiste->close();

        if ($Existe) {
            $Conexion->close();
            ResponderJson(false, "Ya existe un servicio con ese nombre para el hotel seleccionado.", [], 409);
        }

        $ConsultaInsertar = $Conexion->prepare("
            INSERT INTO COR_SERVICIOS_TB
            (
                ID_HOTEL,
                NOMBRE_SERVICIO,
                DESCRIPCION,
                PRECIO,
                ESTADO_SERVICIO
            )
            VALUES (?, ?, ?, ?, ?)
        ");

        if (!$ConsultaInsertar) {
            throw new Exception("No fue posible preparar la creación del servicio.");
        }

        $ConsultaInsertar->bind_param(
            "issds",
            $IdHotel,
            $NombreServicio,
            $Descripcion,
            $Precio,
            $EstadoServicio
        );

        if (!$ConsultaInsertar->execute()) {
            throw new Exception("No fue posible crear el servicio.");
        }

        $ConsultaInsertar->close();
        $Conexion->close();

        ResponderJson(true, "Servicio creado correctamente.");
    }

    if ($Metodo === "PUT") {
        $IdServicio = (int) ($Datos["IdServicio"] ?? 0);
        $IdHotel = (int) ($Datos["IdHotel"] ?? 0);
        $NombreServicio = NormalizarTexto($Datos["NombreServicio"] ?? "");
        $Descripcion = NormalizarTexto($Datos["Descripcion"] ?? "");
        $Precio = (float) ($Datos["Precio"] ?? 0);
        $EstadoServicio = strtoupper(NormalizarTexto($Datos["EstadoServicio"] ?? "ACTIVO"));

        if ($IdServicio <= 0) {
            $Conexion->close();
            ResponderJson(false, "Debes indicar un servicio válido.", [], 422);
        }

        if ($IdHotel <= 0) {
            $Conexion->close();
            ResponderJson(false, "Debes seleccionar un hotel válido.", [], 422);
        }

        if ($NombreServicio === "") {
            $Conexion->close();
            ResponderJson(false, "El nombre del servicio es obligatorio.", [], 422);
        }

        if ($Precio < 0) {
            $Conexion->close();
            ResponderJson(false, "El precio del servicio no puede ser negativo.", [], 422);
        }

        if (!ValidarEstadoServicio($EstadoServicio)) {
            $Conexion->close();
            ResponderJson(false, "El estado del servicio no es válido.", [], 422);
        }

        $ConsultaServicio = $Conexion->prepare("
            SELECT ID_SERVICIO
            FROM COR_SERVICIOS_TB
            WHERE ID_SERVICIO = ?
            LIMIT 1
        ");

        if (!$ConsultaServicio) {
            throw new Exception("No fue posible validar el servicio.");
        }

        $ConsultaServicio->bind_param("i", $IdServicio);
        $ConsultaServicio->execute();

        $ResultadoServicio = $ConsultaServicio->get_result();
        $Servicio = $ResultadoServicio->fetch_assoc();
        $ConsultaServicio->close();

        if (!$Servicio) {
            $Conexion->close();
            ResponderJson(false, "El servicio indicado no existe.", [], 404);
        }

        $ConsultaExiste = $Conexion->prepare("
            SELECT ID_SERVICIO
            FROM COR_SERVICIOS_TB
            WHERE ID_HOTEL = ?
              AND NOMBRE_SERVICIO = ?
              AND ID_SERVICIO <> ?
            LIMIT 1
        ");

        if (!$ConsultaExiste) {
            throw new Exception("No fue posible validar el nombre del servicio.");
        }

        $ConsultaExiste->bind_param("isi", $IdHotel, $NombreServicio, $IdServicio);
        $ConsultaExiste->execute();

        $ResultadoExiste = $ConsultaExiste->get_result();
        $Existe = $ResultadoExiste->fetch_assoc();
        $ConsultaExiste->close();

        if ($Existe) {
            $Conexion->close();
            ResponderJson(false, "Ya existe otro servicio con ese nombre para el hotel seleccionado.", [], 409);
        }

        $ConsultaActualizar = $Conexion->prepare("
            UPDATE COR_SERVICIOS_TB
            SET
                ID_HOTEL = ?,
                NOMBRE_SERVICIO = ?,
                DESCRIPCION = ?,
                PRECIO = ?,
                ESTADO_SERVICIO = ?
            WHERE ID_SERVICIO = ?
        ");

        if (!$ConsultaActualizar) {
            throw new Exception("No fue posible preparar la actualización del servicio.");
        }

        $ConsultaActualizar->bind_param(
            "issdsi",
            $IdHotel,
            $NombreServicio,
            $Descripcion,
            $Precio,
            $EstadoServicio,
            $IdServicio
        );

        if (!$ConsultaActualizar->execute()) {
            throw new Exception("No fue posible actualizar el servicio.");
        }

        $ConsultaActualizar->close();
        $Conexion->close();

        ResponderJson(true, "Servicio actualizado correctamente.");
    }

    if ($Metodo === "PATCH") {
        $IdServicio = (int) ($Datos["IdServicio"] ?? 0);
        $EstadoServicio = strtoupper(NormalizarTexto($Datos["EstadoServicio"] ?? ""));

        if ($IdServicio <= 0) {
            $Conexion->close();
            ResponderJson(false, "Debes indicar un servicio válido.", [], 422);
        }

        if (!ValidarEstadoServicio($EstadoServicio)) {
            $Conexion->close();
            ResponderJson(false, "El estado del servicio no es válido.", [], 422);
        }

        $ConsultaActualizarEstado = $Conexion->prepare("
            UPDATE COR_SERVICIOS_TB
            SET ESTADO_SERVICIO = ?
            WHERE ID_SERVICIO = ?
        ");

        if (!$ConsultaActualizarEstado) {
            throw new Exception("No fue posible preparar el cambio de estado.");
        }

        $ConsultaActualizarEstado->bind_param("si", $EstadoServicio, $IdServicio);

        if (!$ConsultaActualizarEstado->execute()) {
            throw new Exception("No fue posible actualizar el estado del servicio.");
        }

        $ConsultaActualizarEstado->close();
        $Conexion->close();

        ResponderJson(true, "Estado del servicio actualizado correctamente.");
    }

    $Conexion->close();
    ResponderJson(false, "Método no permitido.", [], 405);
} catch (Throwable $Error) {
    if (isset($Conexion) && $Conexion instanceof mysqli) {
        try {
            $Conexion->close();
        } catch (Throwable $ErrorConexion) {
        }
    }

    ResponderJson(false, $Error->getMessage(), [], 500);
}