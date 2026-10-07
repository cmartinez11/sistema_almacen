<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Tabla de Almacenes
        Schema::create('almacenes', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->string('codigo')->unique();
            $table->string('ubicacion')->nullable();
            $table->enum('estado', ['activo', 'inactivo'])->default('activo');
            $table->timestamps();
        });

        // Insertar los 2 Almacenes iniciales obligatorios
        DB::table('almacenes')->insert([
            [
                'id' => 1,
                'nombre' => 'Almacén Principal',
                'codigo' => 'ALM-MAIN',
                'ubicacion' => 'Sede Central - Almacén General',
                'estado' => 'activo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 2,
                'nombre' => 'Planta 3',
                'codigo' => 'ALM-P3',
                'ubicacion' => 'Planta Industrial N° 3',
                'estado' => 'activo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        // Ajustar secuencia de ID en PostgreSQL para almacenes
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("SELECT setval('almacenes_id_seq', 2, true);");
        }

        // 2. Tabla Pivot Inventario por Almacén (almacen_producto)
        Schema::create('almacen_producto', function (Blueprint $table) {
            $table->id();
            $table->foreignId('almacen_id')->constrained('almacenes')->cascadeOnDelete();
            $table->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            $table->decimal('stock', 12, 4)->default(0);
            $table->decimal('costo_unitario', 12, 4)->default(0);
            $table->unique(['almacen_id', 'producto_id']);
            $table->timestamps();
        });

        // 3. Vincular almacen_id a los movimientos y Kardex
        Schema::table('entradas_cabecera', function (Blueprint $table) {
            $table->foreignId('almacen_id')->nullable()->default(1)->after('id')->constrained('almacenes');
        });

        Schema::table('salidas_cabecera', function (Blueprint $table) {
            $table->foreignId('almacen_id')->nullable()->default(1)->after('id')->constrained('almacenes');
        });

        Schema::table('kardex', function (Blueprint $table) {
            $table->foreignId('almacen_id')->nullable()->default(1)->after('id')->constrained('almacenes');
        });

        // 4. Inicializar inventario inicial por almacén para todos los productos existentes
        $productos = DB::table('productos')->get();
        foreach ($productos as $prod) {
            DB::table('almacen_producto')->insert([
                [
                    'almacen_id' => 1,
                    'producto_id' => $prod->id,
                    'stock' => $prod->stock_actual ?? 0,
                    'costo_unitario' => $prod->costo_unitario ?? 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'almacen_id' => 2,
                    'producto_id' => $prod->id,
                    'stock' => 0,
                    'costo_unitario' => $prod->costo_unitario ?? 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kardex', function (Blueprint $table) {
            $table->dropForeign(['almacen_id']);
            $table->dropColumn('almacen_id');
        });

        Schema::table('salidas_cabecera', function (Blueprint $table) {
            $table->dropForeign(['almacen_id']);
            $table->dropColumn('almacen_id');
        });

        Schema::table('entradas_cabecera', function (Blueprint $table) {
            $table->dropForeign(['almacen_id']);
            $table->dropColumn('almacen_id');
        });

        Schema::dropIfExists('almacen_producto');
        Schema::dropIfExists('almacenes');
    }
};
