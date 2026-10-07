<?php

namespace Database\Seeders;

use App\Models\Categoria;
use Illuminate\Database\Seeder;

class CategoriaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categorias = [
            [
                'nombre' => 'Materia Prima',
                'descripcion' => 'Insumos y materias primas para procesos de producción',
            ],
            [
                'nombre' => 'Productos Terminados',
                'descripcion' => 'Productos elaborados listos para distribución y venta',
            ],
            [
                'nombre' => 'Insumos',
                'descripcion' => 'Materiales auxiliares, envases y suministros generales',
            ],
        ];

        foreach ($categorias as $categoria) {
            Categoria::firstOrCreate(
                ['nombre' => $categoria['nombre']],
                $categoria
            );
        }
    }
}
