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
        Schema::create('prestamos_herramientas', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->foreignId('almacen_id')->constrained('almacenes')->onDelete('cascade');
            $table->foreignId('trabajador_id')->constrained('personal')->onDelete('cascade');
            $table->foreignId('producto_id')->constrained('productos')->onDelete('cascade');
            $table->decimal('cantidad', 12, 2)->default(1);
            $table->dateTime('fecha_prestamo');
            $table->date('fecha_devolucion_estimada');
            $table->dateTime('fecha_devolucion_real')->nullable();
            $table->string('estado')->default('PENDIENTE_DEVOLUCION'); // PENDIENTE_DEVOLUCION, DEVUELTO, VENCIDO
            $table->text('observacion_prestamo')->nullable();
            $table->text('observacion_devolucion')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index(['almacen_id', 'estado']);
            $table->index(['trabajador_id']);
            $table->index(['producto_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prestamos_herramientas');
    }
};
