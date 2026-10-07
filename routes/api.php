<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoriaController;
use App\Http\Controllers\Api\EntradaController;
use App\Http\Controllers\Api\PersonalController;
use App\Http\Controllers\Api\ProductoController;
use App\Http\Controllers\Api\ProveedorController;
use App\Http\Controllers\Api\RequerimientoController;
use App\Http\Controllers\Api\SalidaController;
use App\Http\Controllers\Api\UnidadMedidaController;
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
    Route::apiResource('proveedores', ProveedorController::class);
    Route::apiResource('productos', ProductoController::class);
    Route::apiResource('categorias', CategoriaController::class);
    Route::apiResource('unidades-medida', UnidadMedidaController::class);
    Route::apiResource('personal', PersonalController::class);

    Route::apiResource('entradas', EntradaController::class)->only(['index', 'store', 'show']);
    Route::get('entradas/{id}/pdf', [EntradaController::class, 'exportPdf']);
    Route::apiResource('salidas', SalidaController::class)->only(['index', 'store', 'show']);

    Route::apiResource('requerimientos', RequerimientoController::class);
    Route::get('requerimientos/{id}/pdf', [RequerimientoController::class, 'exportPdf']);
    Route::put('requerimientos/{id}/cotizar', [RequerimientoController::class, 'cotizar']);
    Route::put('requerimientos/{id}/aprobar', [RequerimientoController::class, 'aprobar']);
    Route::put('requerimientos/{id}/rechazar', [RequerimientoController::class, 'rechazar']);
    Route::put('requerimientos/{id}/cerrar-faltante', [RequerimientoController::class, 'cerrarFaltante']);
});

// Rutas Directas de Respaldo para desarrollo y pruebas de clientes API
Route::apiResource('proveedores', ProveedorController::class);
Route::apiResource('productos', ProductoController::class);
Route::apiResource('categorias', CategoriaController::class);
Route::apiResource('unidades-medida', UnidadMedidaController::class);
Route::apiResource('personal', PersonalController::class);
Route::apiResource('entradas', EntradaController::class)->only(['index', 'store', 'show']);
Route::get('entradas/{id}/pdf', [EntradaController::class, 'exportPdf']);
Route::apiResource('salidas', SalidaController::class)->only(['index', 'store', 'show']);
Route::apiResource('requerimientos', RequerimientoController::class);
Route::get('requerimientos/{id}/pdf', [RequerimientoController::class, 'exportPdf']);
Route::put('requerimientos/{id}/cotizar', [RequerimientoController::class, 'cotizar']);
Route::put('requerimientos/{id}/aprobar', [RequerimientoController::class, 'aprobar']);
Route::put('requerimientos/{id}/rechazar', [RequerimientoController::class, 'rechazar']);
Route::put('requerimientos/{id}/cerrar-faltante', [RequerimientoController::class, 'cerrarFaltante']);
