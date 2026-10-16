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
        // 1. Agregar columna imagen en productos
        Schema::table('productos', function (Blueprint $table) {
            if (!Schema::hasColumn('productos', 'imagen')) {
                $table->string('imagen', 500)->nullable()->after('nombre');
            }
        });

        // 2. Permitir el estado 'pre_requerimiento' en la tabla requerimientos
        DB::statement("ALTER TABLE requerimientos DROP CONSTRAINT IF EXISTS requerimientos_estado_check");
        DB::statement("ALTER TABLE requerimientos ADD CONSTRAINT requerimientos_estado_check CHECK (estado::text = ANY (ARRAY['pre_requerimiento', 'pendiente', 'aprobado', 'rechazado', 'parcial', 'pedido', 'cerrado', 'parcial_anulado']::text[]))");

        // 3. Agregar campos role, area y personal_id en users
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'role')) {
                $table->string('role', 50)->default('administrador')->after('email');
            }
            if (!Schema::hasColumn('users', 'area')) {
                $table->string('area', 100)->nullable()->after('role');
            }
            if (!Schema::hasColumn('users', 'personal_id')) {
                $table->foreignId('personal_id')->nullable()->constrained('personal')->nullOnDelete()->after('area');
            }
        });

        // 4. Asegurar la existencia del rol 'Responsable de Área' en la tabla roles
        DB::table('roles')->updateOrInsert(
            ['nombre' => 'Responsable de Área'],
            [
                'descripcion' => 'Responsable de área para solicitudes y catálogo e-commerce de materiales',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            if (Schema::hasColumn('productos', 'imagen')) {
                $table->dropColumn('imagen');
            }
        });

        DB::statement("ALTER TABLE requerimientos DROP CONSTRAINT IF EXISTS requerimientos_estado_check");
        DB::statement("ALTER TABLE requerimientos ADD CONSTRAINT requerimientos_estado_check CHECK (estado::text = ANY (ARRAY['pendiente', 'aprobado', 'rechazado', 'parcial', 'pedido', 'cerrado', 'parcial_anulado']::text[]))");

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'personal_id')) {
                $table->dropForeign(['personal_id']);
                $table->dropColumn('personal_id');
            }
            if (Schema::hasColumn('users', 'area')) {
                $table->dropColumn('area');
            }
            if (Schema::hasColumn('users', 'role')) {
                $table->dropColumn('role');
            }
        });
    }
};
