<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventarioFisicoDetalle extends Model
{
    use HasFactory;

    protected $table = 'inventario_fisico_detalles';

    protected $fillable = [
        'inventario_fisico_id',
        'producto_id',
        'stock_sistema',
        'stock_fisico',
        'diferencia',
        'costo_unitario',
    ];

    protected function casts(): array
    {
        return [
            'stock_sistema' => 'decimal:4',
            'stock_fisico' => 'decimal:4',
            'diferencia' => 'decimal:4',
            'costo_unitario' => 'decimal:4',
        ];
    }

    public function inventarioFisico(): BelongsTo
    {
        return $this->belongsTo(InventarioFisico::class, 'inventario_fisico_id');
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }
}
