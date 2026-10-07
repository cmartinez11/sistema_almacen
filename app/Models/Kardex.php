<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Kardex extends Model
{
    use HasFactory;

    protected $table = 'kardex';

    public $timestamps = true;

    protected $fillable = [
        'producto_id',
        'fecha_hora',
        'tipo_operacion',
        'documento_referencia_id',
        'stock_anterior',
        'cantidad_movimiento',
        'stock_actual',
        'costo_unitario',
        'costo_total_movimiento',
        'saldo_valorizado_total',
    ];

    protected function casts(): array
    {
        return [
            'fecha_hora' => 'datetime',
            'stock_anterior' => 'decimal:4',
            'cantidad_movimiento' => 'decimal:4',
            'stock_actual' => 'decimal:4',
            'costo_unitario' => 'decimal:4',
            'costo_total_movimiento' => 'decimal:4',
            'saldo_valorizado_total' => 'decimal:4',
        ];
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }
}
