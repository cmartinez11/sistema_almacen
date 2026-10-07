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
        // Agregar campos faltantes a la tabla 'proveedores'
        Schema::table('proveedores', function (Blueprint $table) {
            if (!Schema::hasColumn('proveedores', 'email')) {
                $table->string('email')->nullable()->after('telefono');
            }
            if (!Schema::hasColumn('proveedores', 'estado')) {
                $table->enum('estado', ['activo', 'inactivo'])->default('activo')->after('direccion');
            }
        });

        // Agregar campos faltantes a la tabla 'personal'
        Schema::table('personal', function (Blueprint $table) {
            if (!Schema::hasColumn('personal', 'dni')) {
                $table->string('dni')->nullable()->after('id');
            }
            if (!Schema::hasColumn('personal', 'cargo')) {
                $table->string('cargo')->nullable()->after('apellidos');
            }
            if (!Schema::hasColumn('personal', 'area')) {
                $table->string('area')->nullable()->after('cargo');
            }
            if (!Schema::hasColumn('personal', 'telefono')) {
                $table->string('telefono')->nullable()->after('email');
            }
            if (Schema::hasColumn('personal', 'rol_id')) {
                $table->foreignId('rol_id')->nullable()->change();
            }
            if (Schema::hasColumn('personal', 'password')) {
                $table->string('password')->nullable()->change();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('proveedores', function (Blueprint $table) {
            if (Schema::hasColumn('proveedores', 'email')) {
                $table->dropColumn('email');
            }
            if (Schema::hasColumn('proveedores', 'estado')) {
                $table->dropColumn('estado');
            }
        });

        Schema::table('personal', function (Blueprint $table) {
            if (Schema::hasColumn('personal', 'dni')) {
                $table->dropColumn('dni');
            }
            if (Schema::hasColumn('personal', 'cargo')) {
                $table->dropColumn('cargo');
            }
            if (Schema::hasColumn('personal', 'area')) {
                $table->dropColumn('area');
            }
            if (Schema::hasColumn('personal', 'telefono')) {
                $table->dropColumn('telefono');
            }
        });
    }
};
