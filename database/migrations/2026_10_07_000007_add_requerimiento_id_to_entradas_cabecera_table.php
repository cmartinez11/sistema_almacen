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
        Schema::table('entradas_cabecera', function (Blueprint $table) {
            $table->foreignId('requerimiento_id')->nullable()->constrained('requerimientos')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('entradas_cabecera', function (Blueprint $table) {
            $table->dropForeign(['requerimiento_id']);
            $table->dropColumn('requerimiento_id');
        });
    }
};
