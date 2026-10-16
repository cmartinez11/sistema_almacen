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
        'imagen',
        'stock_actual',
        'stock_minimo',
        'costo_unitario',
        'maneja_conversion',
        'unidad_secundaria_id',
        'factor_conversion',
    ];

    protected $appends = [
        'stock_equivalente',
        'ultimo_precio_compra',
        'imagen_url',
    ];

    public function getImagenUrlAttribute(): ?string
    {
        if (empty($this->imagen)) {
            return null;
        }
        if (str_starts_with($this->imagen, 'http://') || str_starts_with($this->imagen, 'https://') || str_starts_with($this->imagen, 'data:image')) {
            return $this->imagen;
        }
        return url('storage/' . ltrim($this->imagen, '/'));
    }

    protected function casts(): array
    {
        return [
            'stock_actual' => 'decimal:4',
            'stock_minimo' => 'decimal:4',
            'costo_unitario' => 'decimal:4',
            'maneja_conversion' => 'boolean',
            'factor_conversion' => 'decimal:4',
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

    public function unidadSecundaria(): BelongsTo
    {
        return $this->belongsTo(UnidadMedida::class, 'unidad_secundaria_id');
    }

    /**
     * Calcula la representación legible del stock con doble unidad cuando maneja_conversion está activo.
     * Ejemplo: "2 Caja(s) y 5 Paquete(s)"
     */
    public function getStockEquivalenteAttribute(): string
    {
        $stock = (float) $this->stock_actual;
        $simboloBase = $this->unidadMedida?->simbolo ?? $this->unidadMedida?->nombre ?? 'und';

        if (!$this->maneja_conversion || !$this->unidad_secundaria_id || (float) $this->factor_conversion <= 1) {
            return number_format($stock, 2) . ' ' . $simboloBase;
        }

        $factor = (float) $this->factor_conversion;
        $unidadesSecundarias = floor($stock / $factor);
        $restoBase = fmod($stock, $factor);

        $nombreSecundaria = $this->unidadSecundaria?->nombre ?? $this->unidadSecundaria?->simbolo ?? 'Caja';
        $nombreBase = $this->unidadMedida?->nombre ?? $simboloBase;

        $partes = [];
        if ($unidadesSecundarias > 0) {
            $partes[] = (int) $unidadesSecundarias . ' ' . $nombreSecundaria . ($unidadesSecundarias > 1 ? '(s)' : '');
        }

        if ($restoBase > 0 || empty($partes)) {
            $partes[] = (int) $restoBase . ' ' . $nombreBase . ($restoBase > 1 ? '(s)' : '');
        }

        return implode(' y ', $partes);
    }

    /**
     * Obtiene el último precio de compra registrado en notas de ingreso para este producto.
     */
    public function getUltimoPrecioCompraAttribute(): ?float
    {
        if (array_key_exists('ultimo_precio_compra', $this->attributes)) {
            return $this->attributes['ultimo_precio_compra'] !== null
                ? (float) $this->attributes['ultimo_precio_compra']
                : null;
        }

        $ultimo = EntradaDetalle::where('producto_id', $this->id)
            ->join('entradas_cabecera', 'entradas_cabecera.id', '=', 'entradas_detalle.entrada_cabecera_id')
            ->orderByDesc('entradas_cabecera.fecha_emision')
            ->orderByDesc('entradas_detalle.id')
            ->value('entradas_detalle.costo_unitario');

        return (float) ($ultimo ?? $this->costo_unitario ?? 0.00);
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
