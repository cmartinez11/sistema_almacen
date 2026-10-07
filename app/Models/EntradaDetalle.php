<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntradaDetalle extends Model
{
    use HasFactory;

    protected $table = 'entradas_detalle';

    protected $fillable = [
        'entrada_cabecera_id',
        'producto_id',
        'cantidad',
        'costo_unitario',
        'costo_total',
    ];

    protected function casts(): array
    {
        return [
            'cantidad' => 'decimal:4',
            'costo_unitario' => 'decimal:4',
            'costo_total' => 'decimal:4',
        ];
    }

    public function entradaCabecera(): BelongsTo
    {
        return $this->belongsTo(EntradaCabecera::class, 'entrada_cabecera_id');
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }
}
