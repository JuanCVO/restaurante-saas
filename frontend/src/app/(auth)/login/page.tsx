"use client"
import { useRouter } from "next/navigation"
import api from "@/lib/axios"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, UtensilsCrossed } from "lucide-react"

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

 const router = useRouter()

    const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
        const response = await api.post("/auth/login", data)
        const { token, user } = response.data
        
        localStorage.setItem("token", token)
        localStorage.setItem("user", JSON.stringify({
          id:             user.id,
          name:           user.name,
          email:          user.email,
          role:           user.role,
          restaurantId:   user.restaurantId,
          restaurantName: user.restaurantName,
        }))
        
        router.push(user.role === "EMPLOYEE" ? "/tables" : "/dashboard")
    } catch (error: any) {
        const message = error.response?.data?.message || "Error al iniciar sesión"
        alert(message)
    } finally {
        setIsLoading(false)
    }
    }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">

        <div className="flex flex-col items-center gap-2">
          <div className="bg-orange-500 p-3 rounded-2xl">
            <UtensilsCrossed className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-playfair)" }}>
           RestaurantOS
          </h1>
          <p className="text-slate-400 text-sm">Gestiona tu restaurante fácilmente</p>
        </div>

        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Iniciar sesión</CardTitle>
            <CardDescription className="text-slate-400">
              Ingresa tus credenciales para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              <div className="space-y-2">
                <Label className="text-slate-300">Email</Label>
                <Input
                  placeholder="juan@restaurante.com"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  {...register("email")}
                />
                {errors.email && <p className="text-red-400 text-sm">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Contraseña</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-sm">{errors.password.message}</p>}
              </div>

              <Button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                disabled={isLoading}
              >
                {isLoading ? "Ingresando..." : "Ingresar"}
              </Button>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}