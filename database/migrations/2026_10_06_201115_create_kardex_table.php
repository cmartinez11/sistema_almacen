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
        Schema::create('kardex', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('productos')->restrictOnDelete();
            $table->dateTime('fecha_hora');
            $table->string('tipo_operacion');
            $table->unsignedBigInteger('documento_referencia_id');
            // Bloque Físico
            $table->decimal('stock_anterior', 12, 4);
            $table->decimal('cantidad_movimiento', 12, 4);
            $table->decimal('stock_actual', 12, 4);
            // Bloque Valorizado
            $table->decimal('costo_unitario', 12, 4);
            $table->decimal('costo_total_movimiento', 12, 4);
            $table->decimal('saldo_valorizado_total', 12, 4);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kardex');
    }
};

