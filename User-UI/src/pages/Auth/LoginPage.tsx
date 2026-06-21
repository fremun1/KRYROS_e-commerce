import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      console.log('Login data:', data);
      // TODO: Implement login API call
      // const response = await loginUser(data);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Email Field */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Email or Phone
        </label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-teal-600" />
          <Input
            type="text"
            placeholder="Enter your email or phone number"
            {...register('email')}
            className="pl-12 h-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
          />
        </div>
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Password Field */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-teal-600" />
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            {...register('password')}
            className="pl-12 pr-12 h-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      {/* Remember Me */}
      <div className="flex items-center justify-between">
        <label className="flex items-center">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-600"
          />
          <span className="ml-2 text-sm text-gray-600">Remember me</span>
        </label>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors"
      >
        {isLoading ? 'Logging in...' : 'Login'}
      </Button>

      {/* Footer */}
      <div className="text-center text-sm text-gray-600">
        <p>
          Don't have an account?{' '}
          <a href="#register" className="text-teal-600 font-semibold hover:underline">
            Register here
          </a>
        </p>
      </div>
    </form>
  );
}
