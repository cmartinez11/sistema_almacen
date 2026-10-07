<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequerimientoDetalle extends Model
{
    use HasFactory;

    protected $table = 'requerimiento_detalles';

    protected $fillable = [
        'requerimiento_id',
        'producto_id',
        'cantidad_solicitada',
        'costo_unitario',
    ];

    public function requerimiento(): BelongsTo
    {
        return $this->belongsTo(Requerimiento::class, 'requerimiento_id');
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }
}
