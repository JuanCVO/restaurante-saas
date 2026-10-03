"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff } from "lucide-react"

import api from "@/lib/axios"
import { setSession } from "@/lib/auth"
import { apiMessage } from "@/lib/errors"
import { Button } from "@/components/ui/button"
import { Field, Input } from "@/components/ui/input"

const loginSchema = z.object({
  email: z.string().email("Escribe un correo válido"),
  password: z.string().min(1, "Escribe tu contraseña"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState("")

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    setServerError("")
    try {
      const response = await api.post("/auth/login", data)
      const { token, user } = response.data

      setSession(token, {
        id:             user.id,
        name:           user.name,
        email:          user.email,
        role:           user.role,
        restaurantId:   user.restaurantId,
        restaurantName: user.restaurantName,
      })

      router.push(user.role === "EMPLOYEE" ? "/tables" : "/dashboard")
    } catch (error) {
      setServerError(apiMessage(error, "No se pudo iniciar sesión. Intenta de nuevo."))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="rounded-xl bg-plate px-5 py-3">
            <Image
              src="/LogoRestaurantOS.png"
              alt="RestaurantOS"
              width={581}
              height={152}
              className="h-14 w-auto"
              priority
            />
          </div>
          <p className="text-soft">Gestiona tu restaurante fácilmente</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-5 rounded-xl bg-surface p-6 sm:p-8"
        >
          <div>
            <h1 className="font-display text-2xl font-bold">Iniciar sesión</h1>
            <p className="mt-1 text-soft">Entra con tu correo y contraseña.</p>
          </div>

          <Field label="Correo" error={errors.email?.message}>
            <Input
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              placeholder="ejemplo@restaurante.com"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </Field>

          <Field label="Contraseña" error={errors.password?.message}>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className="pr-12"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-md text-soft hover:text-ink"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>

          {serverError && (
            <p role="alert" className="rounded-md bg-bad/10 px-3 py-2.5 text-[15px] text-bad">
              {serverError}
            </p>
          )}

          <Button type="submit" size="lg" loading={isLoading} className="w-full">
            {isLoading ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
      </div>
    </div>
  )
}
