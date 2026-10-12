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
        DB::statement("ALTER TABLE requerimientos DROP CONSTRAINT IF EXISTS requerimientos_estado_check");
        DB::statement("ALTER TABLE requerimientos ADD CONSTRAINT requerimientos_estado_check CHECK (estado::text = ANY (ARRAY['pendiente', 'aprobado', 'rechazado', 'parcial', 'pedido', 'cerrado', 'parcial_anulado']::text[]))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE requerimientos DROP CONSTRAINT IF EXISTS requerimientos_estado_check");
        DB::statement("ALTER TABLE requerimientos ADD CONSTRAINT requerimientos_estado_check CHECK (estado::text = ANY (ARRAY['pendiente', 'aprobado', 'rechazado', 'parcial', 'pedido', 'cerrado']::text[]))");
    }
};
