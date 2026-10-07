<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Almacen;
use Illuminate\Http\JsonResponse;

class AlmacenController extends Controller
{
    /**
     * Listar almacenes activos.
     */
    public function index(): JsonResponse
    {
        $almacenes = Almacen::where('estado', 'activo')->orderBy('id', 'asc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $almacenes,
        ], 200);
    }
}
