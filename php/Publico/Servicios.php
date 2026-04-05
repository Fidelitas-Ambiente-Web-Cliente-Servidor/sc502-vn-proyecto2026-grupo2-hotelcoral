<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../Base/Db.php';

try {
    $BaseDatos = new Db();
    $Conexion = $BaseDatos->Conectar();

    $ConsultaHoteles = "
        SELECT
            ID_HOTEL,
            NOMBRE_HOTEL
        FROM COR_HOTELES_TB
        ORDER BY NOMBRE_HOTEL ASC
    ";

    $ResultadoHoteles = $Conexion->query($ConsultaHoteles);

    if (!$ResultadoHoteles) {
        throw new Exception("No fue posible obtener los hoteles.");
    }

    $ListaHoteles = [];

    while ($FilaHotel = $ResultadoHoteles->fetch_assoc()) {
        $ListaHoteles[] = [
            'IdHotel' => (string) $FilaHotel['ID_HOTEL'],
            'NombreHotel' => $FilaHotel['NOMBRE_HOTEL']
        ];
    }

    $ConsultaServicios = "
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
        ORDER BY S.NOMBRE_SERVICIO ASC, H.NOMBRE_HOTEL ASC
    ";

    $ResultadoServicios = $Conexion->query($ConsultaServicios);

    if (!$ResultadoServicios) {
        throw new Exception("No fue posible obtener los servicios.");
    }

    $ServiciosAgrupados = [];

    while ($FilaServicio = $ResultadoServicios->fetch_assoc()) {
        $ClaveServicio = trim(mb_strtolower($FilaServicio['NOMBRE_SERVICIO']));

        if (!isset($ServiciosAgrupados[$ClaveServicio])) {
            $ServiciosAgrupados[$ClaveServicio] = [
                'IdServicio' => (int) $FilaServicio['ID_SERVICIO'],
                'NombreServicio' => $FilaServicio['NOMBRE_SERVICIO'],
                'Descripcion' => $FilaServicio['DESCRIPCION'],
                'Precio' => '₡' . number_format((float) $FilaServicio['PRECIO'], 2, '.', ','),
                'Imagen' => ObtenerImagenServicio($FilaServicio['NOMBRE_SERVICIO']),
                'HotelesDisponibles' => [],
                'NombresHoteles' => []
            ];
        }

        $IdHotel = (string) $FilaServicio['ID_HOTEL'];
        $NombreHotel = $FilaServicio['NOMBRE_HOTEL'];

        if (!in_array($IdHotel, $ServiciosAgrupados[$ClaveServicio]['HotelesDisponibles'], true)) {
            $ServiciosAgrupados[$ClaveServicio]['HotelesDisponibles'][] = $IdHotel;
        }

        if (!in_array($NombreHotel, $ServiciosAgrupados[$ClaveServicio]['NombresHoteles'], true)) {
            $ServiciosAgrupados[$ClaveServicio]['NombresHoteles'][] = $NombreHotel;
        }
    }

    echo json_encode([
        'success' => true,
        'message' => 'Servicios obtenidos correctamente.',
        'data' => [
            'Hoteles' => $ListaHoteles,
            'Servicios' => array_values($ServiciosAgrupados)
        ]
    ], JSON_UNESCAPED_UNICODE);

    $Conexion->close();

} catch (Throwable $Error) {
    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Ocurrió un error al obtener los servicios.',
        'error' => $Error->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

function ObtenerImagenServicio(string $NombreServicio): string
{
    $MapaImagenes = [
        'Spa Coral' => 'Recursos/Imagenes/Spa.jpg',
        'Desayuno Típico Costarricense' => 'Recursos/Imagenes/Desayuno.jpg',
        'Tour Costero' => 'Recursos/Imagenes/Tour.jpg',
        'Snorkel Costero' => 'Recursos/Imagenes/Snorkel.jpg',
        'Cena típica frente al mar' => 'Recursos/Imagenes/Cena.jpg',
        'Café y repostería artesanal' => 'Recursos/Imagenes/Cafe.jpg'
    ];

    return $MapaImagenes[$NombreServicio] ?? 'Recursos/Imagenes/HotelGeneral.png';
}