<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Almacen extends Model
{
    use HasFactory;

    protected $table = 'almacenes';

    protected $fillable = [
        'nombre',
        'codigo',
        'ubicacion',
        'estado',
    ];

    public function productos(): BelongsToMany
    {
        return $this->belongsToMany(Producto::class, 'almacen_producto')
            ->withPivot('stock', 'costo_unitario')
            ->withTimestamps();
    }

    public function entradas(): HasMany
    {
        return $this->hasMany(EntradaCabecera::class, 'almacen_id');
    }

    public function salidas(): HasMany
    {
        return $this->hasMany(SalidaCabecera::class, 'almacen_id');
    }

    public function kardex(): HasMany
    {
        return $this->hasMany(Kardex::class, 'almacen_id');
    }
}
