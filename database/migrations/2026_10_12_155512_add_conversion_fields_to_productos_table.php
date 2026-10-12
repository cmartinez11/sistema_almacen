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
            $table->boolean('maneja_conversion')->default(false);
            $table->foreignId('unidad_secundaria_id')
                ->nullable()
                ->constrained('unidades_medida')
                ->nullOnDelete();
            $table->decimal('factor_conversion', 12, 4)->nullable()->default(1);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->dropForeign(['unidad_secundaria_id']);
            $table->dropColumn(['maneja_conversion', 'unidad_secundaria_id', 'factor_conversion']);
        });
    }
};
