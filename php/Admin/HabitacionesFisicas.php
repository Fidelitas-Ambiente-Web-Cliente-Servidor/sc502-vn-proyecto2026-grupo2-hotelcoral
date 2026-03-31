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

function ValidarEstadoHabitacion(string $Estado): bool
{
    return in_array($Estado, ["DISPONIBLE", "OCUPADA", "MANTENIMIENTO", "INACTIVA"], true);
}

function NormalizarAmenidades($Valor): array
{
    if (!is_array($Valor)) {
        return [];
    }

    $Amenidades = [];

    foreach ($Valor as $IdAmenidad) {
        $IdAmenidad = (int) $IdAmenidad;

        if ($IdAmenidad > 0) {
            $Amenidades[$IdAmenidad] = $IdAmenidad;
        }
    }

    return array_values($Amenidades);
}

function ValidarHotel(mysqli $Conexion, int $IdHotel): void
{
    $Consulta = $Conexion->prepare("
        SELECT ID_HOTEL
        FROM COR_HOTELES_TB
        WHERE ID_HOTEL = ?
        LIMIT 1
    ");

    if (!$Consulta) {
        throw new Exception("No fue posible validar el hotel.");
    }

    $Consulta->bind_param("i", $IdHotel);
    $Consulta->execute();

    $Resultado = $Consulta->get_result();

    if ($Resultado->num_rows === 0) {
        $Consulta->close();
        ResponderJson(false, "El hotel seleccionado no existe.", [], 404);
    }

    $Consulta->close();
}

function ValidarTipoHabitacionDelHotel(mysqli $Conexion, int $IdHotel, int $IdTipoHabitacion): void
{
    $Consulta = $Conexion->prepare("
        SELECT ID_TIPO_HABITACION
        FROM COR_TIPOS_HABITACION_TB
        WHERE ID_HOTEL = ? AND ID_TIPO_HABITACION = ?
        LIMIT 1
    ");

    if (!$Consulta) {
        throw new Exception("No fue posible validar el tipo de habitación.");
    }

    $Consulta->bind_param("ii", $IdHotel, $IdTipoHabitacion);
    $Consulta->execute();

    $Resultado = $Consulta->get_result();

    if ($Resultado->num_rows === 0) {
        $Consulta->close();
        ResponderJson(false, "El tipo de habitación no pertenece al hotel seleccionado.", [], 422);
    }

    $Consulta->close();
}

function ValidarAmenidades(mysqli $Conexion, array $Amenidades): void
{
    if (empty($Amenidades)) {
        return;
    }

    $Marcadores = implode(",", array_fill(0, count($Amenidades), "?"));
    $Tipos = str_repeat("i", count($Amenidades));

    $Consulta = $Conexion->prepare("
        SELECT COUNT(*) AS TOTAL
        FROM COR_AMENIDADES_TB
        WHERE ID_AMENIDAD IN ($Marcadores)
          AND ESTADO_AMENIDAD = 'ACTIVO'
    ");

    if (!$Consulta) {
        throw new Exception("No fue posible validar las amenidades.");
    }

    $Consulta->bind_param($Tipos, ...$Amenidades);
    $Consulta->execute();

    $Resultado = $Consulta->get_result();
    $Fila = $Resultado->fetch_assoc();

    $Consulta->close();

    $TotalValidas = (int) ($Fila["TOTAL"] ?? 0);

    if ($TotalValidas !== count($Amenidades)) {
        ResponderJson(false, "Una o más amenidades no son válidas.", [], 422);
    }
}

function GuardarAmenidadesHabitacion(mysqli $Conexion, int $IdHabitacion, array $Amenidades): void
{
    $Eliminacion = $Conexion->prepare("
        DELETE FROM COR_HABITACION_AMENIDAD_TB
        WHERE ID_HABITACION = ?
    ");

    if (!$Eliminacion) {
        throw new Exception("No fue posible limpiar las amenidades anteriores.");
    }

    $Eliminacion->bind_param("i", $IdHabitacion);

    if (!$Eliminacion->execute()) {
        $Eliminacion->close();
        throw new Exception("No fue posible limpiar las amenidades anteriores.");
    }

    $Eliminacion->close();

    if (empty($Amenidades)) {
        return;
    }

    $Insercion = $Conexion->prepare("
        INSERT INTO COR_HABITACION_AMENIDAD_TB
        (
            ID_HABITACION,
            ID_AMENIDAD
        )
        VALUES (?, ?)
    ");

    if (!$Insercion) {
        throw new Exception("No fue posible guardar las amenidades.");
    }

    foreach ($Amenidades as $IdAmenidad) {
        $Insercion->bind_param("ii", $IdHabitacion, $IdAmenidad);

        if (!$Insercion->execute()) {
            $Insercion->close();
            throw new Exception("No fue posible guardar las amenidades.");
        }
    }

    $Insercion->close();
}

function ObtenerAmenidadesDeHabitacion(mysqli $Conexion, int $IdHabitacion): array
{
    $Consulta = $Conexion->prepare("
        SELECT
            A.ID_AMENIDAD,
            A.NOMBRE_AMENIDAD,
            A.DESCRIPCION
        FROM COR_HABITACION_AMENIDAD_TB HA
        INNER JOIN COR_AMENIDADES_TB A
            ON A.ID_AMENIDAD = HA.ID_AMENIDAD
        WHERE HA.ID_HABITACION = ?
        ORDER BY A.NOMBRE_AMENIDAD ASC
    ");

    if (!$Consulta) {
        throw new Exception("No fue posible cargar las amenidades de la habitación.");
    }

    $Consulta->bind_param("i", $IdHabitacion);
    $Consulta->execute();

    $Resultado = $Consulta->get_result();
    $Amenidades = [];

    while ($Fila = $Resultado->fetch_assoc()) {
        $Amenidades[] = $Fila;
    }

    $Consulta->close();

    return $Amenidades;
}

try {
    ValidarSesionAdmin();

    $Metodo = $_SERVER["REQUEST_METHOD"] ?? "GET";
    $Db = new Db();
    $Conexion = $Db->Conectar();

    if ($Metodo === "GET") {
        $IdHabitacion = isset($_GET["id"]) ? (int) $_GET["id"] : 0;
        $IdHotel = isset($_GET["IdHotel"]) ? (int) $_GET["IdHotel"] : 0;

        if ($IdHabitacion > 0) {
            $Consulta = $Conexion->prepare("
                SELECT
                    HB.ID_HABITACION,
                    HB.ID_HOTEL,
                    H.NOMBRE_HOTEL,
                    HB.ID_TIPO_HABITACION,
                    TH.NOMBRE_TIPO,
                    HB.NUMERO_HABITACION,
                    HB.PISO,
                    HB.ESTADO_HABITACION,
                    HB.DESCRIPCION
                FROM COR_HABITACIONES_TB HB
                INNER JOIN COR_HOTELES_TB H
                    ON H.ID_HOTEL = HB.ID_HOTEL
                INNER JOIN COR_TIPOS_HABITACION_TB TH
                    ON TH.ID_TIPO_HABITACION = HB.ID_TIPO_HABITACION
                WHERE HB.ID_HABITACION = ?
                LIMIT 1
            ");

            if (!$Consulta) {
                throw new Exception("No fue posible preparar la consulta de la habitación.");
            }

            $Consulta->bind_param("i", $IdHabitacion);
            $Consulta->execute();

            $Resultado = $Consulta->get_result();
            $Habitacion = $Resultado->fetch_assoc();

            $Consulta->close();

            if (!$Habitacion) {
                $Conexion->close();
                ResponderJson(false, "Habitación física no encontrada.", [], 404);
            }

            $AmenidadesDetalle = ObtenerAmenidadesDeHabitacion($Conexion, $IdHabitacion);
            $AmenidadesSeleccionadas = array_map(
                fn($Item) => (int) $Item["ID_AMENIDAD"],
                $AmenidadesDetalle
            );

            $Conexion->close();

            ResponderJson(true, "Habitación física cargada correctamente.", [
                "HabitacionFisica" => $Habitacion,
                "Amenidades" => $AmenidadesSeleccionadas,
                "AmenidadesDetalle" => $AmenidadesDetalle
            ]);
        }

        $Sql = "
            SELECT
                HB.ID_HABITACION,
                HB.ID_HOTEL,
                H.NOMBRE_HOTEL,
                HB.ID_TIPO_HABITACION,
                TH.NOMBRE_TIPO,
                HB.NUMERO_HABITACION,
                HB.PISO,
                HB.ESTADO_HABITACION,
                HB.DESCRIPCION,
                GROUP_CONCAT(DISTINCT A.NOMBRE_AMENIDAD ORDER BY A.NOMBRE_AMENIDAD SEPARATOR ', ') AS AMENIDADES
            FROM COR_HABITACIONES_TB HB
            INNER JOIN COR_HOTELES_TB H
                ON H.ID_HOTEL = HB.ID_HOTEL
            INNER JOIN COR_TIPOS_HABITACION_TB TH
                ON TH.ID_TIPO_HABITACION = HB.ID_TIPO_HABITACION
            LEFT JOIN COR_HABITACION_AMENIDAD_TB HA
                ON HA.ID_HABITACION = HB.ID_HABITACION
            LEFT JOIN COR_AMENIDADES_TB A
                ON A.ID_AMENIDAD = HA.ID_AMENIDAD
        ";

        if ($IdHotel > 0) {
            $Sql .= " WHERE HB.ID_HOTEL = ? ";
        }

        $Sql .= "
            GROUP BY
                HB.ID_HABITACION,
                HB.ID_HOTEL,
                H.NOMBRE_HOTEL,
                HB.ID_TIPO_HABITACION,
                TH.NOMBRE_TIPO,
                HB.NUMERO_HABITACION,
                HB.PISO,
                HB.ESTADO_HABITACION,
                HB.DESCRIPCION
            ORDER BY H.NOMBRE_HOTEL ASC, HB.NUMERO_HABITACION ASC
        ";

        $Consulta = $Conexion->prepare($Sql);

        if (!$Consulta) {
            throw new Exception("No fue posible preparar la lista de habitaciones físicas.");
        }

        if ($IdHotel > 0) {
            $Consulta->bind_param("i", $IdHotel);
        }

        $Consulta->execute();
        $Resultado = $Consulta->get_result();

        $HabitacionesFisicas = [];

        while ($Fila = $Resultado->fetch_assoc()) {
            $HabitacionesFisicas[] = $Fila;
        }

        $Consulta->close();
        $Conexion->close();

        ResponderJson(true, "Habitaciones físicas cargadas correctamente.", [
            "HabitacionesFisicas" => $HabitacionesFisicas
        ]);
    }

    if ($Metodo === "POST") {
        $Datos = ObtenerDatosEntrada();

        $IdHotel = (int) ($Datos["IdHotel"] ?? 0);
        $IdTipoHabitacion = (int) ($Datos["IdTipoHabitacion"] ?? 0);
        $NumeroHabitacion = NormalizarTexto($Datos["NumeroHabitacion"] ?? "");
        $Piso = ($Datos["Piso"] ?? "") !== "" ? (int) $Datos["Piso"] : null;
        $EstadoHabitacion = strtoupper(NormalizarTexto($Datos["EstadoHabitacion"] ?? "DISPONIBLE"));
        $Descripcion = NormalizarTexto($Datos["Descripcion"] ?? "");
        $Amenidades = NormalizarAmenidades($Datos["Amenidades"] ?? []);

        if ($IdHotel <= 0) {
            ResponderJson(false, "Debes seleccionar un hotel válido.", [], 422);
        }

        if ($IdTipoHabitacion <= 0) {
            ResponderJson(false, "Debes seleccionar un tipo de habitación válido.", [], 422);
        }

        if ($NumeroHabitacion === "") {
            ResponderJson(false, "Debes ingresar el número de habitación.", [], 422);
        }

        if (!ValidarEstadoHabitacion($EstadoHabitacion)) {
            ResponderJson(false, "El estado indicado no es válido.", [], 422);
        }

        ValidarHotel($Conexion, $IdHotel);
        ValidarTipoHabitacionDelHotel($Conexion, $IdHotel, $IdTipoHabitacion);
        ValidarAmenidades($Conexion, $Amenidades);

        $ConsultaDuplicado = $Conexion->prepare("
            SELECT ID_HABITACION
            FROM COR_HABITACIONES_TB
            WHERE ID_HOTEL = ? AND NUMERO_HABITACION = ?
            LIMIT 1
        ");

        if (!$ConsultaDuplicado) {
            throw new Exception("No fue posible validar el número de habitación.");
        }

        $ConsultaDuplicado->bind_param("is", $IdHotel, $NumeroHabitacion);
        $ConsultaDuplicado->execute();

        $ResultadoDuplicado = $ConsultaDuplicado->get_result();

        if ($ResultadoDuplicado->num_rows > 0) {
            $ConsultaDuplicado->close();
            $Conexion->close();
            ResponderJson(false, "El número de habitación ya existe para ese hotel.", [], 409);
        }

        $ConsultaDuplicado->close();

        $Conexion->begin_transaction();

        try {
            $Insercion = $Conexion->prepare("
                INSERT INTO COR_HABITACIONES_TB
                (
                    ID_HOTEL,
                    ID_TIPO_HABITACION,
                    NUMERO_HABITACION,
                    PISO,
                    ESTADO_HABITACION,
                    DESCRIPCION
                )
                VALUES (?, ?, ?, ?, ?, ?)
            ");

            if (!$Insercion) {
                throw new Exception("No fue posible crear la habitación física.");
            }

            $Insercion->bind_param(
                "iisiss",
                $IdHotel,
                $IdTipoHabitacion,
                $NumeroHabitacion,
                $Piso,
                $EstadoHabitacion,
                $Descripcion
            );

            if (!$Insercion->execute()) {
                $Insercion->close();
                throw new Exception("No fue posible crear la habitación física.");
            }

            $IdHabitacionNueva = (int) $Insercion->insert_id;
            $Insercion->close();

            GuardarAmenidadesHabitacion($Conexion, $IdHabitacionNueva, $Amenidades);

            $Conexion->commit();
            $Conexion->close();

            ResponderJson(true, "Habitación física creada correctamente.", [
                "IdHabitacion" => $IdHabitacionNueva
            ]);
        } catch (Throwable $ErrorInterno) {
            $Conexion->rollback();
            throw $ErrorInterno;
        }
    }

    if ($Metodo === "PUT") {
        $Datos = ObtenerDatosEntrada();

        $IdHabitacion = (int) ($Datos["IdHabitacion"] ?? 0);
        $IdHotel = (int) ($Datos["IdHotel"] ?? 0);
        $IdTipoHabitacion = (int) ($Datos["IdTipoHabitacion"] ?? 0);
        $NumeroHabitacion = NormalizarTexto($Datos["NumeroHabitacion"] ?? "");
        $Piso = ($Datos["Piso"] ?? "") !== "" ? (int) $Datos["Piso"] : null;
        $EstadoHabitacion = strtoupper(NormalizarTexto($Datos["EstadoHabitacion"] ?? ""));
        $Descripcion = NormalizarTexto($Datos["Descripcion"] ?? "");
        $Amenidades = NormalizarAmenidades($Datos["Amenidades"] ?? []);

        if ($IdHabitacion <= 0) {
            ResponderJson(false, "El ID de la habitación es obligatorio.", [], 422);
        }

        if ($IdHotel <= 0) {
            ResponderJson(false, "Debes seleccionar un hotel válido.", [], 422);
        }

        if ($IdTipoHabitacion <= 0) {
            ResponderJson(false, "Debes seleccionar un tipo de habitación válido.", [], 422);
        }

        if ($NumeroHabitacion === "") {
            ResponderJson(false, "Debes ingresar el número de habitación.", [], 422);
        }

        if (!ValidarEstadoHabitacion($EstadoHabitacion)) {
            ResponderJson(false, "El estado indicado no es válido.", [], 422);
        }

        $ConsultaExistencia = $Conexion->prepare("
            SELECT ID_HABITACION
            FROM COR_HABITACIONES_TB
            WHERE ID_HABITACION = ?
            LIMIT 1
        ");

        if (!$ConsultaExistencia) {
            throw new Exception("No fue posible validar la existencia de la habitación.");
        }

        $ConsultaExistencia->bind_param("i", $IdHabitacion);
        $ConsultaExistencia->execute();

        $ResultadoExistencia = $ConsultaExistencia->get_result();

        if ($ResultadoExistencia->num_rows === 0) {
            $ConsultaExistencia->close();
            $Conexion->close();
            ResponderJson(false, "La habitación física no existe.", [], 404);
        }

        $ConsultaExistencia->close();

        ValidarHotel($Conexion, $IdHotel);
        ValidarTipoHabitacionDelHotel($Conexion, $IdHotel, $IdTipoHabitacion);
        ValidarAmenidades($Conexion, $Amenidades);

        $ConsultaDuplicado = $Conexion->prepare("
            SELECT ID_HABITACION
            FROM COR_HABITACIONES_TB
            WHERE ID_HOTEL = ? AND NUMERO_HABITACION = ? AND ID_HABITACION <> ?
            LIMIT 1
        ");

        if (!$ConsultaDuplicado) {
            throw new Exception("No fue posible validar el número de habitación.");
        }

        $ConsultaDuplicado->bind_param("isi", $IdHotel, $NumeroHabitacion, $IdHabitacion);
        $ConsultaDuplicado->execute();

        $ResultadoDuplicado = $ConsultaDuplicado->get_result();

        if ($ResultadoDuplicado->num_rows > 0) {
            $ConsultaDuplicado->close();
            $Conexion->close();
            ResponderJson(false, "El número de habitación ya existe para ese hotel.", [], 409);
        }

        $ConsultaDuplicado->close();

        $Conexion->begin_transaction();

        try {
            $Actualizacion = $Conexion->prepare("
                UPDATE COR_HABITACIONES_TB
                SET
                    ID_HOTEL = ?,
                    ID_TIPO_HABITACION = ?,
                    NUMERO_HABITACION = ?,
                    PISO = ?,
                    ESTADO_HABITACION = ?,
                    DESCRIPCION = ?
                WHERE ID_HABITACION = ?
            ");

            if (!$Actualizacion) {
                throw new Exception("No fue posible actualizar la habitación física.");
            }

            $Actualizacion->bind_param(
                "iisissi",
                $IdHotel,
                $IdTipoHabitacion,
                $NumeroHabitacion,
                $Piso,
                $EstadoHabitacion,
                $Descripcion,
                $IdHabitacion
            );

            if (!$Actualizacion->execute()) {
                $Actualizacion->close();
                throw new Exception("No fue posible actualizar la habitación física.");
            }

            $Actualizacion->close();

            GuardarAmenidadesHabitacion($Conexion, $IdHabitacion, $Amenidades);

            $Conexion->commit();
            $Conexion->close();

            ResponderJson(true, "Habitación física actualizada correctamente.");
        } catch (Throwable $ErrorInterno) {
            $Conexion->rollback();
            throw $ErrorInterno;
        }
    }

    $Conexion->close();
    ResponderJson(false, "Método no permitido.", [], 405);
} catch (Throwable $Error) {
    ResponderJson(false, $Error->getMessage(), [], 500);
}