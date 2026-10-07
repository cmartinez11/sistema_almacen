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
        Schema::create('productos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('categoria_id')->constrained('categorias')->restrictOnDelete();
            $table->foreignId('unidades_medida_id')->constrained('unidades_medida')->restrictOnDelete();
            $table->string('sku')->unique();
            $table->string('nombre');
            $table->decimal('stock_actual', 12, 4)->default(0);
            $table->decimal('stock_minimo', 12, 4)->default(0);
            $table->decimal('precio_costo', 12, 4)->default(0);
            $table->decimal('precio_venta', 12, 4)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('productos');
    }
};

