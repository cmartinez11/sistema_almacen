<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoriaController;
use App\Http\Controllers\Api\EntradaController;
use App\Http\Controllers\Api\KardexController;
use App\Http\Controllers\Api\PersonalController;
use App\Http\Controllers\Api\ProductoController;
use App\Http\Controllers\Api\ProveedorController;
use App\Http\Controllers\Api\RequerimientoController;
use App\Http\Controllers\Api\SalidaController;
use App\Http\Controllers\Api\TransferenciaController;
use App\Http\Controllers\Api\UnidadMedidaController;
use App\Http\Controllers\Api\AlmacenController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Sistema de Almacén (Laravel Sanctum & PostgreSQL)
|--------------------------------------------------------------------------
*/

// Autenticación pública
Route::post('login', [AuthController::class, 'login']);

Route::prefix('v1')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
});

// Rutas Protegidas Sanctum
Route::middleware('auth:sanctum')->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);

    // Recursos API Full CRUD
    Route::apiResource('almacenes', AlmacenController::class)->only(['index']);
    // Consulta SUNAT por RUC (ApisPeru)
    Route::get('proveedores/consulta-ruc/{ruc}', [ProveedorController::class, 'consultarRuc']);
    Route::apiResource('proveedores', ProveedorController::class);
    Route::get('reportes/stock-critico', [ProductoController::class, 'stockCritico']);
    Route::get('productos/stock-critico', [ProductoController::class, 'stockCritico']);
    Route::apiResource('productos', ProductoController::class);
    Route::apiResource('categorias', CategoriaController::class);
    Route::apiResource('unidades-medida', UnidadMedidaController::class);
    Route::apiResource('personal', PersonalController::class);
    Route::get('personal/{id}/historial-salidas', [PersonalController::class, 'historialSalidas']);
    Route::get('personal/{id}/historial-pdf', [PersonalController::class, 'exportHistorialPdf']);

    Route::apiResource('entradas', EntradaController::class)->only(['index', 'store', 'show']);
    Route::get('entradas/{id}/pdf', [EntradaController::class, 'exportPdf']);
    Route::get('ingresos/{id}/pdf', [EntradaController::class, 'exportPdf']);
    Route::apiResource('salidas', SalidaController::class)->only(['index', 'store', 'show']);
    Route::get('salidas/{id}/pdf', [SalidaController::class, 'exportPdf']);

    Route::apiResource('transferencias', TransferenciaController::class)->only(['index', 'store', 'show']);
    Route::get('transferencias/{id}/pdf', [TransferenciaController::class, 'pdf']);

    Route::apiResource('inventarios-fisicos', \App\Http\Controllers\Api\InventarioFisicoController::class)->only(['index', 'store', 'show']);

    Route::apiResource('requerimientos', RequerimientoController::class);
    Route::get('requerimientos/{id}/pdf', [RequerimientoController::class, 'exportPdf']);
    Route::put('requerimientos/{id}/cotizar', [RequerimientoController::class, 'cotizar']);
    Route::put('requerimientos/{id}/aprobar', [RequerimientoController::class, 'aprobar']);
    Route::put('requerimientos/{id}/rechazar', [RequerimientoController::class, 'rechazar']);
    Route::put('requerimientos/{id}/cerrar-faltante', [RequerimientoController::class, 'cerrarFaltante']);

    Route::get('kardex/producto/{productoId}', [KardexController::class, 'getByProducto']);
    Route::get('kardex/valorizado', [KardexController::class, 'getValorizadoResumen']);
});

// Rutas Directas de Respaldo para desarrollo y pruebas de clientes API
Route::apiResource('almacenes', AlmacenController::class)->only(['index']);
Route::apiResource('proveedores', ProveedorController::class);
Route::get('reportes/stock-critico', [ProductoController::class, 'stockCritico']);
Route::get('productos/stock-critico', [ProductoController::class, 'stockCritico']);
Route::apiResource('productos', ProductoController::class);
Route::apiResource('categorias', CategoriaController::class);
Route::apiResource('unidades-medida', UnidadMedidaController::class);
Route::apiResource('personal', PersonalController::class);
Route::get('personal/{id}/historial-salidas', [PersonalController::class, 'historialSalidas']);
Route::get('personal/{id}/historial-pdf', [PersonalController::class, 'exportHistorialPdf']);
Route::apiResource('entradas', EntradaController::class)->only(['index', 'store', 'show']);
Route::get('entradas/{id}/pdf', [EntradaController::class, 'exportPdf']);
Route::get('ingresos/{id}/pdf', [EntradaController::class, 'exportPdf']);
Route::apiResource('salidas', SalidaController::class)->only(['index', 'store', 'show']);
Route::get('salidas/{id}/pdf', [SalidaController::class, 'exportPdf']);
Route::apiResource('transferencias', TransferenciaController::class)->only(['index', 'store', 'show']);
Route::get('transferencias/{id}/pdf', [TransferenciaController::class, 'pdf']);
Route::apiResource('inventarios-fisicos', \App\Http\Controllers\Api\InventarioFisicoController::class)->only(['index', 'store', 'show']);
Route::apiResource('requerimientos', RequerimientoController::class);
Route::get('requerimientos/{id}/pdf', [RequerimientoController::class, 'exportPdf']);
Route::put('requerimientos/{id}/cotizar', [RequerimientoController::class, 'cotizar']);
Route::put('requerimientos/{id}/aprobar', [RequerimientoController::class, 'aprobar']);
Route::put('requerimientos/{id}/rechazar', [RequerimientoController::class, 'rechazar']);
Route::put('requerimientos/{id}/cerrar-faltante', [RequerimientoController::class, 'cerrarFaltante']);
Route::get('kardex/producto/{productoId}', [KardexController::class, 'getByProducto']);
Route::get('kardex/valorizado', [KardexController::class, 'getValorizadoResumen']);
