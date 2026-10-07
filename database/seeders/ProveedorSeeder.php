<?php

namespace Database\Seeders;

use App\Models\Proveedor;
use Illuminate\Database\Seeder;

class ProveedorSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $proveedores = [
            [
                'razon_social' => 'Distribuidora Logística Global S.A.C.',
                'ruc' => '20123456789',
                'telefono' => '014567890',
                'direccion' => 'Av. Industrial 1234, Lima',
            ],
            [
                'razon_social' => 'Comercializadora Industrial del Perú E.I.R.L.',
                'ruc' => '20987654321',
                'telefono' => '019876543',
                'direccion' => 'Calle Los Almacenes 456, Callao',
            ],
        ];

        foreach ($proveedores as $proveedor) {
            Proveedor::firstOrCreate(
                ['ruc' => $proveedor['ruc']],
                $proveedor
            );
        }
    }
}
