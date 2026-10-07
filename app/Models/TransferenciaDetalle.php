<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TransferenciaDetalle extends Model
{
    use HasFactory;

    protected $table = 'transferencia_detalles';

    protected $fillable = [
        'transferencia_id',
        'producto_id',
        'cantidad',
    ];

    public function transferencia()
    {
        return $this->belongsTo(Transferencia::class, 'transferencia_id');
    }

    public function producto()
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }
}
