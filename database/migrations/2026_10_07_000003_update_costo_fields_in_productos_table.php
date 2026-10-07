<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            // Eliminar precio_venta
            if (Schema::hasColumn('productos', 'precio_venta')) {
                $table->dropColumn('precio_venta');
            }

            // Agregar o renombrar costo_unitario
            if (!Schema::hasColumn('productos', 'costo_unitario')) {
                $table->decimal('costo_unitario', 12, 4)->default(0)->after('stock_minimo');
            }

            if (Schema::hasColumn('productos', 'precio_costo')) {
                $table->dropColumn('precio_costo');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            if (!Schema::hasColumn('productos', 'precio_venta')) {
                $table->decimal('precio_venta', 12, 4)->default(0);
            }
            if (!Schema::hasColumn('productos', 'precio_costo')) {
                $table->decimal('precio_costo', 12, 4)->default(0);
            }
            if (Schema::hasColumn('productos', 'costo_unitario')) {
                $table->dropColumn('costo_unitario');
            }
        });
    }
};
