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
        Schema::table('salidas_cabecera', function (Blueprint $table) {
            $table->string('area_trabajador', 150)->nullable()->after('personal_id');
            $table->string('area_destino', 150)->nullable()->after('area_trabajador');
            $table->text('justificacion')->nullable()->after('area_destino');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('salidas_cabecera', function (Blueprint $table) {
            $table->dropColumn(['area_trabajador', 'area_destino', 'justificacion']);
        });
    }
};
