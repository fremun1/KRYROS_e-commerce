import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const forgotPasswordSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    step: z.enum(['email', 'reset']),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.step === 'reset') {
        return data.newPassword === data.confirmPassword;
      }
      return true;
    },
    {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    }
  );

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [email, setEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { step: 'email' },
  });

  const emailValue = watch('email');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValue) return;

    try {
      setIsLoading(true);
      console.log('Sending reset email to:', emailValue);
      // TODO: Implement send reset email API call
      // const response = await sendPasswordResetEmail({ email: emailValue });
      setEmail(emailValue);
      setStep('reset');
    } catch (error) {
      console.error('Error sending reset email:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);
      console.log('Reset password data:', {
        email: data.email,
        verificationCode,
        newPassword: data.newPassword,
      });
      // TODO: Implement reset password API call
      // const response = await resetPassword({
      //   email: data.email,
      //   code: verificationCode,
      //   newPassword: data.newPassword,
      // });
      alert('Password reset successfully!');
      setStep('email');
    } catch (error) {
      console.error('Password reset error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {step === 'email' ? (
        <form onSubmit={handleEmailSubmit} className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              Enter your email address and we'll send you a link to reset your password.
            </p>
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

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || !emailValue}
            className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </Button>

          {/* Footer */}
          <div className="text-center text-sm text-gray-600">
            <p>
              Remember your password?{' '}
              <a href="#login" className="text-teal-600 font-semibold hover:underline">
                Login here
              </a>
            </p>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800">
              Check your email for the verification code and enter it below.
            </p>
          </div>

          {/* Verification Code */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Verification Code
            </label>
            <Input
              type="text"
              placeholder="Enter 6-digit code from email"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="h-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent text-center text-lg tracking-widest"
              maxLength={6}
            />
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-teal-600" />
              <Input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Create new password"
                {...register('newPassword')}
                className="pl-12 pr-12 h-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showNewPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-teal-600" />
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
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

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || verificationCode.length !== 6}
            className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors"
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Button>

          {/* Back Button */}
          <Button
            type="button"
            onClick={() => setStep('email')}
            variant="outline"
            className="w-full h-12 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
          >
            Back
          </Button>
        </form>
      )}
    </div>
  );
}
