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
        Schema::create('inventarios_fisicos', function (Blueprint $table) {
            $table->id();
            $table->string('correlativo')->unique();
            $table->foreignId('almacen_id')->constrained('almacenes')->restrictOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('fecha');
            $table->enum('estado', ['borrador', 'aplicado'])->default('borrador');
            $table->text('observaciones')->nullable();
            $table->timestamps();
        });

        Schema::create('inventario_fisico_detalles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventario_fisico_id')->constrained('inventarios_fisicos')->cascadeOnDelete();
            $table->foreignId('producto_id')->constrained('productos')->restrictOnDelete();
            $table->decimal('stock_sistema', 12, 4)->default(0);
            $table->decimal('stock_fisico', 12, 4)->default(0);
            $table->decimal('diferencia', 12, 4)->default(0);
            $table->decimal('costo_unitario', 12, 4)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventario_fisico_detalles');
        Schema::dropIfExists('inventarios_fisicos');
    }
};
