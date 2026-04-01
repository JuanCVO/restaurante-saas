"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Package, Plus, AlertTriangle, Pencil, Trash2, X } from "lucide-react"
import api from "@/lib/axios"

type Product = {
  id: string
  name: string
  price: number
  unit: string
  stock: number
  minStock: number
  category: { id: string; name: string }
}

type Category = {
  id: string
  name: string
}

// Modal Component (flotante)
const EditProductModal = ({
  isOpen,
  onClose,
  editingProduct,
  form,
  setForm,
  categories,
  onSubmit,
  restaurantId
}: {
  isOpen: boolean
  onClose: () => void
  editingProduct: Product | null
  form: any
  setForm: (form: any) => void
  categories: Category[]
  onSubmit: (e: React.FormEvent) => void
  restaurantId: string
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header del modal */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <CardTitle className="text-2xl font-bold text-white">
            {editingProduct ? "Editar producto" : "Nuevo producto"}
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl h-10 w-10 p-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Formulario */}
        <form onSubmit={onSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-slate-300">Nombre</Label>
              <Input
                className="bg-slate-700 border-slate-600 text-white"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Categoría</Label>
              <select
                className="w-full h-12 rounded-xl bg-slate-700 border border-slate-600 text-white px-4"
                value={form.categoryId}
                onChange={e => setForm({ ...form, categoryId: e.target.value })}
                required
              >
                <option value="">Selecciona categoría</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Precio</Label>
              <Input
                type="number"
                className="bg-slate-700 border-slate-600 text-white"
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Unidad</Label>
              <select
                className="w-full h-12 rounded-xl bg-slate-700 border border-slate-600 text-white px-4"
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })}
              >
                <option value="unidades">Unidades</option>
                <option value="kg">Kilogramos</option>
                <option value="litros">Litros</option>
                <option value="porciones">Porciones</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Stock actual</Label>
              <Input
                type="number"
                className="bg-slate-700 border-slate-600 text-white"
                value={form.stock}
                onChange={e => setForm({ ...form, stock: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Stock mínimo</Label>
              <Input
                type="number"
                className="bg-slate-700 border-slate-600 text-white"
                value={form.minStock}
                onChange={e => setForm({ ...form, minStock: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-4 border-t border-slate-700">
            <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white flex-1 h-12 rounded-xl">
              {editingProduct ? "Guardar cambios" : "Crear producto"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700 h-12 rounded-xl"
              onClick={onClose}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function InventarioPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState({
    name: "", price: "", unit: "unidades", stock: "", minStock: "5", categoryId: ""
  })

  const [restaurantId, setRestaurantId] = useState("")

  
  const fetchProducts = async () => {
    const res = await api.get(`/products/${restaurantId}`)
    setProducts(res.data)
  }

  const fetchCategories = async () => {
    const res = await api.get(`/categories/${restaurantId}`)
    setCategories(res.data)
  }

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    if (user.restaurantId) setRestaurantId(user.restaurantId)
  }, [])

  useEffect(() => {
    if (!restaurantId) return
    fetchCategories()
    fetchProducts()
  }, [restaurantId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      ...form,
      price: parseFloat(form.price),
      stock: parseInt(form.stock),
      minStock: parseInt(form.minStock),
      restaurantId,
    }
    if (editingProduct) {
      await api.put(`/products/${editingProduct.id}`, data)
    } else {
      await api.post("/products", data)
    }
    setShowForm(false)
    setEditingProduct(null)
    setForm({ name: "", price: "", unit: "unidades", stock: "", minStock: "5", categoryId: "" })
    fetchProducts()
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setForm({
      name: product.name,
      price: String(product.price),
      unit: product.unit,
      stock: String(product.stock),
      minStock: String(product.minStock),
      categoryId: product.category.id,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este producto?")) return
    await api.delete(`/products/${id}`)
    fetchProducts()
  }

  const handleCloseModal = () => {
    setShowForm(false)
    setEditingProduct(null)
    setForm({ name: "", price: "", unit: "unidades", stock: "", minStock: "5", categoryId: "" })
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Inventario</h1>
          <p className="text-slate-400 mt-1">Gestiona tus productos y stock</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" /> Nuevo producto
        </Button>
      </div>

      {/* Modal flotante */}
      <EditProductModal
        isOpen={showForm}
        onClose={handleCloseModal}
        editingProduct={editingProduct}
        form={form}
        setForm={setForm}
        categories={categories}
        onSubmit={handleSubmit}
        restaurantId={restaurantId}
      />

      {/* Tabla */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-slate-400 font-medium p-4">Producto</th>
                <th className="text-left text-slate-400 font-medium p-4">Categoría</th>
                <th className="text-left text-slate-400 font-medium p-4">Precio</th>
                <th className="text-left text-slate-400 font-medium p-4">Stock</th>
                <th className="text-left text-slate-400 font-medium p-4">Unidad</th>
                <th className="text-left text-slate-400 font-medium p-4">Estado</th>
                <th className="text-left text-slate-400 font-medium p-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="p-4 text-white font-medium">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-orange-500" />
                      {product.name}
                    </div>
                  </td>
                  <td className="p-4 text-slate-300">{product.category.name}</td>
                  <td className="p-4 text-slate-300">${product.price.toLocaleString()}</td>
                  <td className="p-4 text-slate-300">{product.stock}</td>
                  <td className="p-4 text-slate-300">{product.unit}</td>
                  <td className="p-4">
                    {product.stock <= product.minStock ? (
                      <span className="flex items-center gap-1 text-red-400 text-sm">
                        <AlertTriangle className="h-4 w-4" /> Stock bajo
                      </span>
                    ) : (
                      <span className="text-green-400 text-sm">✓ OK</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(product)} className="text-slate-400 hover:text-white">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="text-slate-400 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No hay productos aún — crea el primero 
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}