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

function ValidarEstadoTipo(string $Estado): bool
{
    return in_array($Estado, ["ACTIVO", "INACTIVO"], true);
}

function ObtenerImagenPrincipal(mysqli $Conexion, int $IdTipoHabitacion): ?array
{
    $ConsultaImagen = $Conexion->prepare("
        SELECT
            ID_IMAGEN,
            URL_IMAGEN,
            DESCRIPCION,
            ORDEN_IMAGEN
        FROM COR_IMAGENES_TIPO_HABITACION_TB
        WHERE ID_TIPO_HABITACION = ?
        ORDER BY ORDEN_IMAGEN ASC, ID_IMAGEN ASC
        LIMIT 1
    ");

    if (!$ConsultaImagen) {
        throw new Exception("No fue posible preparar la consulta de imagen.");
    }

    $ConsultaImagen->bind_param("i", $IdTipoHabitacion);
    $ConsultaImagen->execute();

    $ResultadoImagen = $ConsultaImagen->get_result();
    $Imagen = $ResultadoImagen->fetch_assoc() ?: null;

    $ConsultaImagen->close();

    return $Imagen;
}

function GuardarImagenPrincipal(
    mysqli $Conexion,
    int $IdTipoHabitacion,
    string $UrlImagen,
    string $DescripcionImagen
): void {
    if ($UrlImagen === "") {
        return;
    }

    $ConsultaExistente = $Conexion->prepare("
        SELECT ID_IMAGEN
        FROM COR_IMAGENES_TIPO_HABITACION_TB
        WHERE ID_TIPO_HABITACION = ? AND ORDEN_IMAGEN = 1
        LIMIT 1
    ");

    if (!$ConsultaExistente) {
        throw new Exception("No fue posible validar la imagen principal.");
    }

    $ConsultaExistente->bind_param("i", $IdTipoHabitacion);
    $ConsultaExistente->execute();

    $ResultadoExistente = $ConsultaExistente->get_result();
    $ImagenExistente = $ResultadoExistente->fetch_assoc();

    $ConsultaExistente->close();

    if ($ImagenExistente) {
        $IdImagen = (int) $ImagenExistente["ID_IMAGEN"];

        $ActualizacionImagen = $Conexion->prepare("
            UPDATE COR_IMAGENES_TIPO_HABITACION_TB
            SET
                URL_IMAGEN = ?,
                DESCRIPCION = ?
            WHERE ID_IMAGEN = ?
        ");

        if (!$ActualizacionImagen) {
            throw new Exception("No fue posible actualizar la imagen principal.");
        }

        $ActualizacionImagen->bind_param(
            "ssi",
            $UrlImagen,
            $DescripcionImagen,
            $IdImagen
        );

        if (!$ActualizacionImagen->execute()) {
            throw new Exception("No fue posible actualizar la imagen principal.");
        }

        $ActualizacionImagen->close();
        return;
    }

    $OrdenImagen = 1;

    $InsercionImagen = $Conexion->prepare("
        INSERT INTO COR_IMAGENES_TIPO_HABITACION_TB
        (
            ID_TIPO_HABITACION,
            URL_IMAGEN,
            DESCRIPCION,
            ORDEN_IMAGEN
        )
        VALUES (?, ?, ?, ?)
    ");

    if (!$InsercionImagen) {
        throw new Exception("No fue posible guardar la imagen principal.");
    }

    $InsercionImagen->bind_param(
        "issi",
        $IdTipoHabitacion,
        $UrlImagen,
        $DescripcionImagen,
        $OrdenImagen
    );

    if (!$InsercionImagen->execute()) {
        throw new Exception("No fue posible guardar la imagen principal.");
    }

    $InsercionImagen->close();
}

try {
    ValidarSesionAdmin();

    $Metodo = $_SERVER["REQUEST_METHOD"] ?? "GET";
    $Db = new Db();
    $Conexion = $Db->Conectar();

    if ($Metodo === "GET") {
        $IdTipoHabitacion = isset($_GET["id"]) ? (int) $_GET["id"] : 0;
        $IdHotel = isset($_GET["IdHotel"]) ? (int) $_GET["IdHotel"] : 0;

        if ($IdTipoHabitacion > 0) {
            $Consulta = $Conexion->prepare("
                SELECT
                    TH.ID_TIPO_HABITACION,
                    TH.ID_HOTEL,
                    H.NOMBRE_HOTEL,
                    TH.NOMBRE_TIPO,
                    TH.DESCRIPCION,
                    TH.CAPACIDAD,
                    TH.CANTIDAD_CAMAS,
                    TH.PRECIO_BASE,
                    TH.ESTADO_TIPO_HABITACION
                FROM COR_TIPOS_HABITACION_TB TH
                INNER JOIN COR_HOTELES_TB H
                    ON H.ID_HOTEL = TH.ID_HOTEL
                WHERE TH.ID_TIPO_HABITACION = ?
                LIMIT 1
            ");

            if (!$Consulta) {
                throw new Exception("No fue posible preparar la consulta del tipo.");
            }

            $Consulta->bind_param("i", $IdTipoHabitacion);
            $Consulta->execute();

            $Resultado = $Consulta->get_result();
            $TipoHabitacion = $Resultado->fetch_assoc();

            $Consulta->close();

            if (!$TipoHabitacion) {
                $Conexion->close();
                ResponderJson(false, "Tipo de habitación no encontrado.", [], 404);
            }

            $Imagen = ObtenerImagenPrincipal($Conexion, $IdTipoHabitacion);

            if ($Imagen) {
                $TipoHabitacion["URL_IMAGEN"] = $Imagen["URL_IMAGEN"];
                $TipoHabitacion["DESCRIPCION_IMAGEN"] = $Imagen["DESCRIPCION"];
            } else {
                $TipoHabitacion["URL_IMAGEN"] = "";
                $TipoHabitacion["DESCRIPCION_IMAGEN"] = "";
            }

            $Conexion->close();

            ResponderJson(true, "Tipo de habitación cargado correctamente.", [
                "TipoHabitacion" => $TipoHabitacion
            ]);
        }

        $Sql = "
            SELECT
                TH.ID_TIPO_HABITACION,
                TH.ID_HOTEL,
                H.NOMBRE_HOTEL,
                TH.NOMBRE_TIPO,
                TH.DESCRIPCION,
                TH.CAPACIDAD,
                TH.CANTIDAD_CAMAS,
                TH.PRECIO_BASE,
                TH.ESTADO_TIPO_HABITACION,
                I.URL_IMAGEN
            FROM COR_TIPOS_HABITACION_TB TH
            INNER JOIN COR_HOTELES_TB H
                ON H.ID_HOTEL = TH.ID_HOTEL
            LEFT JOIN COR_IMAGENES_TIPO_HABITACION_TB I
                ON I.ID_TIPO_HABITACION = TH.ID_TIPO_HABITACION
                AND I.ORDEN_IMAGEN = 1
        ";

        if ($IdHotel > 0) {
            $Sql .= " WHERE TH.ID_HOTEL = ? ";
        }

        $Sql .= " ORDER BY H.NOMBRE_HOTEL ASC, TH.NOMBRE_TIPO ASC ";

        $Consulta = $Conexion->prepare($Sql);

        if (!$Consulta) {
            throw new Exception("No fue posible preparar la lista de tipos.");
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
    }

    if ($Metodo === "POST") {
        $Datos = ObtenerDatosEntrada();

        $IdHotel = (int) ($Datos["IdHotel"] ?? 0);
        $NombreTipo = NormalizarTexto($Datos["NombreTipo"] ?? "");
        $Descripcion = NormalizarTexto($Datos["Descripcion"] ?? "");
        $Capacidad = (int) ($Datos["Capacidad"] ?? 0);
        $CantidadCamas = (int) ($Datos["CantidadCamas"] ?? 0);
        $PrecioBase = (float) ($Datos["PrecioBase"] ?? 0);
        $EstadoTipoHabitacion = strtoupper(NormalizarTexto($Datos["EstadoTipoHabitacion"] ?? "ACTIVO"));
        $UrlImagen = NormalizarTexto($Datos["UrlImagen"] ?? "");
        $DescripcionImagen = NormalizarTexto($Datos["DescripcionImagen"] ?? "");

        if ($IdHotel <= 0) {
            ResponderJson(false, "Debes seleccionar un hotel válido.", [], 422);
        }

        if ($NombreTipo === "") {
            ResponderJson(false, "Debes ingresar el nombre del tipo.", [], 422);
        }

        if ($Capacidad <= 0) {
            ResponderJson(false, "La capacidad debe ser mayor que cero.", [], 422);
        }

        if ($CantidadCamas <= 0) {
            ResponderJson(false, "La cantidad de camas debe ser mayor que cero.", [], 422);
        }

        if ($PrecioBase < 0) {
            ResponderJson(false, "El precio base no puede ser negativo.", [], 422);
        }

        if (!ValidarEstadoTipo($EstadoTipoHabitacion)) {
            ResponderJson(false, "El estado indicado no es válido.", [], 422);
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

        if ($ResultadoHotel->num_rows === 0) {
            $ConsultaHotel->close();
            $Conexion->close();
            ResponderJson(false, "El hotel seleccionado no existe.", [], 404);
        }

        $ConsultaHotel->close();

        $ConsultaDuplicado = $Conexion->prepare("
            SELECT ID_TIPO_HABITACION
            FROM COR_TIPOS_HABITACION_TB
            WHERE ID_HOTEL = ? AND NOMBRE_TIPO = ?
            LIMIT 1
        ");

        if (!$ConsultaDuplicado) {
            throw new Exception("No fue posible validar el nombre del tipo.");
        }

        $ConsultaDuplicado->bind_param("is", $IdHotel, $NombreTipo);
        $ConsultaDuplicado->execute();

        $ResultadoDuplicado = $ConsultaDuplicado->get_result();

        if ($ResultadoDuplicado->num_rows > 0) {
            $ConsultaDuplicado->close();
            $Conexion->close();
            ResponderJson(false, "Ya existe un tipo de habitación con ese nombre para ese hotel.", [], 409);
        }

        $ConsultaDuplicado->close();

        $Insercion = $Conexion->prepare("
            INSERT INTO COR_TIPOS_HABITACION_TB
            (
                ID_HOTEL,
                NOMBRE_TIPO,
                DESCRIPCION,
                CAPACIDAD,
                CANTIDAD_CAMAS,
                PRECIO_BASE,
                ESTADO_TIPO_HABITACION
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");

        if (!$Insercion) {
            throw new Exception("No fue posible crear el tipo de habitación.");
        }

        $Insercion->bind_param(
            "issiids",
            $IdHotel,
            $NombreTipo,
            $Descripcion,
            $Capacidad,
            $CantidadCamas,
            $PrecioBase,
            $EstadoTipoHabitacion
        );

        if (!$Insercion->execute()) {
            throw new Exception("No fue posible crear el tipo de habitación.");
        }

        $IdTipoNuevo = $Insercion->insert_id;
        $Insercion->close();

        GuardarImagenPrincipal($Conexion, $IdTipoNuevo, $UrlImagen, $DescripcionImagen);

        $Conexion->close();

        ResponderJson(true, "Tipo de habitación creado correctamente.", [
            "IdTipoHabitacion" => $IdTipoNuevo
        ]);
    }

    if ($Metodo === "PUT") {
        $Datos = ObtenerDatosEntrada();

        $IdTipoHabitacion = (int) ($Datos["IdTipoHabitacion"] ?? 0);
        $IdHotel = (int) ($Datos["IdHotel"] ?? 0);
        $NombreTipo = NormalizarTexto($Datos["NombreTipo"] ?? "");
        $Descripcion = NormalizarTexto($Datos["Descripcion"] ?? "");
        $Capacidad = (int) ($Datos["Capacidad"] ?? 0);
        $CantidadCamas = (int) ($Datos["CantidadCamas"] ?? 0);
        $PrecioBase = (float) ($Datos["PrecioBase"] ?? 0);
        $EstadoTipoHabitacion = strtoupper(NormalizarTexto($Datos["EstadoTipoHabitacion"] ?? ""));
        $UrlImagen = NormalizarTexto($Datos["UrlImagen"] ?? "");
        $DescripcionImagen = NormalizarTexto($Datos["DescripcionImagen"] ?? "");

        if ($IdTipoHabitacion <= 0) {
            ResponderJson(false, "El ID del tipo es obligatorio.", [], 422);
        }

        if ($IdHotel <= 0) {
            ResponderJson(false, "Debes seleccionar un hotel válido.", [], 422);
        }

        if ($NombreTipo === "") {
            ResponderJson(false, "Debes ingresar el nombre del tipo.", [], 422);
        }

        if ($Capacidad <= 0) {
            ResponderJson(false, "La capacidad debe ser mayor que cero.", [], 422);
        }

        if ($CantidadCamas <= 0) {
            ResponderJson(false, "La cantidad de camas debe ser mayor que cero.", [], 422);
        }

        if ($PrecioBase < 0) {
            ResponderJson(false, "El precio base no puede ser negativo.", [], 422);
        }

        if (!ValidarEstadoTipo($EstadoTipoHabitacion)) {
            ResponderJson(false, "El estado indicado no es válido.", [], 422);
        }

        $ConsultaExistencia = $Conexion->prepare("
            SELECT ID_TIPO_HABITACION
            FROM COR_TIPOS_HABITACION_TB
            WHERE ID_TIPO_HABITACION = ?
            LIMIT 1
        ");

        if (!$ConsultaExistencia) {
            throw new Exception("No fue posible validar la existencia del tipo.");
        }

        $ConsultaExistencia->bind_param("i", $IdTipoHabitacion);
        $ConsultaExistencia->execute();

        $ResultadoExistencia = $ConsultaExistencia->get_result();

        if ($ResultadoExistencia->num_rows === 0) {
            $ConsultaExistencia->close();
            $Conexion->close();
            ResponderJson(false, "El tipo de habitación no existe.", [], 404);
        }

        $ConsultaExistencia->close();

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

        if ($ResultadoHotel->num_rows === 0) {
            $ConsultaHotel->close();
            $Conexion->close();
            ResponderJson(false, "El hotel seleccionado no existe.", [], 404);
        }

        $ConsultaHotel->close();

        $ConsultaDuplicado = $Conexion->prepare("
            SELECT ID_TIPO_HABITACION
            FROM COR_TIPOS_HABITACION_TB
            WHERE ID_HOTEL = ? AND NOMBRE_TIPO = ? AND ID_TIPO_HABITACION <> ?
            LIMIT 1
        ");

        if (!$ConsultaDuplicado) {
            throw new Exception("No fue posible validar el nombre del tipo.");
        }

        $ConsultaDuplicado->bind_param("isi", $IdHotel, $NombreTipo, $IdTipoHabitacion);
        $ConsultaDuplicado->execute();

        $ResultadoDuplicado = $ConsultaDuplicado->get_result();

        if ($ResultadoDuplicado->num_rows > 0) {
            $ConsultaDuplicado->close();
            $Conexion->close();
            ResponderJson(false, "Ya existe un tipo de habitación con ese nombre para ese hotel.", [], 409);
        }

        $ConsultaDuplicado->close();

        $Actualizacion = $Conexion->prepare("
            UPDATE COR_TIPOS_HABITACION_TB
            SET
                ID_HOTEL = ?,
                NOMBRE_TIPO = ?,
                DESCRIPCION = ?,
                CAPACIDAD = ?,
                CANTIDAD_CAMAS = ?,
                PRECIO_BASE = ?,
                ESTADO_TIPO_HABITACION = ?
            WHERE ID_TIPO_HABITACION = ?
        ");

        if (!$Actualizacion) {
            throw new Exception("No fue posible actualizar el tipo de habitación.");
        }

        $Actualizacion->bind_param(
            "issiidsi",
            $IdHotel,
            $NombreTipo,
            $Descripcion,
            $Capacidad,
            $CantidadCamas,
            $PrecioBase,
            $EstadoTipoHabitacion,
            $IdTipoHabitacion
        );

        if (!$Actualizacion->execute()) {
            throw new Exception("No fue posible actualizar el tipo de habitación.");
        }

        $Actualizacion->close();

        GuardarImagenPrincipal($Conexion, $IdTipoHabitacion, $UrlImagen, $DescripcionImagen);

        $Conexion->close();

        ResponderJson(true, "Tipo de habitación actualizado correctamente.");
    }

    $Conexion->close();
    ResponderJson(false, "Método no permitido.", [], 405);
} catch (Throwable $Error) {
    ResponderJson(false, $Error->getMessage(), [], 500);
}