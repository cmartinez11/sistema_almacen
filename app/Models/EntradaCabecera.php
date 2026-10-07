<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EntradaCabecera extends Model
{
    use HasFactory;

    protected $table = 'entradas_cabecera';

    protected $fillable = [
        'requerimiento_id',
        'personal_id',
        'proveedor_id',
        'tipo_comprobante',
        'numero_comprobante',
        'fecha_emision',
        'observaciones',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'fecha_emision' => 'datetime',
        ];
    }

    public function requerimiento(): BelongsTo
    {
        return $this->belongsTo(Requerimiento::class, 'requerimiento_id');
    }

    public function personal(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'personal_id');
    }

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class, 'proveedor_id');
    }

    public function entradasDetalle(): HasMany
    {
        return $this->hasMany(EntradaDetalle::class, 'entrada_cabecera_id');
    }
}
