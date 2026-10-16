<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrestamoHerramienta extends Model
{
    use HasFactory;

    protected $table = 'prestamos_herramientas';

    protected $fillable = [
        'codigo',
        'almacen_id',
        'trabajador_id',
        'producto_id',
        'cantidad',
        'fecha_prestamo',
        'fecha_devolucion_estimada',
        'fecha_devolucion_real',
        'estado',
        'observacion_prestamo',
        'observacion_devolucion',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'fecha_prestamo' => 'datetime',
            'fecha_devolucion_estimada' => 'date',
            'fecha_devolucion_real' => 'datetime',
            'cantidad' => 'decimal:2',
        ];
    }

    protected $appends = ['esta_vencido'];

    public function getEstaVencidoAttribute(): bool
    {
        if ($this->estado === 'DEVUELTO') {
            return false;
        }

        if (!$this->fecha_devolucion_estimada) {
            return false;
        }

        return now()->startOfDay()->gt($this->fecha_devolucion_estimada->startOfDay());
    }

    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_id');
    }

    public function trabajador(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'trabajador_id');
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
