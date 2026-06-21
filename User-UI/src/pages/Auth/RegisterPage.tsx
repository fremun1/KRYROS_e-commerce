import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, Mail, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm password is required'),
    agreeTerms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      if (!captchaVerified) {
        alert('Please verify that you are human');
        return;
      }
      setIsLoading(true);
      console.log('Register data:', data);
      // TODO: Implement registration API call
      // const response = await registerUser(data);
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Full Name Field */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Full Name
        </label>
        <div className="relative">
          <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-teal-600" />
          <Input
            type="text"
            placeholder="Enter your full name"
            {...register('fullName')}
            className="pl-12 h-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
          />
        </div>
        {errors.fullName && (
          <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
        )}
      </div>

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
            placeholder="Create a password"
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

      {/* Confirm Password Field */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Confirm Password
        </label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-teal-600" />
          <Input
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm your password"
            {...register('confirmPassword')}
            className="pl-12 pr-12 h-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showConfirmPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* Cloudflare Captcha */}
      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="captcha"
              checked={captchaVerified}
              onChange={(e) => setCaptchaVerified(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-600 cursor-pointer"
            />
            <label htmlFor="captcha" className="text-sm text-gray-700 font-medium cursor-pointer">
              Verify you are human
            </label>
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold text-gray-900">CLOUDFLARE</p>
            <div className="flex gap-1 text-gray-600 text-xs">
              <a href="#privacy" className="hover:underline">
                Privacy
              </a>
              <span>•</span>
              <a href="#terms" className="hover:underline">
                Terms
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="flex items-start">
        <input
          type="checkbox"
          id="terms"
          {...register('agreeTerms')}
          className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-600 mt-1"
        />
        <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
          I agree to the{' '}
          <a href="#terms" className="text-teal-600 font-semibold hover:underline">
            Terms and Conditions
          </a>
        </label>
      </div>
      {errors.agreeTerms && (
        <p className="text-sm text-red-600">{errors.agreeTerms.message}</p>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors"
      >
        {isLoading ? 'Creating account...' : 'Create account'}
      </Button>

      {/* Footer */}
      <div className="text-center text-sm text-gray-600">
        <p>
          Already have an account?{' '}
          <a href="#login" className="text-teal-600 font-semibold hover:underline">
            Login here
          </a>
        </p>
      </div>
    </form>
  );
}
