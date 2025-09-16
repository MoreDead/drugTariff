'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useAuth } from '@/lib/auth'
import { toast } from 'sonner'
import { User, LogIn, UserPlus, Loader2 } from 'lucide-react'

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type AuthFormData = z.infer<typeof authSchema>

export function AuthDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { signIn, signUp, user, signOut } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  })

  const onSubmit = async (data: AuthFormData) => {
    setIsLoading(true)
    try {
      const { error } = isSignUp 
        ? await signUp(data.email, data.password)
        : await signIn(data.email, data.password)

      if (error) {
        toast.error(error.message)
      } else {
        if (isSignUp) {
          toast.success('Account created! Please check your email to verify your account.')
        } else {
          toast.success('Signed in successfully!')
        }
        setIsOpen(false)
        reset()
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Signed out successfully!')
    } catch {
      toast.error('Error signing out')
    }
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          Welcome, {user.email}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          className="flex items-center gap-2"
        >
          <LogIn className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Sign In
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSignUp ? (
              <>
                <UserPlus className="h-5 w-5" />
                Create Account
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                Sign In
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              {...register('email')}
              type="email"
              placeholder="Enter your email"
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <Input
              {...register('password')}
              type="password"
              placeholder="Enter your password"
            />
            {errors.password && (
              <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsSignUp(!isSignUp)
                reset()
              }}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </Button>
          </div>
        </form>

        <div className="text-xs text-gray-500 text-center">
          {isSignUp ? (
            <p>Already have an account? Click &quot;Sign In&quot; above.</p>
          ) : (
            <p>Don&apos;t have an account? Click &quot;Sign Up&quot; above.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}


