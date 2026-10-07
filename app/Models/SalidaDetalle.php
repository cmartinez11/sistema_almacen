<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalidaDetalle extends Model
{
    use HasFactory;

    protected $table = 'salidas_detalle';

    protected $fillable = [
        'salida_cabecera_id',
        'producto_id',
        'cantidad',
        'precio_unitario',
        'precio_total',
    ];

    protected function casts(): array
    {
        return [
            'cantidad' => 'decimal:4',
            'precio_unitario' => 'decimal:4',
            'precio_total' => 'decimal:4',
        ];
    }

    public function salidaCabecera(): BelongsTo
    {
        return $this->belongsTo(SalidaCabecera::class, 'salida_cabecera_id');
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }
}
