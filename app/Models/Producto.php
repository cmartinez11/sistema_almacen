<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Producto extends Model
{
    use HasFactory;

    protected $table = 'productos';

    protected $fillable = [
        'categoria_id',
        'unidades_medida_id',
        'sku',
        'nombre',
        'stock_actual',
        'stock_minimo',
        'costo_unitario',
    ];

    protected function casts(): array
    {
        return [
            'stock_actual' => 'decimal:4',
            'stock_minimo' => 'decimal:4',
            'costo_unitario' => 'decimal:4',
        ];
    }

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(Categoria::class, 'categoria_id');
    }

    public function unidadMedida(): BelongsTo
    {
        return $this->belongsTo(UnidadMedida::class, 'unidades_medida_id');
    }

    public function entradasDetalle(): HasMany
    {
        return $this->hasMany(EntradaDetalle::class, 'producto_id');
    }

    public function salidasDetalle(): HasMany
    {
        return $this->hasMany(SalidaDetalle::class, 'producto_id');
    }

    public function kardex(): HasMany
    {
        return $this->hasMany(Kardex::class, 'producto_id');
    }

    public function almacenes(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Almacen::class, 'almacen_producto')
            ->withPivot('stock', 'costo_unitario')
            ->withTimestamps();
    }
}
