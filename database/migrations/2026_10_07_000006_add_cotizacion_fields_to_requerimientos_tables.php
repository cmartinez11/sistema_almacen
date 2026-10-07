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
        Schema::table('requerimientos', function (Blueprint $table) {
            if (!Schema::hasColumn('requerimientos', 'proveedor_id')) {
                $table->foreignId('proveedor_id')->nullable()->after('personal_id')->constrained('proveedores')->nullOnDelete();
            }
        });

        Schema::table('requerimiento_detalles', function (Blueprint $table) {
            if (!Schema::hasColumn('requerimiento_detalles', 'costo_unitario')) {
                $table->decimal('costo_unitario', 12, 4)->default(0)->after('cantidad_solicitada');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requerimientos', function (Blueprint $table) {
            if (Schema::hasColumn('requerimientos', 'proveedor_id')) {
                $table->dropForeign(['proveedor_id']);
                $table->dropColumn('proveedor_id');
            }
        });

        Schema::table('requerimiento_detalles', function (Blueprint $table) {
            if (Schema::hasColumn('requerimiento_detalles', 'costo_unitario')) {
                $table->dropColumn('costo_unitario');
            }
        });
    }
};
