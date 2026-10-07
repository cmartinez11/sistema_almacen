<?php

namespace Database\Seeders;

use App\Models\Personal;
use App\Models\Rol;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PersonalSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $rolAdmin = Rol::where('nombre', 'Administrador')->first();

        if ($rolAdmin) {
            Personal::firstOrCreate(
                ['email' => 'admin@almacen.com'],
                [
                    'rol_id' => $rolAdmin->id,
                    'nombres' => 'Administrador',
                    'apellidos' => 'General',
                    'documento_identidad' => '12345678',
                    'email' => 'admin@almacen.com',
                    'password' => Hash::make('admin123'),
                    'estado' => 'activo',
                ]
            );
        }
    }
}
