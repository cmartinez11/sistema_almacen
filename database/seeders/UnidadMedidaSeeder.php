<?php

namespace Database\Seeders;

use App\Models\UnidadMedida;
use Illuminate\Database\Seeder;

class UnidadMedidaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $unidades = [
            ['nombre' => 'Kilogramo', 'simbolo' => 'KG'],
            ['nombre' => 'Unidad', 'simbolo' => 'UND'],
            ['nombre' => 'Litro', 'simbolo' => 'LT'],
            ['nombre' => 'Caja', 'simbolo' => 'CJ'],
        ];

        foreach ($unidades as $unidad) {
            UnidadMedida::firstOrCreate(
                ['simbolo' => $unidad['simbolo']],
                $unidad
            );
        }
    }
}
