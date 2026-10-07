<?php

namespace Database\Seeders;

use App\Models\Rol;
use Illuminate\Database\Seeder;

class RolSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            [
                'nombre' => 'Administrador',
                'descripcion' => 'Gestión total del sistema, usuarios y reportes financieros',
            ],
            [
                'nombre' => 'Almacenero',
                'descripcion' => 'Registro de entradas, salidas y consulta de inventario',
            ],
            [
                'nombre' => 'Auditor',
                'descripcion' => 'Acceso de lectura a logs y kardex valorizado',
            ],
        ];

        foreach ($roles as $rol) {
            Rol::firstOrCreate(
                ['nombre' => $rol['nombre']],
                $rol
            );
        }
    }
}
