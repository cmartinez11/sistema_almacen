<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

abstract class Controller
{
    /**
     * Valida si el usuario actual tiene permisos para ver datos financieros (precios, costos unitarios, valorizaciones).
     * Solo Compras, Administrador y Gerencia tienen acceso; Almacén y Supervisor están restringidos.
     */
    protected function userCanViewFinancials(Request $request): bool
    {
        $user = $request->user() ?? Auth::user();

        // 1. Verificar header de rol enviado desde el frontend o atributo de request
        $roleHeader = $request->header('X-User-Role') ?? $request->header('x-user-role');

        $roleName = strtolower(
            $roleHeader
            ?: ($user?->rol?->nombre ?? $user?->role ?? $user?->rol ?? '')
        );

        if (empty($roleName)) {
            return true;
        }

        // Si es rol de Almacén, Supervisor u Operador, NO tiene acceso a montos/costos
        if (
            str_contains($roleName, 'almacen') ||
            str_contains($roleName, 'supervis') ||
            str_contains($roleName, 'operador')
        ) {
            return false;
        }

        // Si es Compras, Administrador o Gerencia, tiene acceso completo
        if (
            str_contains($roleName, 'compra') ||
            str_contains($roleName, 'admin') ||
            str_contains($roleName, 'geren')
        ) {
            return true;
        }

        return false;
    }
}
