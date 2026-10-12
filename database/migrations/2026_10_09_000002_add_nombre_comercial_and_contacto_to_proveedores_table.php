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
        Schema::table('proveedores', function (Blueprint $table) {
            if (!Schema::hasColumn('proveedores', 'nombre_comercial')) {
                $table->string('nombre_comercial')->nullable()->after('razon_social');
            }
            if (!Schema::hasColumn('proveedores', 'contacto_nombre')) {
                $table->string('contacto_nombre')->nullable()->after('nombre_comercial');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('proveedores', function (Blueprint $table) {
            if (Schema::hasColumn('proveedores', 'contacto_nombre')) {
                $table->dropColumn('contacto_nombre');
            }
            if (Schema::hasColumn('proveedores', 'nombre_comercial')) {
                $table->dropColumn('nombre_comercial');
            }
        });
    }
};
