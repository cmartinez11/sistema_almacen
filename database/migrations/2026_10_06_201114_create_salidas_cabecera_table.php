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
        Schema::create('salidas_cabecera', function (Blueprint $table) {
            $table->id();
            $table->foreignId('personal_id')->constrained('personal')->restrictOnDelete();
            $table->string('destino_cliente');
            $table->string('tipo_salida');
            $table->string('numero_referencia')->nullable();
            $table->dateTime('fecha_emision');
            $table->text('observaciones')->nullable();
            $table->enum('estado', ['emitido', 'anulado'])->default('emitido');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('salidas_cabecera');
    }
};

